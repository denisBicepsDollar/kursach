import React from 'react';
import AddFormTable from '../addForm/addFormTable.jsx';
import '../index.css';

// Компонент боковой панели со списком таблиц
export default function Sidebar({ items, loading, error, onClickTable }) {
    return (
        <aside className="body">
            {/* Форма для добавления новой таблицы */}
            <AddFormTable/>

            {/* Индикатор загрузки */}
            {loading && <p className="muted">Загрузка...</p>}

            {/* Сообщение об ошибке */}
            {error && <p className="error">{error}</p>}

            {/* Список таблиц (отображается только после загрузки и без ошибок) */}
            {!loading && !error && (
                <ul className="body-list-content">
                    {items.length === 0 ? (
                        // Сообщение, если таблицы не найдены
                        <li className="muted">Таблицы не найдены.</li>
                    ) : (
                        // Отображаем каждую таблицу как кнопку в списке
                        items.map(tableName => (
                            <li key={tableName}>
                                <button
                                    className="btn-outline"
                                    onClick={() => onClickTable(tableName)}
                                >
                                    {tableName}
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </aside>
    );
}
