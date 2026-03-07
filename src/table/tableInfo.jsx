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
            const res = await api.putreplaceRow(tableName, filterColumn, encodeURIComponent(String(filterValue)), payload);
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
        <div className="table-info">
            <div className="table-info__meta">
                <div className="table-header">
                    <h3 className="table-header__title">{tableName}</h3>
                </div>
                <div className="table-header">
                    <h3 className="table-header__subtitle">Колонки</h3>
                        <div>
                            <SidebarTable
                                tableName={tableName}
                                disabled={loading}
                                onClickTable={() => { }}
                                onActionComplete={async () => {
                                    setReportsLoading(true);
                                try {
                                    await loadReports(tableName);
                                } finally {
                                    setReportsLoading(false);
                                }
                              }}
                            />
                        </div>
                </div>

                <table className="meta-table">
                    <thead>
                    <tr>
                        <th>Имя</th>
                        <th>Тип</th>
                        <th>Nullable</th>
                        <th>По умолчанию</th>
                    </tr>
                    </thead>
                    <tbody>
                    {columns.map(col => (
                        <tr key={col.column_name}>
                            <td className="mono">{col.column_name}</td>
                            <td>{col.data_type}</td>
                            <td>{col.is_nullable === 'YES' ? 'Да' : 'Нет'}</td>
                            <td className="mono">{col.column_default ?? '—'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="table-info__rows">
                <h3 className="table-header__subtitle__sub">Данные</h3>
                {data.length === 0 ? (
                    <form.AddFormRow
                        tableName={tableName}
                        cols={columns.map(c => ({
                            name: c.column_name,
                            type: c.data_type,
                            nullable: c.is_nullable === 'YES',
                            default: c.column_default ?? ''
                        }))}
                        onCreate={handleCreate}
                    />
                ) : (
                    <div className="rows-table-wrap">
                        <table className="rows-table">
                            <thead>
                            <tr>
                                {columns.map(col => (
                                    <th key={col.column_name}>{col.column_name}</th>
                                ))}
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.map(row => {
                                const localId = row._localId;
                                return (
                                    <tr key={localId}>
                                        {columns.map(col => (
                                            <td key={col.column_name} className={col.data_type.includes('timestamp') ? 'mono small' : 'mono'}>
                                                <div className="cell-content">
                                                    {formatVal(row[col.column_name])}
                                                </div>
                                            </td>
                                        ))}
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => openEdit(row)}
                                                className="btn btn-warning"
                                            >
                                                Заменить
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(localId)}
                                                className="btn btn-danger"
                                            >
                                                Удалить
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                        <form.AddFormRow
                            tableName={tableName}
                            cols={columns.map(c => ({
                                name: c.column_name,
                                type: c.data_type,
                                nullable: c.is_nullable === 'YES',
                                default: c.column_default ?? ''
                            }))}
                            onCreate={handleCreate}
                        />
                    </div>
                )}
            </div>

            <div className="table-info__reports">
                <h3 className="table-header__subtitle__sub">Отчёты</h3>

                {reportsLoading ? (
                    <div>Загрузка...</div>
                ) : (
                    <table className="rows-table">
                        <thead>
                        <tr>
                            <th>id</th>
                            <th>Заголовок</th>
                            <th>Статус</th>
                            <th>Создан</th>
                            <th>Действия</th>
                        </tr>
                        </thead>
                        <tbody>
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={5}>Нет отчётов</td>
                            </tr>
                        ) : (
                            reports.map(r => (
                                <tr key={r.id ?? r.reportId}>
                                    {/* Изменение 1: оборачиваем id */}
                                    <td className="mono">
                                        <div className="cell-content">
                                            {r.id ?? r.reportId}
                                        </div>
                                    </td>

                                    {/* Изменение 2: оборачиваем заголовок */}
                                    <td>
                                        <div className="cell-content">
                                            {r.title ?? r.name ?? '—'}
                                        </div>
                                    </td>

                                    {/* Изменение 3: оборачиваем статус */}
                                    <td>
                                        <div className="cell-content">
                                            {r.status ?? r.state ?? '—'}
                                        </div>
                                    </td>

                                    {/* Изменение 4: оборачиваем дату (самая частая проблема с длинными ISO-строками) */}
                                    <td className="mono">
                                        <div className="cell-content">
                                            {r.createdAt ?? r.created_at ?? r.created ?? '—'}
                                        </div>
                                    </td>

                                    <td className="row-actions">
                                        <button
                                            type="button"
                                            className="btn-accent2"
                                            onClick={() => downloadReport(r.id ?? r.reportId)}
                                        >
                                            Скачать
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            onClick={() => checkStatus(r.id ?? r.reportId)}
                                        >
                                            Статус
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => removeReport(r.id ?? r.reportId)}
                                        >
                                            Удалить
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                )}
            </div>



            {editingRow && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h4>Редактировать строку</h4>
                        <div>
                            {columns.map(col => {
                                const name = col.column_name;
                                return (
                                    <div key={name} style={{ marginBottom: 12 }}>
                                        <label className="label">{name}</label>
                                        <input
                                            className="pole-put"
                                            value={editingData[name] ?? ''}
                                            onChange={e => setEditingData(prev => ({ ...prev, [name]: e.target.value }))}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-danger btn-sm" onClick={closeEdit}>Отмена</button>
                            <button type="button" className="btn btn-accent btn-sm" onClick={submitEdit}>Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
