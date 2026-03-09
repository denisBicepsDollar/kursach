// tableService.js
// Сервисный слой для работы с таблицами.
// Содержит бизнес-логику нормализации колонок перед передачей в репозиторий.

import * as tableRepo from '../../db/common/tableRepo.js';

// Нормализует объект колонки из запроса в формат для createTable.
// Проверяет наличие обязательных полей name и type.
// Собирает constraints: NOT NULL если nullable=false, DEFAULT если задан.
// DEFAULT-значение в виде функции (now(), gen_random_uuid()) вставляется без кавычек.
export function normalizeColumn(col) {
    if (!col || !col.name || !col.type) throw new Error('Каждая колонка должна иметь имя и тип данных');

    const name = String(col.name).trim();
    const type = String(col.type).trim();

    const notNull = col.nullable === false ? ' NOT NULL' : '';

    let defaultClause = '';
    if (col.default !== undefined && col.default !== null && col.default !== '') {
        const isFunc  = /\w+\s*\(/.test(col.default);
        const escaped = isFunc ? col.default : `'${col.default.replace(/'/g, "''")}'`;
        defaultClause = ` DEFAULT ${escaped}`;
    }

    return { name, type, constraints: `${notNull}${defaultClause}`.trim() };
}

// Возвращает список имён всех таблиц
export async function listTables() {
    return tableRepo.listTables();
}

// Создаёт таблицу, предварительно нормализуя колонки через normalizeColumn
export async function create(tableName, columns) {
    if (typeof tableName !== 'string') throw new Error('Недопустимое имя таблицы');
    return tableRepo.createTable(tableName, columns.map(normalizeColumn));
}

// Удаляет таблицу
export async function remove(tableName) {
    return tableRepo.removeTable(tableName);
}