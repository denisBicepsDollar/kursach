const BASE = 'http://localhost:3000';

export async function getListTables() {
    const res = await fetch(`${BASE}/tables`);
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

    // ожидаем { data: table }
    return json;
}
export async function getTable(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}

export async function getListRows(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/rows`);
    if (!res.ok) throw new Error('Fetch err');
    return res.json();
}

export async function postCreateReport(tableName) {
    const res = await fetch(`${BASE}/tables/${encodeURIComponent(tableName)}/report`, { method: 'POST' });
    if (!res.ok) throw new Error('Fetch err');
    // ожидаем { url: '...' } или файл; адаптируй под бэк
    return res.json();
}
