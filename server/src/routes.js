// ── routes.js ─────────────────────────────────────────────────────────────────
// Регистрирует все маршруты приложения.
// Структура API:
//   GET    /tables                                        — список таблиц
//   GET    /tables/:tableName                             — строки таблицы (columns + data)
//   POST   /tables                                        — создать таблицу
//   DELETE /tables/:tableName                             — удалить таблицу
//
//   GET    /tables/:tableName/rows                        — строки таблицы
//   GET    /tables/:tableName/rows/:rowId                 — одна строка по id
//   POST   /tables/:tableName/rows                        — создать строку
//   PUT    /tables/:tableName/rows/:filterColumn/:filterValue — обновить строку
//   DELETE /tables/:tableName/rows/:filterColumn/:filterValue — удалить строку
//
//   GET    /tables/:tableName/reports                     — список отчётов таблицы
//   POST   /tables/:tableName/reports                     — создать отчёт (поставить в очередь)
//   GET    /tables/:tableName/reports/:reportId/status    — статус отчёта
//   GET    /tables/:tableName/reports/:reportId/download  — скачать готовый отчёт
//   DELETE /tables/:tableName/reports/:reportId           — удалить отчёт

import * as rowController    from './controllers/rowController.js';
import * as reportController from './controllers/reportController.js';
import * as tableController  from './controllers/tableController.js';

export function registerRoutes(app) {
    app.get('/', (req, res) => res.json({ ok: true }));

    // Tables
    app.get('/tables',               tableController.list);
    app.get('/tables/:tableName',    rowController.list);
    app.post('/tables',              tableController.create);
    app.delete('/tables/:tableName', tableController.remove);

    // Rows
    app.get('/tables/:tableName/rows',                               rowController.list);
    app.get('/tables/:tableName/rows/:rowId',                        rowController.get);
    app.post('/tables/:tableName/rows',                              rowController.create);
    app.put('/tables/:tableName/rows/:filterColumn/:filterValue',    rowController.replace);
    app.delete('/tables/:tableName/rows/:filterColumn/:filterValue', rowController.remove);

    // Reports
    app.get('/tables/:tableName/reports',                        reportController.list);
    app.post('/tables/:tableName/reports',                       reportController.create);
    app.get('/tables/:tableName/reports/:reportId/status',       reportController.status);
    app.get('/tables/:tableName/reports/:reportId/download',     reportController.download);
    app.delete('/tables/:tableName/reports/:reportId',           reportController.remove);
}