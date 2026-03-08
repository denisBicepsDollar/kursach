import * as tableRepo from '../../db/common/tableRepo.js';

export async function listTables(){
    return await tableRepo.listTables();
}
export function normalizeColumn(col){
    const name = String(col.name || '').trim();
    const type = String(col.type || '').trim();

    if (!col || !col.name || !col.type) throw new Error(`Каждая колонка должна иметь имя и тип данных`)

    const notNull = col.nullable === false ? ' NOT NULL' : '';

    // default clause
    let defaultClause = '';
    if (col.default !== undefined && col.default !== null && col.default !== '') {
        const isFunc = /\w+\s*\(/.test(col.default); // e.g. now()
        const escaped = isFunc
            ? col.default
            : `'${col.default.replace(/'/g, "''")}'`;
        defaultClause = ` DEFAULT ${escaped}`;
    }

    const constraints = `${notNull}${defaultClause}`.trim();

    return { name, type, constraints }
}
export async function create(tableName, columns){
    if (typeof tableName !== 'string') throw new Error(`Недопустимое имя таблицы`)
    const normalized = columns.map(normalizeColumn);
    return await tableRepo.createTable(tableName, normalized);
}
export async function remove(tableName){
    return await tableRepo.removeTable(tableName);
}