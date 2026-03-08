import logger from '../utils/logger.js';
import * as reportsService from '../services/Reports/reportService.js';
import fs from "fs";
import path from "path";

export async function create(req, res) {
    try {
        const { tableName } = req.params;

        console.log(`[CTRL] create report → table: "${tableName}"`);
        console.log(`[CTRL] raw body:`, JSON.stringify(req.body, null, 2));

        const {
            title       = null,
            // старые поля (обратная совместимость)
            filter      = null,
            columns     = null,
            count       = null,
            avg         = null,
            groupBy     = null,
            orderBy     = null,
            orderDir    = null,
            // новые поля
            where       = null,
            aggregates  = null,
            having      = null,
            windowFns   = null,
            coalesce    = null,
            limit       = null,
            withSummary = null,
        } = req.body;

        console.log(`[CTRL] destructured → columns:`, columns, `| where:`, where, `| windowFns:`, windowFns, `| coalesce:`, coalesce, `| limit:`, limit);

        logger.debug(`report req body: ${JSON.stringify(req.body)}`);

        const report = await reportsService.createTask({
            tableName,
            title,
            filter,
            columns,
            count,
            avg,
            groupBy,
            orderBy,
            orderDir,
            where,
            aggregates,
            having,
            windowFns,
            coalesce,
            limit,
            withSummary,
        });

        console.log(`[CTRL] report saved → id: ${report.id}`);
        logger.info(`report created, ${report.id}`);
        return res.status(200).json({ id: report.id, status: report.status });
    } catch (err) {
        console.error(`[CTRL] ERROR:`, err);
        logger.error(`Ошибка при создании отчёта: ${err}`);
        return res.status(500).json(`Ошибка при создании отчёта: ${err}`);
    }
}

export async function remove(req,res) {
    try {
        const { reportId } = req.params;
        logger.debug(`Выполняется reportController remove ${reportId}`)

        const report = await reportsService.removeReport(reportId);
        return res.status(200).json(`Отчёт ${report.id} удалён.`)
    }
    catch (err) {
        logger.error(`Ошибка при удалении отчёта: ${err}`);
        return res.status(500).json(`Ошибка при удалении отчёта ${err}`);
    }
}

export async function list(req,res){
    try {
        const { tableName } = req.params;
        logger.debug(`Выполняется reportConroller list ${tableName}`);
        const reports = await reportsService.listReportByTable(tableName);
        return res.status(200).json({data: reports});
    }
    catch (err) {
        logger.error(`Ошибка при получении списка отчётов: ${err}`);
        return res.status(500).json(`Ошибка при получении списка отчётов: ${err}`)
    }
}
export async function status(req,res){
    try {
        const { reportId } = req.params;
        logger.debug(`Выполняется reportConroller status ${reportId}`);
        const report = await reportsService.getReport(reportId);
        if (!report) return res.status(404).json(`Отчёт не найден`);
        return res.status(200).json({id: reportId, status: report.status, error: report.error, started_at: report.started_at, finished_at: report.finished_at});
    }
    catch (err) {
        logger.error(`Ошибка при получении статуса отчёта: ${err}`);
        return res.status(500).json(`Ошибка при получении статуса отчёта: ${err}`)
    }
}
export async function download(req,res){
    try {
        const { reportId } = req.params;
        logger.debug(`Выполняется reportConroller download ${reportId}`);
        const report = await reportsService.getReport(reportId);
        if (!report) return res.status(404).json(`Отчёт не найден`);
        if (report.status !== `Готово` || !report.result_path) return res.status(409).json(`Отчёт еще не готов`)

        const filePath = report.result_path;
        const data = await fs.promises.readFile(filePath);
        res.setHeader('Content-Type', report.mime || `application/octet-stream`);
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
        return res.sendFile(path.resolve(filePath));
    }
    catch (err) {
        logger.error(`Ошибка при скачивании отчёта: ${err}`);
        return res.status(500).json(`Ошибка при скачивании отчёта: ${err}`)
    }
}