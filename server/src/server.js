// ── server.js ─────────────────────────────────────────────────────────────────
// Точка входа HTTP-сервера. Инициализирует Express, подключает middleware и роуты.
// errorHandler регистрируется ПОСЛЕ роутов — иначе он не перехватит ошибки из них.

import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import errorHandler from './middleware/errorHandler.js';
import { registerRoutes } from './routes.js';

async function startServer() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    registerRoutes(app);

    // errorHandler должен быть последним middleware
    app.use(errorHandler);

    const port = config.port;
    app.listen(port, () => {
        console.log(`[server] started on port ${port}`);
    });
}

startServer().catch(err => {
    console.error('[server] ошибка при запуске:', err);
    process.exit(1);
});