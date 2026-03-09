import pool from './defaultClient.js';

// Возвращает список имён всех пользовательских таблиц в схеме public.
// Исключает системные схемы pg_catalog и information_schema.
export async function listTables() {
    console.log(`[tableRepo] listTables`);

    const { rows } = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
    `);

    console.log(`[tableRepo] listTables result: ${rows.length} tables`);
    return rows.map(r => r.table_name);
}

// Создаёт таблицу с заданными колонками. Использует IF NOT EXISTS — не падает если таблица уже есть.
// Каждая колонка: { name, type, constraints } — constraints уже собран в tableService.normalizeColumn.
export async function createTable(tableName, columns) {
    console.log(`[tableRepo] createTable name="${tableName}"`, columns);

    if (!tableName)                                 throw new Error('tableName required');
    if (!Array.isArray(columns) || !columns.length) throw new Error('columns required');

    const cols = columns.map(col => {
        const name        = String(col.name || '').trim();
        const type        = String(col.type || '').trim();
        const constraints = col.constraints ? ` ${String(col.constraints)}` : '';
        return `"${name.replace(/"/g, '""')}" ${type}${constraints}`;
    }).join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS "${String(tableName).replace(/"/g, '""')}" (${cols})`;
    console.log(`[tableRepo] createTable SQL: ${sql}`);
    await pool.query(sql);
    return { table: tableName, sql };
}

// Удаляет таблицу. Использует IF EXISTS — не падает если таблицы уже нет.
export async function removeTable(tableName) {
    console.log(`[tableRepo] removeTable name="${tableName}"`);

    const sql = `DROP TABLE IF EXISTS "${String(tableName).replace(/"/g, '""')}"`;
    await pool.query(sql);
    console.log(`[tableRepo] removeTable done`);
}