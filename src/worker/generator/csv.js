export function reportCSV(rows) {
    if (!rows || !rows.length) return ``;
    const cols = Object.keys(rows[0]);
    const header = cols.join(`,`);
    const lines = rows.map(row => cols.map(col => {
        const v = row[col];
        if (v === null || v === undefined) return ``;
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
    }).join(','));
    return [header, ...lines].join('\n');
}