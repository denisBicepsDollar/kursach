import React, { useState, useMemo, useEffect } from 'react';
import '../index.css';
import * as api from '../api';
import SidebarTable from "../sidebars/sideBarTable.jsx";
import * as form from "../addForm/addFormRow.jsx";

export default function TableInfo({ tableInfo }) {
    const columns = tableInfo?.rows?.data?.columns || tableInfo?.rows?.columns || [];
    const raw = tableInfo?.rows?.data ?? tableInfo?.rows ?? {};

    function normalizeData(input) {
        if (Array.isArray(input)) return input;
        if (!input || typeof input !== 'object') return [];
        if (Array.isArray(input.data)) return input.data;
        if (input['0'] !== undefined) {
            const v = input['0'];
            if (Array.isArray(v)) return v;
            if (v && typeof v === 'object') return [v];
            return [];
        }
        return Object.keys(input).length ? Object.values(input) : [];
    }

    const initialDataRaw = normalizeData(raw);

    const initialData = useMemo(() => {
        return initialDataRaw.map((r, idx) => ({ ...r, _localId: idx }));
    }, [initialDataRaw]);

    const tableName = tableInfo.tableName || tableInfo.name;
    const [data, setData] = useState(initialData);
    const [loading] = useState(false);

    // modal state for edit
    const [editingRow, setEditingRow] = useState(null);
    const [editingData, setEditingData] = useState({});

    const formatVal = val => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string' && /\d{4}-\d{2}-\d{2}T/.test(val)) {
            const d = new Date(val);
            return isNaN(d) ? val : d.toLocaleString();
        }
        return String(val);
    };

    function getFilterForRow(row, columnsList) {
        if (row.id !== undefined) return { col: 'id', val: row.id };
        for (const c of columnsList) {
            const name = c.column_name;
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return { col: name, val: row[name] };
            }
        }
        return { col: 'id', val: row._localId };
    }

    const handleDelete = async (localId) => {
        const ok = window.confirm('Удалить эту строку?');
        if (!ok) return;
        const rowToDelete = data.find(r => r._localId === localId);
        if (!rowToDelete) return alert('Строка не найдена');
        const { col: filterColumn, val: filterValue } = getFilterForRow(rowToDelete, columns);

        try {
            await api.deleteRow(tableName, filterColumn, encodeURIComponent(String(filterValue)));
            setData(prev => prev
                .filter(r => r._localId !== localId)
                .map((r, i) => ({ ...r, _localId: i }))
            );
        } catch (err) {
            console.error('Delete failed', err);
            alert('Не удалось удалить строку.');
        }
    };

    const handleCreate = (newRow) => {
        const serverRow = newRow && newRow.data && Array.isArray(newRow.data) ? newRow.data[0] : newRow;
        const nextId = data.length ? Math.max(...data.map(d => d._localId)) + 1 : 0;
        const withLocal = { ...serverRow, _localId: nextId };
        setData(prev => [...prev, withLocal].map((r, i) => ({ ...r, _localId: i })));
    };

    const openEdit = (row) => {
        setEditingRow(row);
        setEditingData({ ...row }); // clone
    };

    const closeEdit = () => {
        setEditingRow(null);
        setEditingData({});
    };

    const submitEdit = async () => {
        if (!editingRow) return;
        const { col: filterColumn, val: filterValue } = getFilterForRow(editingRow, columns);

        // сформировать payload с реальными колонками
        const payload = {};
        for (const c of columns) {
            const name = c.column_name;
            if (editingData[name] !== undefined) payload[name] = editingData[name];
        }

        try {
            const res = await api.putReplaceRow(tableName, filterColumn, encodeURIComponent(String(filterValue)), payload);
            const updated = (res && res.data && res.data[0]) ? res.data[0] : payload;
            setData(prev => prev.map(r => (r._localId === editingRow._localId ? { ...updated, _localId: r._localId } : r)));
            closeEdit();
        } catch (err) {
            console.error('Replace failed', err);
            alert('Не удалось обновить строку.');
        }
    };
    const [reports, setReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);


    const loadReports = async () => {
        setReportsLoading(true);
        try {
            const res = await api.getListReports(tableName);
            // ожидается, что API вернёт массив; при необходимости адаптируйте
            setReports(Array.isArray(res) ? res : (res.data || []));
        } catch (err) {
            console.error('Load reports failed', err);
            alert('Не удалось загрузить отчёты.');
        } finally {
            setReportsLoading(false);
        }
    };

    useEffect(() => { loadReports(); }, [tableName]);

    const removeReport = async (id) => {
        if (!window.confirm('Удалить отчёт?')) return;
        try {
            await api.deleteReport(tableName, id);
            setReports(prev => prev.filter(r => r.id !== id && r.reportId !== id));
        } catch (err) {
            console.error('Delete report failed', err);
            alert('Не удалось удалить отчёт.');
        }
    };

    const checkStatus = async (reportId) => {
        try {
            const s = await api.getStatusReport(tableName, reportId); // если API принимает report id, измените вызов
            alert(JSON.stringify(s));
        } catch (err) {
            console.error('Status failed', err);
            alert('Не удалось получить статус.');
        }
    };

    const downloadReport = async (id) => {
        try {
            const res = await api.getDownloadReport(tableName, id);
            // если сервер вернул JSON с url
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const j = await res.json();
                if (j.url) { window.open(j.url, '_blank'); return; }
                alert('Ответ JSON: ' + JSON.stringify(j));
                return;
            }
            // иначе считаем ответ бинарным файлом
            const blob = await res.blob();
            const filename = (() => {
                const cd = res.headers.get('content-disposition') || '';
                const m = /filename\*=UTF-8''([^;]+)/.exec(cd) || /filename="([^"]+)"/.exec(cd);
                return (m && decodeURIComponent(m[1])) || `${tableName}-${id}`;
            })();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
            alert('Не удалось скачать отчёт: ' + (err.message || err));
        }
    };




    return (
        <>
            <h2 className="header-title">{tableName}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px 0' }}>

                {/* ====== КОЛОНКИ ====== */}
                <div className="body-content" style={{ gap: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px', marginBottom: '12px' }}>
                        <h3 className="body-content-title" style={{ padding: 0, margin: 0, background: 'none', border: 'none', textAlign: 'left' }}>
                            Колонки
                        </h3>
                        <SidebarTable
                            tableName={tableName}
                            disabled={loading}
                            onClickTable={() => {}}
                            onActionComplete={async () => {
                                setReportsLoading(true);
                                try { await loadReports(tableName); }
                                finally { setReportsLoading(false); }
                            }}
                        />
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Monaco, monospace', fontSize: '14px' }}>
                            <thead>
                            <tr style={{ background: '#f3f4f6' }}>
                                {['Имя', 'Тип', 'Nullable', 'По умолчанию'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid rgba(0,0,0,0.1)', fontFamily: 'Helvetica Neue, Helvetica', fontSize: '13px', color: '#666', fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {columns.map((col, i) => (
                                <tr key={col.column_name} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                    <td style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontWeight: 600, color: '#0062ca' }}>{col.column_name}</td>
                                    <td style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#555' }}>{col.data_type}</td>
                                    <td style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '12px', background: col.is_nullable === 'YES' ? '#d1fae5' : '#ffe6ed', color: col.is_nullable === 'YES' ? '#047857' : '#d63855', fontWeight: 600 }}>
                                            {col.is_nullable === 'YES' ? 'Да' : 'Нет'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#777' }}>{col.column_default ?? '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ====== ДАННЫЕ ====== */}
                <div className="body-content" style={{ gap: '0' }}>
                    <h3 className="body-content-title" style={{ marginBottom: '12px' }}>Данные</h3>

                    {data.length === 0 ? (
                        <form.AddFormRow
                            tableName={tableName}
                            cols={columns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES', default: c.column_default ?? '' }))}
                            onCreate={handleCreate}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Monaco, monospace' }}>
                                    <thead>
                                    <tr style={{ background: '#f3f4f6' }}>
                                        {columns.map(col => (
                                            <th key={col.column_name} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid rgba(0,0,0,0.1)', fontFamily: 'Helvetica Neue', fontSize: '13px', color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {col.column_name}
                                            </th>
                                        ))}
                                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid rgba(0,0,0,0.1)', fontFamily: 'Helvetica Neue', fontSize: '13px', color: '#666', fontWeight: 600 }}>Действия</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {data.map((row, i) => (
                                        <tr key={row._localId} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                            {columns.map(col => (
                                                <td key={col.column_name} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: col.data_type.includes('timestamp') ? '12px' : '13px', color: '#333' }}>
                                                    {formatVal(row[col.column_name])}
                                                </td>
                                            ))}
                                            <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
                                                <button type="button" onClick={() => openEdit(row)} className="btn-warning">Заменить</button>
                                                <button type="button" onClick={() => handleDelete(row._localId)} className="btn-danger">Удалить</button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <form.AddFormRow
                                tableName={tableName}
                                cols={columns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES', default: c.column_default ?? '' }))}
                                onCreate={handleCreate}
                            />
                        </div>
                    )}
                </div>

                {/* ====== ОТЧЁТЫ ====== */}
                <div className="body-content" style={{ gap: '0' }}>
                    <h3 className="body-content-title" style={{ marginBottom: '12px' }}>Отчёты</h3>

                    {reportsLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#777', fontFamily: 'Helvetica Neue' }}>Загрузка...</div>
                    ) : (
                        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                <tr style={{ background: '#f3f4f6' }}>
                                    {['ID', 'Заголовок', 'Статус', 'Создан', 'Действия'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid rgba(0,0,0,0.1)', fontFamily: 'Helvetica Neue', fontSize: '13px', color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#777', fontFamily: 'Helvetica Neue' }}>Нет отчётов</td>
                                    </tr>
                                ) : (
                                    reports.map((r, i) => (
                                        <tr key={r.id ?? r.reportId} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                            <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Monaco', color: '#0062ca', fontWeight: 600 }}>{r.id ?? r.reportId}</td>
                                            <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title ?? r.name ?? '—'}</td>
                                            <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                                                    background: r.status === 'done' || r.status === 'completed' ? '#d1fae5' : r.status === 'error' ? '#ffe6ed' : '#fef3c7',
                                                    color: r.status === 'done' || r.status === 'completed' ? '#047857' : r.status === 'error' ? '#d63855' : '#d97706'
                                                }}>
                                                    {r.status ?? r.state ?? '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontFamily: 'Monaco', fontSize: '12px', color: '#777' }}>{formatVal(r.createdAt ?? r.created_at ?? r.created ?? null)}</td>
                                            <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
                                                <button type="button" className="btn-accent2" onClick={() => downloadReport(r.id ?? r.reportId)}>Скачать</button>
                                                <button type="button" className="btn-outline" onClick={() => checkStatus(r.id ?? r.reportId)}>Статус</button>
                                                <button type="button" className="btn-danger" onClick={() => removeReport(r.id ?? r.reportId)}>Удалить</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ====== МОДАЛКА РЕДАКТИРОВАНИЯ ====== */}
            {editingRow && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        <h4 style={{ margin: '0 0 20px', fontFamily: 'Helvetica Neue', fontSize: '18px', color: '#333' }}>Редактировать строку</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {columns.map(col => (
                                <div key={col.column_name}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#666', fontFamily: 'Helvetica Neue' }}>{col.column_name}</label>
                                    <input
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '14px', fontFamily: 'Monaco', background: '#fafafa', boxSizing: 'border-box' }}
                                        value={editingData[col.column_name] ?? ''}
                                        onChange={e => setEditingData(prev => ({ ...prev, [col.column_name]: e.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-danger" onClick={closeEdit}>Отмена</button>
                            <button type="button" className="btn-accent" onClick={submitEdit}>Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
