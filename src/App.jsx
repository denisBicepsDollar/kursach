/* ============================================================================
   APP.JSX — ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
   ============================================================================ */

import { useState, useEffect } from 'react';
import * as api from './api.js'
import Sidebar from './sidebars/sidebar';
import TableInfo from './table/tableInfo';

/* ─────────────────────────────────────────────────────────────────────────
   ГЛАВНЫЙ КОМПОНЕНТ APP
   ───────────────────────────────────────────────────────────────────────── */

export default function App() {
    /* ─────────────────────────────────────────────────────────────────────
       СОСТОЯНИЯ КОМПОНЕНТА
       ───────────────────────────────────────────────────────────────────── */

    /* Список всех таблиц из БД */
    const [items, setItems] = useState([]);

    /* Флаг загрузки списка таблиц */
    const [loading, setLoading] = useState(true);

    /* Сообщение об ошибке */
    const [error, setError] = useState(null);

    /* Информация о выбранной таблице (название, строки, отчеты) */
    const [tableInfo, setTableInfo] = useState(null);

    /* Флаг загрузки информации о таблице */
    const [infoLoading, setInfoLoading] = useState(false);

    /* ─────────────────────────────────────────────────────────────────────
       ЭФФЕКТ: ЗАГРУЗКА СПИСКА ТАБЛИЦ ПРИ МОНТИРОВАНИИ
       ───────────────────────────────────────────────────────────────────── */

    useEffect(() => {
        /* Флаг для проверки, был ли компонент размонтирован */
        let mounted = true;

        /* Запрос списка таблиц с API */
        api.getListTables()
            .then(response => {
                /* Проверяем, что компонент еще смонтирован */
                if (!mounted) return;
                setItems(response.data || response);
            })
            .catch(e => {
                /* Установка ошибки только если компонент смонтирован */
                if (mounted) setError(e.message)
            })
            .finally(() => {
                /* Отключение флага загрузки */
                if (mounted) setLoading(false)
            });

        /* Функция очистки: предотвращает утечки памяти */
        return () => {
            mounted = false
        };
    }, []);

    /* ─────────────────────────────────────────────────────────────────────
       ОБРАБОТЧИК: КЛИК ПО ТАБЛИЦЕ В SIDEBAR
       ───────────────────────────────────────────────────────────────────── */

    async function onClickTable(tableName) {
        /* Очистка предыдущей информации */
        setTableInfo(null);
        setInfoLoading(true);
        setError(null);

        try {
            /* Параллельная загрузка данных таблицы и отчетов */
            const rows = await api.getTable(tableName);
            const tableReports = await api.getListReports(tableName);

            /* Установка полной информации о таблице */
            setTableInfo({tableName, rows, tableReports});
        } catch (e) {
            /* Обработка ошибок при загрузке */
            setError(e.message);
        } finally {
            /* Отключение флага загрузки */
            setInfoLoading(false);
        }
    }

    /* ─────────────────────────────────────────────────────────────────────
       РЕНДЕР
       ───────────────────────────────────────────────────────────────────── */

    return (
        <div className="app">
            {/* ───────────────────────────────────────────────────────────
                ШАПКА ПРИЛОЖЕНИЯ
                ─────────────────────────────────────────────────────────── */}
            <header className="header">
                <h1>Таблицы</h1>
            </header>

            {/* ───────────────────────────────────────────────────────────
                ОСНОВНОЙ КОНТЕНТ: БОКОВАЯ ПАНЕЛЬ + ГЛАВНАЯ ОБЛАСТЬ
                ─────────────────────────────────────────────────────────── */}
            <div className="all-Content">
                {/* Боковая панель со списком таблиц */}
                <aside className="sidebar">
                    <Sidebar
                        items={items}
                        loading={loading}
                        error={error}
                        onClickTable={onClickTable}
                    />
                </aside>

                {/* Главная область контента */}
                <main className="main-content">
                    {/* Состояние: загрузка информации о таблице */}
                    {infoLoading && <p className="muted">Загрузка информации...</p>}

                    {/* Состояние: отображение информации о выбранной таблице */}
                    {!infoLoading && tableInfo && (
                        <div className="info">
                            <h2 className="header-title header-left">Информация о таблице:</h2>
                            <TableInfo tableInfo={tableInfo}/>
                        </div>
                    )}

                    {/* Состояние: таблица не выбрана */}
                    {!infoLoading && !tableInfo && <p className="muted">Выберите таблицу слева</p>}
                </main>
            </div>
        </div>
    );
}
