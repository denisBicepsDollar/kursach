import express from 'express';
import cors from 'cors'
import config from './config/index.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { registerRoutes } from "./routes.js";
import {fileURLToPath} from "url";
import path from "path";

logger.info('Инициализация сервера')


async function startServer() {


    const app = express();
    logger.debug('конфиг и приложение успешно инициализированы')

    logger.debug('инициализация middleware')
    app.use(cors())
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(errorHandler);

    logger.debug('инициализация routes')
    registerRoutes(app);

    logger.debug('инициализация порта и listen')
    const port = config.port;
    app.listen(port, () => {
        logger.info(`Server started on port ${port}`);
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch((err) => {
        logger.error('Ошибка при запуске сервера ', err);
        process.exit(1);
    });
}
