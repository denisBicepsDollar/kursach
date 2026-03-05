import React from 'react';
import AddFormTable from '../addForm/addForm.jsx';
import './sidebar.css';

export default function Sidebar({ items, loading, error, onCreate, onClickTable }) {
    return (
        <aside className="sidebar">
            <AddFormTable onCreate={onCreate} />
            {loading && <p className="muted">Загрузка...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
                <ul className="table-list">
                    {items.length === 0 ? <li className="muted">Таблицы не найдены.</li> :
                        items.map(name => (
                            <li key={name} className="table-list__item" onClick={() => onClickTable(name)} role="button" tabIndex={0}>{name}</li>
                        ))
                    }
                </ul>
            )}
        </aside>
    );
}
