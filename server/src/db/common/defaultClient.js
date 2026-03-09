// ── defaultClient.js ──────────────────────────────────────────────────────────
// Пул соединений к основной БД (defaultDb).
// Pool автоматически управляет соединениями: переподключается при обрывах,
// держит несколько соединений под нагрузкой — в отличие от Client.
// Параметры подключения берутся из конфига, не хардкодятся в коде.

import pkg from 'pg';
import config from '../../config/index.js';

const { Pool } = pkg;

const pool = new Pool({
    host:     config.db.host,
    port:     config.db.port,
    user:     config.db.user,
    password: config.db.password,
    database: config.db.defaultDatabase,
});

pool.on('connect', () => console.log(`[defaultClient] connected to "${config.db.defaultDatabase}"`));
pool.on('error',   (err) => console.error('[defaultClient] pool error:', err));

export default pool;