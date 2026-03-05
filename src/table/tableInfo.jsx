import React, { useState, useMemo } from 'react';
import './tableInfo.css';
import '../sidebars/sidebar.css';
import * as api from '../api';
import SidebarTable from "../sidebars/sideBarTable.jsx";
import * as form from "../addForm/addForm.jsx";

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
        const nextId = data.length ? Math.max(...data.map(d => d._localId)) + 1 : 0;
        const withLocal = { ...newRow, _localId: nextId };
        setData(prev => [withLocal, ...prev].map((r, i) => ({ ...r, _localId: i })));
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
        try {
            const res = await api.replaceRow(tableName, filterColumn, encodeURIComponent(String(filterValue)), editingData);
            // обновляем локально: берем возвращённые данные если есть, иначе editingData
            const updated = (res && res.data && res.data[0]) ? res.data[0] : editingData;
            setData(prev => prev.map(r => (r._localId === editingRow._localId ? { ...updated, _localId: r._localId } : r)));
            closeEdit();
        } catch (err) {
            console.error('Replace failed', err);
            alert('Не удалось обновить строку.');
        }
    };

    return (
        <div className="table-info">
            <div className="table-info__meta">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Колонки</h3>
                    <div>
                        <SidebarTable tableName={tableName} disabled={loading} onClickTable={() => { }} />
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
                <h3>Данные</h3>
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
                                                {formatVal(row[col.column_name])}
                                            </td>
                                        ))}
                                        <td>
                                            <button type="button" onClick={() => openEdit(row)}>Заменить</button>
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
                    </div>
                )}
            </div>

            {editingRow && (
                <div className="modal-overlay" style={modalOverlayStyle}>
                    <div className="modal" style={modalStyle}>
                        <h4>Редактировать строку</h4>
                        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                            {columns.map(col => {
                                const name = col.column_name;
                                return (
                                    <div key={name} style={{ marginBottom: 8 }}>
                                        <label style={{ display: 'block', fontSize: 12 }}>{name}</label>
                                        <input
                                            style={{ width: '100%' }}
                                            value={editingData[name] ?? ''}
                                            onChange={e => setEditingData(prev => ({ ...prev, [name]: e.target.value }))}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={closeEdit}>Отмена</button>
                            <button type="button" onClick={submitEdit}>Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// простые inline стили для модалки (можно вынести в CSS)
const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
};
const modalStyle = {
    background: '#fff', padding: 16, borderRadius: 6, width: '600px', maxWidth: '95%'
};
