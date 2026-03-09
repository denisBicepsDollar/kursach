import * as reportsService from '../services/Reports/reportService.js';
import path from 'path';

// POST /tables/:tableName/reports
// Создаёт задачу на генерацию отчёта и ставит её в очередь воркеру.
// Поддерживает как новый формат (where, aggregates, windowFns и т.д.),
// так и legacy-поля (filter, count, avg, groupBy, orderBy, orderDir).
// Возвращает: { id, status }
export async function create(req, res) {
    try {
        const { tableName } = req.params;
        console.log(`[reportController] create table="${tableName}"`, JSON.stringify(req.body, null, 2));

        const {
            title       = null,
            filter      = null,
            columns     = null,
            count       = null,
            avg         = null,
            groupBy     = null,
            orderBy     = null,
            orderDir    = null,
            where       = null,
            aggregates  = null,
            having      = null,
            windowFns   = null,
            coalesce    = null,
            limit       = null,
            withSummary = null,
        } = req.body;

        const report = await reportsService.createTask({
            tableName, title, filter, columns, count, avg,
            groupBy, orderBy, orderDir, where, aggregates,
            having, windowFns, coalesce, limit, withSummary,
        });

        console.log(`[reportController] create result id=${report.id}`);
        return res.status(200).json({ id: report.id, status: report.status });
    } catch (err) {
        console.error(`[reportController] create error:`, err);
        return res.status(500).json(`Ошибка при создании отчёта: ${err}`);
    }
}

// DELETE /tables/:tableName/reports/:reportId
// Удаляет отчёт из БД и файл с диска (если есть).
export async function remove(req, res) {
    try {
        const { reportId } = req.params;
        console.log(`[reportController] remove id=${reportId}`);

        await reportsService.removeReport(reportId);
        return res.status(200).json(`Отчёт ${reportId} удалён.`);
    } catch (err) {
        console.error(`[reportController] remove error:`, err);
        return res.status(500).json(`Ошибка при удалении отчёта: ${err}`);
    }
}

// GET /tables/:tableName/reports
// Возвращает список отчётов таблицы, отсортированных по дате создания (новые первые).
// Возвращает: { data: [...] }
export async function list(req, res) {
    try {
        const { tableName } = req.params;
        console.log(`[reportController] list table="${tableName}"`);

        const reports = await reportsService.listReportByTable(tableName);
        return res.status(200).json({ data: reports });
    } catch (err) {
        console.error(`[reportController] list error:`, err);
        return res.status(500).json(`Ошибка при получении списка отчётов: ${err}`);
    }
}

// GET /tables/:tableName/reports/:reportId/status
// Возвращает текущий статус отчёта: { id, status, error, started_at, finished_at }
// Если отчёт не найден — 404.
export async function status(req, res) {
    try {
        const { reportId } = req.params;
        console.log(`[reportController] status id=${reportId}`);

        const report = await reportsService.getReport(reportId);
        if (!report) return res.status(404).json(`Отчёт не найден`);
        return res.status(200).json({
            id:          reportId,
            status:      report.status,
            error:       report.error,
            started_at:  report.started_at,
            finished_at: report.finished_at,
        });
    } catch (err) {
        console.error(`[reportController] status error:`, err);
        return res.status(500).json(`Ошибка при получении статуса отчёта: ${err}`);
    }
}

// GET /tables/:tableName/reports/:reportId/download
// Отдаёт файл отчёта на скачивание.
// 404 если отчёт не найден, 409 если ещё не готов или файл пропал.
export async function download(req, res) {
    try {
        const { reportId } = req.params;
        console.log(`[reportController] download id=${reportId}`);

        const report = await reportsService.getReport(reportId);
        if (!report)                                           return res.status(404).json(`Отчёт не найден`);
        if (report.status !== 'Готово' || !report.result_path) return res.status(409).json(`Отчёт ещё не готов`);

        res.setHeader('Content-Type', report.mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(report.result_path)}"`);
        return res.sendFile(path.resolve(report.result_path));
    } catch (err) {
        console.error(`[reportController] download error:`, err);
        return res.status(500).json(`Ошибка при скачивании отчёта: ${err}`);
    }
}