import * as reportsRepo from '../../db/reports/reportsRepo.js'
import * as rowRepo from '../../db/common/rowRepo.js'
import fs from 'fs/promises';
import path from 'path';
import {reportCSV} from '../../worker/generator/csv.js';
import logger from '../../utils/logger.js';

const STORAGE_DIR = path.resolve(process.cwd(),`storage`)


export async function createTask({
                                     tableName, title,
                                     filter, columns, count, avg, groupBy, orderBy, orderDir,
                                     where, aggregates, having, windowFns, coalesce, limit, withSummary,
                                 }) {
    console.log(`[SERVICE] createTask → table: "${tableName}"`);
    console.log(`[SERVICE] windowFns:`, JSON.stringify(windowFns, null, 2));
    console.log(`[SERVICE] coalesce:`, coalesce);
    console.log(`[SERVICE] aggregates:`, JSON.stringify(aggregates, null, 2));
    console.log(`[SERVICE] where:`, JSON.stringify(where, null, 2));

    return reportsRepo.create({
        table_name:  tableName,
        title,
        filter,
        columns,
        where,
        aggregates,
        count,
        avg,
        groupBy,
        having,
        orderBy,
        orderDir,
        windowFns,
        coalesce,
        limit,
        withSummary,
    });
}
export async function removeReport(reportId) {
    const report = await reportsRepo.getReport(reportId);
    if (!report) return { ok: false, reason: 'NOT_FOUND' };

    // если путь хранится относительный — приведём к абсолютному
    const filePath = report.result_path ? path.resolve(report.result_path) : null;

    if (filePath) {
        try {
            await fs.unlink(filePath);
        } catch (err) {
            // если файл не найден — всё равно помечаем как удалён
            if (err.code !== 'ENOENT') {
                return { ok: false, reason: 'FS_ERROR', error: err };
            }
        }
    }

    try {
        await reportsRepo.removeReport(reportId);
        return { ok: true };
    } catch (err) {
        // Если удаление из БД упало, логируем и возвращаем ошибку.
        return { ok: false, reason: 'DB_ERROR', error: err };
    }
}

export async function processReport(report) {
    if (!report) return { ok: false, reason: `Не найдено текущего процесса` };

    logger.debug(`Выполняется processReport report.id=${report.id}, table=${report.table_name}`);
    console.log(`[PROCESS] report.filter raw:`, JSON.stringify(report.filter, null, 2));

    // ── Распаковываем новые поля из filter ──────────────────────
    const {
        where:       __where,
        aggregates:  __aggregates,
        having:      __having,
        windowFns:   __windowFns,
        coalesce:    __coalesce,
        limit:       __limit,
        withSummary: __withSummary,
        ...legacyFilter
    } = report.config || {};

    console.log(`[PROCESS] unpacked → where:`, __where);
    console.log(`[PROCESS] unpacked → windowFns:`, JSON.stringify(__windowFns, null, 2));
    console.log(`[PROCESS] unpacked → coalesce:`, __coalesce);
    console.log(`[PROCESS] unpacked → limit:`, __limit);

    try {
        const rows = await rowRepo.findByColumns(report.table_name, {
            columns:     Array.isArray(report.columns) && report.columns.length ? report.columns : ['*'],
            filter:      Object.keys(legacyFilter).length ? legacyFilter : null,
            where:       __where       ?? null,
            aggregates:  __aggregates  ?? null,
            count:       report.count  ?? null,
            avg:         report.avg    ?? null,
            groupBy:     report.group_by ?? null,
            having:      __having      ?? null,
            orderBy:     report.order_by ?? null,
            orderDir:    report.order_dir ?? null,
            windowFns:   __windowFns   ?? null,
            coalesce:    __coalesce    ?? null,
            limit:       __limit       ?? null,
            withSummary: __withSummary ?? null,
        });

        console.log(`[PROCESS] rows count: ${rows.length}`);

        const csv = reportCSV(rows);
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        const filePath = path.join(STORAGE_DIR, `${report.id}.csv`);
        await fs.writeFile(filePath, csv, 'utf8');
        await reportsRepo.markDone(report.id, filePath, `text/csv`);
        return { ok: true, path: filePath };
    } catch (err) {
        logger.error(`processReport failed for id=${report.id}:`, err);
        await reportsRepo.markFailed(report.id, err);
        return { ok: false, error: err };
    }
}


export async function processNext() {
    const report = await reportsRepo.getPendingAndLock();
    if (!report) return false;
    await processReport(report);
    return true;
}

export async function getReport(id) {
    const report = await reportsRepo.getReport(id);
    if (!report || !report.result_path)
        return report;
    try {
        await fs.access(report.result_path);
        return report;
    } catch {
        await reportsRepo.markMissing(id);
        report.status = `Файл не найден`;
        report.result_path = null;
        return report;
    }
}

export async function listReportByTable(tableName) {
    return await reportsRepo.listReportByTable(tableName);
}