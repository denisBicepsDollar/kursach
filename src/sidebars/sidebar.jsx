import React from 'react';
import AddFormTable from '../addForm/addFormTable.jsx';
import '../index.css';

export default function Sidebar({ items, loading, error,onClickTable }) {
    return (
        <aside className="body">
            <AddFormTable/>
            {loading && <p className="muted">Загрузка...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
                <ul className="body-list-content">
                    {items.length === 0 ? <li className="muted">Таблицы не найдены.</li> :
                        items.map(tableName=> (
                            <li key={tableName}> <button
                                className="btn-outline"
                                onClick={() => onClickTable(tableName)}>
                                {tableName}
                            </button>
                            </li>
                        ))
                    }
                </ul>
            )}
        </aside>
    );
}
