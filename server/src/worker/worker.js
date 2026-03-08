import * as reportService from '../services/Reports/reportService.js';
import logger from '../utils/logger.js';

export async function runWorker(pollMs = 1000){
    while(true) {
        try{
            const did = await reportService.processNext();

            if (!did) await new Promise(resolve => setTimeout(resolve, pollMs));
        }
        catch(err){
            logger.error(`Ошибка воркера, файл bin.worker.js. message: ${err}, stack: ${err.stack}`);
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }
    }
}
