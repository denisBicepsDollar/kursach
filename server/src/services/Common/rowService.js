// rowService.js
// Сервисный слой для работы со строками таблиц.
// Сейчас является тонкой прослойкой над rowRepo — здесь будет расти
// бизнес-логика: валидация, трансформации, события.

import * as rowRepo from '../../db/common/rowRepo.js';

// Возвращает метаданные колонок и строки таблицы: { columns, data }
export async function getRows(tableName) {
    return rowRepo.find(tableName);
}

// Выполняет гибкий SELECT по переданным параметрам (where, aggregates и т.д.)
export async function getRow(tableName, params) {
    return rowRepo.findByColumns(tableName, params);
}

// Создаёт новую строку в таблице
export async function createRow(tableName, data) {
    return rowRepo.create(tableName, data);
}

// Обновляет строку по значению filterColumn
export async function replaceRow(tableName, data, filterValue, filterColumn) {
    return rowRepo.replace(tableName, data, filterValue, filterColumn);
}

// Удаляет строку по значению filterColumn
export async function removeRow(tableName, filterValue, filterColumn) {
    return rowRepo.remove(tableName, filterValue, filterColumn);
}