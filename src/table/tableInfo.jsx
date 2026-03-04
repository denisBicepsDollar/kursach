import React from 'react';
import './tableInfo.css';

export default function TableInfo({ tableInfo }) {
    if (!tableInfo || !tableInfo.data) return null;

    const { columns = [], data = [] } = tableInfo.data;

    const formatVal = val => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string' && /\d{4}-\d{2}-\d{2}T/.test(val)) {
            const d = new Date(val);
            return isNaN(d) ? val : d.toLocaleString();
        }
        return String(val);
    };

    return (
        <div className="table-info">

            <div className="table-info__meta">
                <h3>Колонки</h3>
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
