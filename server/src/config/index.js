// ── config/index.js ───────────────────────────────────────────────────────────
// Читает config.json и экспортирует плоский объект с настройками приложения.
// Все параметры подключения к БД берутся отсюда — не хардкодятся в клиентах.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw       = fs.readFileSync(path.resolve(__dirname, 'config.json'), 'utf8');
const file      = JSON.parse(raw);

const config = {
    port:            file.main.port,
    logLevel:        file.main.logLevel.toLowerCase(),
    db: {
        host:            file.db.host,
        port:            file.db.port,
        user:            file.db.user,
        password:        file.db.password,
        defaultDatabase: file.db.defaultDatabase,
        reportsDatabase: file.db.reportsDatabase,
    },
};

console.log(`[config] port=${config.port} logLevel=${config.logLevel} db.host=${config.db.host}`);
export default config;