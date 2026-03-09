import * as reportsRepo from '../../db/reports/reportsRepo.js';
import * as rowRepo from '../../db/common/rowRepo.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { reportCSV } from '../../worker/generator/csv.js';

// Папка для хранения готовых CSV-файлов отчётов.
// Путь резолвится относительно этого файла — не от process.cwd(),
// чтобы сервер и воркер всегда смотрели в одно место независимо от CWD.
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../../storage');

// Создаёт задачу на генерацию отчёта и сохраняет её в БД со статусом 'В ожидании...'.
// Воркер подберёт задачу через getPendingAndLock и вызовет processReport.
export async function createTask({
                                     tableName, title, filter, columns, count, avg,
                                     groupBy, orderBy, orderDir, where, aggregates,
                                     having, windowFns, coalesce, limit, withSummary,
                                 }) {
    console.log(`[reportService] createTask table="${tableName}"`);

    return reportsRepo.create({
        table_name: tableName,
        title, filter, columns, count, avg,
        groupBy, orderBy, orderDir, where, aggregates,
        having, windowFns, coalesce, limit, withSummary,
    });
}

// Удаляет отчёт: сначала файл с диска (если есть), затем запись из БД.
// ENOENT при удалении файла не считается ошибкой — файл мог быть удалён вручную.
export async function removeReport(reportId) {
    console.log(`[reportService] removeReport id=${reportId}`);

    const report = await reportsRepo.getReport(reportId);
    if (!report) return { ok: false, reason: 'NOT_FOUND' };

    if (report.result_path) {
        try {
            await fs.unlink(path.resolve(report.result_path));
        } catch (err) {
            if (err.code !== 'ENOENT') return { ok: false, reason: 'FS_ERROR', error: err };
        }
    }

    await reportsRepo.removeReport(reportId);
    return { ok: true };
}

// Выполняет отчёт: делает SELECT по параметрам из записи, генерирует CSV, сохраняет файл.
// Новые параметры (where, aggregates, windowFns и т.д.) берутся из jsonb-колонки config.
// Legacy-параметры (count, avg, group_by и т.д.) берутся из отдельных колонок.
// При успехе — markDone, при ошибке — markFailed.
export async function processReport(report) {
    console.log(`[reportService] processReport id=${report.id} table="${report.table_name}"`);

    const {
        where, aggregates, having, windowFns, coalesce, limit, withSummary,
        ...legacyFilter
    } = report.config || {};

    try {
        const rows = await rowRepo.findByColumns(report.table_name, {
            columns:     Array.isArray(report.columns) && report.columns.length ? report.columns : ['*'],
            filter:      Object.keys(legacyFilter).length ? legacyFilter : null,
            where:       where       ?? null,
            aggregates:  aggregates  ?? null,
            count:       report.count    ?? null,
            avg:         report.avg      ?? null,
            groupBy:     report.group_by ?? null,
            having:      having      ?? null,
            orderBy:     report.order_by  ?? null,
            orderDir:    report.order_dir ?? null,
            windowFns:   windowFns   ?? null,
            coalesce:    coalesce    ?? null,
            limit:       limit       ?? null,
            withSummary: withSummary ?? null,
        });

        console.log(`[reportService] processReport rows=${rows.length}`);

        const csv      = reportCSV(rows);
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        const filePath = path.join(STORAGE_DIR, `${report.id}.csv`);
        await fs.writeFile(filePath, csv, 'utf8');
        await reportsRepo.markDone(report.id, filePath, 'text/csv');

        return { ok: true, path: filePath };
    } catch (err) {
        console.error(`[reportService] processReport failed id=${report.id}:`, err);
        await reportsRepo.markFailed(report.id, err);
        return { ok: false, error: err };
    }
}

// Берёт следующий отчёт из очереди и выполняет его.
// Возвращает true если задача была, false если очередь пуста.
// Вызывается в цикле воркером.
export async function processNext() {
    const report = await reportsRepo.getPendingAndLock();
    if (!report) return false;
    await processReport(report);
    return true;
}

// Возвращает отчёт по id. Если файл указан но не существует на диске —
// автоматически помечает отчёт как FILE_MISSING и обнуляет result_path.
export async function getReport(id) {
    console.log(`[reportService] getReport id=${id}`);

    const report = await reportsRepo.getReport(id);
    if (!report || !report.result_path) return report;

    try {
        await fs.access(report.result_path);
        return report;
    } catch {
        await reportsRepo.markMissing(id);
        report.status      = 'Файл не найден';
        report.result_path = null;
        return report;
    }
}

// Возвращает список отчётов для таблицы. Делегирует в репозиторий.
export async function listReportByTable(tableName) {
    console.log(`[reportService] listReportByTable table="${tableName}"`);
    return reportsRepo.listReportByTable(tableName);
}