import * as rowRepo from '../../db/common/rowRepo.js';

export async function createRow(tableId, data) {
    return await rowRepo.create(tableId, data);
}
export async function getRows(tableName){
    return await rowRepo.find(tableName);
}
export async function getRow(tableName, filter) {
    return await rowRepo.findByColumns(tableName, filter);
}
export async function replaceRow(tableName, data, filterValue, filterColumn){
    return await rowRepo.replace(tableName, data, filterValue, filterColumn);
}
export async function removeRow(tableName, filterValue, filterColumn){
    return await rowRepo.remove(tableName, filterValue, filterColumn);
}
