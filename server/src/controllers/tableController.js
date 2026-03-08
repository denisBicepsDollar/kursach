import * as tableService from '../services/Common/tableService.js';
import logger from '../utils/logger.js';

export async function list(req,res){
    try {
        const tables = await tableService.listTables();
        logger.debug(`list tableController`);

        return res.json({data:tables});
    }
    catch(err){
        logger.error(err);
        return res.status(500).json(`Ошибка при получении списка таблиц ${err}`);
    }
}
export async function create(req,res){
    try {
        const params = (req.body && req.body.params) || {};
        const tableName = params.tableName;
        const columns = params.columns;

        if (!tableName || !Array.isArray(columns) || columns.length === 0) {

            return res.status(400).json({ error: 'Неправильные параметры. Ожидается tableName и params.columns' });
        }


        const table = await tableService.create(tableName, columns);

        return res.status(200).json({data: table});

    }
    catch(err){
        logger.error(err);
        return res.status(500).json(`Ошибка при создании таблицы ${err}`)
    }
}
export async function remove(req,res){
    try {
        const { tableName } = req.params
        const result = await tableService.remove(tableName);
        logger.debug(`tableController remove ${tableName}`);
        return res.status(200).json({data:result});
    }
    catch(err){
        logger.error(`Ошибка при удалении таблицы ${err}`);
        return res.status(500).json(`Ошибка при удалении таблицы ${err}`)
    }
}