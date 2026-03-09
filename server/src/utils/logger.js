// ── logger.js ─────────────────────────────────────────────────────────────────
// Простой логгер: дублирует вывод в терминал и в файл app.log рядом с собой.
// Формат строки: [ISO-timestamp] [LEVEL] message
// Запись в файл асинхронная (флаг 'a' — дозапись, не перезапись).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE  = path.join(__dirname, 'app.log');
const stream    = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// Формирует строку лога и пишет её в файл. Возвращает строку для console.
function write(level, args) {
    const prefix = `[${new Date().toISOString()}] [${level}]`;
    const line   = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    const full   = `${prefix} ${line}`;
    stream.write(full + '\n');
    return full;
}

const log = {
    info:  (...args) => console.log(write('INFO',  args)),
    debug: (...args) => console.log(write('DEBUG', args)),
    warn:  (...args) => console.warn(write('WARN',  args)),
    error: (...args) => console.error(write('ERROR', args)),
};

export default log;