import React, {useState} from 'react';
import './tableInfo.css';
import '../sidebars/sidebar.css'
import * as api from '../api.js';
import { AddFormReport } from '../addForm/addForm.jsx'; // default export компонента формы отчёта

export default function TableInfo({ tableInfo }) {
    const columns = tableInfo?.rows?.data?.columns || tableInfo?.rows?.columns || [];
    const initialData = Array.isArray(tableInfo?.rows?.data?.data)
        ? tableInfo.rows.data.data
        : (Array.isArray(tableInfo?.rows?.data) ? tableInfo.rows.data : []);
    const tableName = tableInfo.tableName || tableInfo.name;
    const [data] = useState(initialData);
    const [loading, setLoading] = useState(false);

    const formatVal = val => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string' && /\d{4}-\d{2}-\d{2}T/.test(val)) {
            const d = new Date(val);
            return isNaN(d) ? val : d.toLocaleString();
        }
        return String(val);
    };


    const handleDeleteTable = async () => {
        if (!confirm(`Удалить таблицу "${tableName}" ?`)) return;
        try {
            setLoading(true);
            await api.deleteTable(tableName);
            alert (`Таблица удалена`);
            window.location.href = '/tables';
        }   catch (e) {
            alert (e.message || String (e))
        }   finally {setLoading(false);}
    };

    return (
        <div className="table-info">
            <div className="table-info\_\_meta">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Колонки</h3>
                    <div>
                        <AddFormReport tableName={tableName} disabled={loading} />
                        <button type="button" onClick={handleDeleteTable} className="danger" disabled={loading} style={{ marginLeft: 8 }}>
                            Удалить таблицу
                        </button>
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

            <div className="table-info\_\_rows">
                <h3>Данные</h3>
                {data.length === 0 ? (
                    <p className="muted">Нет строк.</p>
                ) : (
                    <div className="rows-table-wrap">
                        <table className="rows-table">
                            <thead>
                            <tr>
                                {columns.map(col => (
                                    <th key={col.column_name}>{col.column_name}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {data.map((row, i) => (
                                <tr key={i}>
                                    {columns.map(col => (
                                        <td key={col.column_name} className={col.data_type.includes('timestamp') ? 'mono small' : 'mono'}>
                                            {formatVal(row[col.column_name])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
