/* ============================================================================
   API.JS — МОДУЛЬ ДЛЯ РАБОТЫ С API
   ============================================================================ */

/* ─────────────────────────────────────────────────────────────────────────
   КОНФИГУРАЦИЯ
   ───────────────────────────────────────────────────────────────────────── */

/* Базовый URL для всех API запросов */
const BASE = 'http://localhost:3000';

/* ─────────────────────────────────────────────────────────────────────────
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Обработчик ответа от сервера
 * Преобразует ответ в JSON и обрабатывает ошибки
 *
 * @param {Response} res - Объект ответа от fetch
 * @returns {Promise<Object>} Распарсенный JSON или объект с ошибкой
 * @throws {Error} Выбрасывает ошибку если статус не 2xx
 */
async function handleResponse(res) {
    /* Получаем текст ответа, игнорируя ошибки парсинга */
    const text = await res.text().catch(() => '');

    /* Пытаемся распарсить текст как JSON */
    let json;
    try {
        json = text ? JSON.parse(text) : {};
    } catch (e) {
        /* Если парсинг не удался, оборачиваем текст в объект */
        json = { raw: text };
    }

    /* Проверяем успешность ответа */
    if (!res.ok) {
        /* Формируем сообщение об ошибке из ответа или HTTP статуса */
        const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
        const err = new Error(errMsg);
        err.status = res.status;
        err.payload = json;
        throw err;
    }

    return json;
}

/* ─────────────────────────────────────────────────────────────────────────
   ТАБЛИЦЫ (TABLES)
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Получить список всех таблиц
 * GET /tables
 */
export async function getListTables() {
    const res = await fetch(`${BASE}/tables`);
    return handleResponse(res);
}

/**
 * Удалить таблицу по названию
 * DELETE /tables/:tableName
 *
 * @param {string} tableName - Название таблицы для удаления
 */
export async function deleteTable(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
}

/**
 * Создать новую таблицу
 * POST /tables
 *
 * @param {Object} data - Данные таблицы
 * @param {string} data.tableName - Название новой таблицы
 * @param {Array} data.columns - Список колонок таблицы
 * @param {Object} options - Дополнительные опции
 * @param {string} options.base - Альтернативный базовый URL (по умолчанию BASE)
 */
export async function postCreateTable({ tableName, columns }, { base = BASE } = {}) {
    const body = { params: { tableName, columns } };

    const res = await fetch(`${base}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    return handleResponse(res);
}

/**
 * Получить данные таблицы (все строки)
 * GET /tables/:tableName
 *
 * @param {string} tableName - Название таблицы
 */
export async function getTable(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}`);
    return handleResponse(res);
}

/* ─────────────────────────────────────────────────────────────────────────
   СТРОКИ (ROWS)
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Получить список строк таблицы
 * GET /tables/:tableName/rows
 *
 * @param {string} tableName - Название таблицы
 */
export async function getListRows(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`);
    return handleResponse(res);
}

/**
 * Создать новую строку в таблице
 * POST /tables/:tableName/rows
 *
 * @param {string} tableName - Название таблицы
 * @param {Object} payload - Данные новой строки
 */
export async function postCreateRow(tableName, payload) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
}

/**
 * Удалить строку из таблицы по условию
 * DELETE /tables/:tableName/rows/:filterColumn/:filterValue
 *
 * @param {string} tableName - Название таблицы
 * @param {string} filterColumn - Название колонки для фильтрации
 * @param {string|number} filterValue - Значение для поиска строки
 */
export async function deleteRow(tableName, filterColumn, filterValue) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(filterColumn)}/${encodeURIComponent(filterValue)}`,
        { method: 'DELETE' }
    );
    return handleResponse(res);
}

/**
 * Заменить/обновить строку в таблице
 * PUT /tables/:tableName/rows/:filterColumn/:filterValue
 *
 * @param {string} tableName - Название таблицы
 * @param {string} filterColumn - Название колонки для поиска строки
 * @param {string|number} filterValue - Значение для поиска строки
 * @param {Object} data - Новые данные для строки
 */
export async function putReplaceRow(tableName, filterColumn, filterValue, data) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(filterColumn)}/${encodeURIComponent(filterValue)}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }
    );
    return handleResponse(res);
}

/* ─────────────────────────────────────────────────────────────────────────
   ОТЧЕТЫ (REPORTS)
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Создать новый отчет для таблицы
 * POST /tables/:tableName/reports
 *
 * @param {string} tableName - Название таблицы
 * @param {Object} payload - Параметры отчета (по умолчанию пустой объект)
 */
export async function postCreateReport(tableName, payload = {}) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
}

/**
 * Получить список всех отчетов для таблицы
 * GET /tables/:tableName/reports
 *
 * @param {string} tableName - Название таблицы
 */
export async function getListReports(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports`);
    return handleResponse(res);
}

/**
 * Получить статус генерации отчета
 * GET /tables/:tableName/reports/:reportId/status
 *
 * @param {string} tableName - Название таблицы
 * @param {string} reportId - ID отчета
 */
export async function getStatusReport(tableName, reportId) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/reports/${encodeURIComponent(reportId)}/status`
    );
    return handleResponse(res);
}

/**
 * Скачать сгенерированный отчет
 * GET /tables/:tableName/reports/:reportId/download
 *
 * Возвращает Response объект для работы с blob/потоком данных
 *
 * @param {string} tableName - Название таблицы
 * @param {string} reportId - ID отчета
 * @returns {Promise<Response>} Response объект для скачивания файла
 */
export async function getDownloadReport(tableName, reportId) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/reports/${encodeURIComponent(reportId)}/download`
    );

    /* Проверяем успешность ответа */
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
    }

    /* Возвращаем Response для работы с blob/потоком */
    return res;
}

/**
 * Удалить отчет
 * DELETE /tables/:tableName/reports/:reportId
 *
 * @param {string} tableName - Название таблицы
 * @param {string} reportId - ID отчета для удаления
 */
export async function deleteReport(tableName, reportId) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/reports/${encodeURIComponent(reportId)}`,
        { method: 'DELETE' }
    );
    return handleResponse(res);
}
