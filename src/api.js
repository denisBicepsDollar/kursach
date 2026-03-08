const BASE = 'http://localhost:3000';

// Helper для обработки ошибок
async function handleResponse(res) {
    const text = await res.text().catch(() => '');
    let json;
    try {
        json = text ? JSON.parse(text) : {};
    } catch (e) {
        json = { raw: text };
    }

    if (!res.ok) {
        const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
        const err = new Error(errMsg);
        err.status = res.status;
        err.payload = json;
        throw err;
    }

    return json;
}

// ============ TABLES ============

export async function getListTables() {
    const res = await fetch(`${BASE}/tables`);
    return handleResponse(res);
}

export async function deleteTable(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
}

export async function postCreateTable({ tableName, columns }, { base = BASE } = {}) {
    const body = { params: { tableName, columns } };

    const res = await fetch(`${base}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    return handleResponse(res);
}

export async function getTable(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}`);
    return handleResponse(res);
}

// ============ ROWS ============

export async function getListRows(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`);
    return handleResponse(res);
}

export async function postCreateRow(tableName, payload) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
}

export async function deleteRow(tableName, filterColumn, filterValue) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(filterColumn)}/${encodeURIComponent(filterValue)}`,
        { method: 'DELETE' }
    );
    return handleResponse(res);
}

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

// ============ REPORTS ============

export async function postCreateReport(tableName, payload = {}) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
}

export async function getListReports(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports`);
    return handleResponse(res);
}

export async function getStatusReport(tableName, reportId) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/reports/${encodeURIComponent(reportId)}/status`
    );
    return handleResponse(res);
}

export async function getDownloadReport(tableName, reportId) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/reports/${encodeURIComponent(reportId)}/download`
    );
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res; // Возвращаем Response для blob/stream
}

export async function deleteReport(tableName, reportId) {
    const res = await fetch(
        `${BASE}/tables/${encodeURIComponent(tableName)}/reports/${encodeURIComponent(reportId)}`,
        { method: 'DELETE' }
    );
    return handleResponse(res);
}
