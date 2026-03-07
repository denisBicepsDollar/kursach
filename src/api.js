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
    const res = await fetch(`${BASE}/tables/${tableName}`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
//Rows
export async function getListRows(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function postCreateRow(tableName, payload) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const text = await res.text().catch(()=>null);
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function deleteRow(tableName, filterColumn, filterValue) {
    return fetch(`${BASE}/tables/${tableName}/rows/${filterColumn}/${filterValue}`, { method: 'DELETE' })
        .then(r => r.json());
}
export async function putreplaceRow(tableName, filterColumn, filterValue, data) {
    return fetch(`${BASE}/tables/${tableName}/rows/${filterColumn}/${filterValue}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    }).then(r => r.json());
}

//Reports
export async function postCreateReport(tableName, payload = {}) {
    const url = `${BASE}/tables/${encodeURIComponent(tableName)}/reports`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Network error');
    }

    return response.json();
}
export async function getListReports(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function getStatusReport(tableName, reportId) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports/${reportId}/status`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
export async function getDownloadReport(tableName, reportId) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports/${reportId}/download`);
    if (!res.ok) throw new Error('Fetch err');
    return res;
}
export async function deleteReport(tableName, reportId) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/reports/${reportId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}
