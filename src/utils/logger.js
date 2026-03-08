import path from 'path';
import config from "../config/index.js"
import pino from "pino";
import {fileURLToPath} from "url";


console.log('Инициализация логгера')

function initLogger() {

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const fileDest = pino.destination({
        dest: path.join(__dirname, 'app.log'),
        sync: false});



    const logger = pino(
        {level: config.logLevel}, fileDest
    );
    console.log('Логгер успех');
    return logger;
}
const logger = initLogger();
export default logger;