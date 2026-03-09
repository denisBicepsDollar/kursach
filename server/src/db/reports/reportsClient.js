// ── reportsClient.js ──────────────────────────────────────────────────────────
// Пул соединений к БД отчётов (reports).
// Отдельная БД используется чтобы изолировать таблицу reports от основных данных.
// Структура идентична defaultClient — отличается только database.

import pkg from 'pg';
import config from '../../config/index.js';

const { Pool } = pkg;

const pool = new Pool({
    host:     config.db.host,
    port:     config.db.port,
    user:     config.db.user,
    password: config.db.password,
    database: config.db.reportsDatabase,
});

pool.on('connect', () => console.log(`[reportsClient] connected to "${config.db.reportsDatabase}"`));
pool.on('error',   (err) => console.error('[reportsClient] pool error:', err));

export default pool;