import * as rowService from '../services/Common/rowService.js';
import safeStringify from 'fast-safe-stringify';

// GET /tables/:tableName/rows и GET /tables/:tableName
// Возвращает метаданные колонок и строки таблицы: { data: { columns, data } }
export async function list(req, res) {
    try {
        const { tableName } = req.params;
        console.log(`[rowController] list table="${tableName}"`);

        const rows = await rowService.getRows(tableName);
        return res.status(200).json({ data: rows });
    } catch (err) {
        console.error(`[rowController] list error:`, err);
        return res.status(500).json(`Ошибка при загрузке строк: ${err}`);
    }
}

// GET /tables/:tableName/rows/:rowId
// Возвращает одну строку по id: { data: row }
// Если строка не найдена — 404.
export async function get(req, res) {
    try {
        const { tableName, rowId } = req.params;
        console.log(`[rowController] get table="${tableName}" rowId=${rowId}`);

        const rows = await rowService.getRow(tableName, { where: { id: { op: '=', value: rowId } } });
        if (!rows.length) return res.status(404).json({ error: 'Строка не найдена' });
        return res.status(200).json({ data: rows[0] });
    } catch (err) {
        console.error(`[rowController] get error:`, err);
        return res.status(500).json(`Ошибка при получении строки: ${err}`);
    }
}

// POST /tables/:tableName/rows
// Создаёт новую строку. Тело запроса — объект с полями строки.
// Возвращает созданную строку: { data: row }
export async function create(req, res) {
    try {
        const { tableName } = req.params;
        const data = req.body;
        console.log(`[rowController] create table="${tableName}"`, safeStringify(data));

        const rows = await rowService.createRow(tableName, data);
        return res.status(200).json({ data: rows });
    } catch (err) {
        console.error(`[rowController] create error:`, err);
        return res.status(500).json(`Ошибка при создании строки: ${err}`);
    }
}

// PUT /tables/:tableName/rows/:filterColumn/:filterValue
// Обновляет строку по значению указанной колонки. Тело запроса — новые значения полей.
// Возвращает обновлённую строку: { data: row }
export async function replace(req, res) {
    try {
        const { tableName, filterColumn, filterValue } = req.params;
        const data = req.body;
        console.log(`[rowController] replace table="${tableName}" where ${filterColumn}=${filterValue}`, safeStringify(data));

        const rows = await rowService.replaceRow(tableName, data, filterValue, filterColumn);
        return res.status(200).json({ data: rows });
    } catch (err) {
        console.error(`[rowController] replace error:`, err);
        return res.status(500).json(`Ошибка при обновлении строки: ${err}`);
    }
}

// DELETE /tables/:tableName/rows/:filterColumn/:filterValue
// Удаляет строку по значению указанной колонки.
// Возвращает удалённую строку: { data: row }
export async function remove(req, res) {
    try {
        const { tableName, filterColumn, filterValue } = req.params;
        console.log(`[rowController] remove table="${tableName}" where ${filterColumn}=${filterValue}`);

        const rows = await rowService.removeRow(tableName, filterValue, filterColumn);
        return res.status(200).json({ data: rows });
    } catch (err) {
        console.error(`[rowController] remove error:`, err);
        return res.status(500).json(`Ошибка при удалении строки: ${err}`);
    }
}