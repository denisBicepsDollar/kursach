import React, { useState } from 'react';
import { AddFormReport } from '../addForm/addFormReport.jsx';
import * as api from '../api.js';
import '../index.css';

// Компонент боковой панели для управления таблицей
export default function SidebarTable({ tableName, onActionComplete}) {
    // Состояние для отслеживания процесса удаления таблицы
    const [loading, setLoading] = useState(false);

    // Обработчик удаления таблицы с подтверждением пользователя
    const handleDeleteTable = async () => {
        // Проверка, выбрана ли таблица
        if (!tableName) {
            alert('Таблица не выбрана');
            return;
        }

        // Запрос подтверждения перед удалением
        if (!confirm(`Удалить таблицу "${tableName}" ?`)) return;

        try {
            // Устанавливаем флаг загрузки
            setLoading(true);

            // Отправляем запрос на удаление таблицы
            await api.deleteTable(tableName);

            // Информируем пользователя об успешном удалении
            alert('Таблица удалена');

            // Перенаправляем на страницу со списком таблиц
            window.location.href = '/tables';
        } catch (e) {
            // Отображаем сообщение об ошибке
            alert(e?.message || String(e));
        } finally {
            // Сбрасываем флаг загрузки в любом случае
            setLoading(false);
        }
    };

    return (
        <div className="body-content" style={{ padding: '0px' }}>
            {/* Форма для добавления отчёта к таблице */}
            <AddFormReport tableName={tableName} onCreate={onActionComplete} />

            {/* Кнопка удаления таблицы */}
            <button
                type="button"
                onClick={handleDeleteTable}
                className="btn-danger"
                disabled={loading || !tableName}
            >
                {loading ? 'Удаление...' : 'Удалить таблицу'}
            </button>
        </div>
    );
}
