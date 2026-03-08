import pool from './defaultClient.js';
import logger from '../../utils/logger.js';

export async function listTables(){
    const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
    `;

    const result = await pool.query(query);
    return result.rows.map(row => row.table_name);
}
export async function createTable(tableName, columns) {
    if (!tableName) throw new Error('tableName required');
    if (!Array.isArray(columns) || columns.length === 0) throw new Error('columns required');

    const cols = columns.map((col, i) => {
        const name = String(col.name || '').trim();
        const type = String(col.type || '').trim();
        const constraints = col.constraints ? ' ' + String(col.constraints) : '';
        return `"${name.replace(/"/g, '""')}" ${type}${constraints}`;
    }).join(', ');

    const safeTable = `"${String(tableName).replace(/"/g, '""')}"`;
    const sql = `CREATE TABLE IF NOT EXISTS ${safeTable} (${cols});`;
    logger.debug(`sql: ${sql}, query: ${cols}`);
    await pool.query(sql);
    return { table: tableName, sql };
}

export async function removeTable(tableName){
    const query = `DROP TABLE IF EXISTS "${tableName}"`;
    const rows = await pool.query(query);
    return rows[0];
}