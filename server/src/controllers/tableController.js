import * as tableService from '../services/Common/tableService.js';

// GET /tables
// Возвращает список имён всех таблиц в БД: { data: ['table1', 'table2', ...] }
export async function list(req, res) {
    try {
        console.log(`[tableController] list`);

        const tables = await tableService.listTables();
        return res.status(200).json({ data: tables });
    } catch (err) {
        console.error(`[tableController] list error:`, err);
        return res.status(500).json(`Ошибка при получении списка таблиц: ${err}`);
    }
}

// POST /tables
// Создаёт новую таблицу. Ожидает тело: { params: { tableName, columns: [...] } }
// Каждая колонка: { name, type, nullable?, default? }
// Возвращает: { data: { table, sql } }
export async function create(req, res) {
    try {
        const params    = (req.body && req.body.params) || {};
        const tableName = params.tableName;
        const columns   = params.columns;
        console.log(`[tableController] create name="${tableName}"`, columns);

        if (!tableName || !Array.isArray(columns) || columns.length === 0) {
            return res.status(400).json({ error: 'Ожидается params.tableName и params.columns' });
        }

        const table = await tableService.create(tableName, columns);
        return res.status(200).json({ data: table });
    } catch (err) {
        console.error(`[tableController] create error:`, err);
        return res.status(500).json(`Ошибка при создании таблицы: ${err}`);
    }
}

// DELETE /tables/:tableName
// Удаляет таблицу. Возвращает: { data: result }
export async function remove(req, res) {
    try {
        const { tableName } = req.params;
        console.log(`[tableController] remove name="${tableName}"`);

        const result = await tableService.remove(tableName);
        return res.status(200).json({ data: result });
    } catch (err) {
        console.error(`[tableController] remove error:`, err);
        return res.status(500).json(`Ошибка при удалении таблицы: ${err}`);
    }
}