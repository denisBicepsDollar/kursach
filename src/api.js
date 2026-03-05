const BASE = 'http://localhost:3000';
//Tables
export async function getListTables() {
    const res = await fetch(`${BASE}/tables`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function deleteTable(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function postCreateTable({ tableName, columns }, { base = BASE } = {}) {
    const body = { params: { tableName, columns } };

    const res = await fetch(`${base}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const text = await res.text().catch(() => '');
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { raw: text }; }

    if (!res.ok) {
        const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
        const err = new Error(errMsg);
        err.status = res.status;
        err.payload = json;
        throw err;
    }

    return json;
}
export async function getTable(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
//Rows
export async function getListRows(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function postCreateRow(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function putReplaceRow(tableName, rowId) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows/${rowId}`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function deleteRow(tableName, rowId) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows/${rowId}`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}

//Reports
export async function postCreateReport(tableName, { title = null, params = null } = {}) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, params })
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Fetch error');
    }
    return res.json();
}
export async function getListReports(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function getStatusReport(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/status`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function getDownloadReport(tableName, reportId) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports/${reportId}/download`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function deleteReport(tableName, reportId) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports/${reportId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
