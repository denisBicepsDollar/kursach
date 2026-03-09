// ── errorHandler.js ───────────────────────────────────────────────────────────
// Глобальный обработчик ошибок Express (4 аргумента — обязательно).
// Должен регистрироваться ПОСЛЕДНИМ после всех роутов в server.js,
// иначе не будет перехватывать ошибки переданные через next(err).

export default function errorHandler(err, req, res, next) {
    console.error('[errorHandler]', err);
    const status = err.status || 500;
    res.status(status).send(err.message);
}