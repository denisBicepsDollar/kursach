import * as service from '../services/Common/rowService.js';
import logger from '../utils/logger.js';
import safeStringify from "fast-safe-stringify";

export async function list(req,res) {
    try {
        const {tableName} = req.params;
        logger.debug(`Выполняется list, table = ${tableName}`);

        const rows = await service.getRows(tableName);

        return res.status(202).json({data:rows});
    }
    catch(err){
        logger.error(`Ошибка при загрузке строк ${err}`);
        return res.status(500).json(`Ошибка при загрузке строк ${err}`);
    }
}
export async function get(req, res) {
    try {
        const { tableName, rowId } = req.params;
        logger.debug(
            `Выполняется get, table = ${tableName}, rowId = ${rowId}`
        );

        // формируем простейший фильтр‑строку
        const filter = `id = ${rowId}`;   // без кавычек, т.к. id – числовой

        const row = await service.getRow(tableName, filter);
        if (!row) {
            return res.status(404).json({ err: 'Строка не найдена' });
        }

        return res.status(200).json({ data: row });
    } catch (err) {
        logger.error(`Ошибка при получении строки ${err}`);
        return res.status(500).json(`Ошибка при получении строки ${err}`);
    }
}

export async function create(req,res){
    try {
        const {tableName} = req.params;
        const data = req.body;
        logger.debug(`Выполняется create, table = ${tableName}, data=${safeStringify(data)}`);

        const row = await service.createRow(tableName, data);

        return res.json({data:row});
    }
    catch (err) {
        logger.error(`Ошибка при создании строки ${err}`);
        return res.status(500).json(`Ошибка при создании строки ${err}`);
    }
}

export async function replace(req, res) {
    try {
        const { tableName, filterColumn, filterValue } = req.params;
        const data = req.body;
        logger.debug(`Выполняется replace, table=${tableName}, filterColumn=${filterColumn}, filterValue=${safeStringify(filterValue)}, data=${safeStringify(data)}`);

        const row = await service.replaceRow(tableName, data, filterValue, filterColumn);
        return res.json({ data: row });
    } catch (err) {
        logger.error(`Ошибка при обновлении строки ${err}`);
        return res.status(500).json(`Ошибка при обновлении строки ${err}`);
    }
}

export async function remove(req, res) {
    try {
        const { tableName, filterColumn, filterValue } = req.params;
        logger.debug(`Выполняется remove, table=${tableName}, filterColumn=${filterColumn}, filterValue=${safeStringify(filterValue)}`);

        const row = await service.removeRow(tableName, filterValue, filterColumn);
        return res.json({ data: row });
    } catch (err) {
        logger.error(`Ошибка при удалении строки: ${err}`);
        return res.status(500).json(`Ошибка при удалении строки: ${err}`);
    }
}
