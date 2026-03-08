import React, { useState, useMemo, useEffect } from 'react';
import '../index.css';
import * as api from '../api';
import SidebarTable from "../sidebars/sideBarTable.jsx";
import * as form from "../addForm/addFormRow.jsx";

// Основной компонент для отображения и управления табличными данными
export default function TableInfo({ tableInfo }) {
    // Извлечение информации о колонках из различных возможных структур данных
    const columns = tableInfo?.rows?.data?.columns || tableInfo?.rows?.columns || [];
    // Получение сырых данных строк из разных форматов ответа API
    const raw = tableInfo?.rows?.data ?? tableInfo?.rows ?? {};

    // Функция нормализации различных форматов входных данных в единый массив
    function normalizeData(input) {
        // Если уже массив, вернуть как есть
        if (Array.isArray(input)) return input;
        // Если пусто или не объект, вернуть пустой массив
        if (!input || typeof input !== 'object') return [];
        // Если объект содержит свойство data с массивом, вернуть его
        if (Array.isArray(input.data)) return input.data;
        // Проверка на объект с индексированными ключами (0, 1, 2...)
        if (input['0'] !== undefined) {
            const v = input['0'];
            // Если первый элемент - массив, вернуть его
            if (Array.isArray(v)) return v;
            // Если объект, вернуть его в массиве
            if (v && typeof v === 'object') return [v];
            return [];
        }
        // Если объект имеет ключи, вернуть его значения как массив
        return Object.keys(input).length ? Object.values(input) : [];
    }

    // Нормализованные сырые данные
    const initialDataRaw = normalizeData(raw);

    // Добавление уникального локального идентификатора к каждой строке для отслеживания
    const initialData = useMemo(() => {
        return initialDataRaw.map((r, idx) => ({ ...r, _localId: idx }));
    }, [initialDataRaw]);

    // Получение имени таблицы из объекта с информацией
    const tableName = tableInfo.tableName || tableInfo.name;
    // Состояние для хранения текущих данных таблицы
    const [data, setData] = useState(initialData);
    // Флаг загрузки (не используется в текущей версии, но оставлен для расширения)
    const [loading] = useState(false);

    // Состояние для отслеживания редактируемой строки
    const [editingRow, setEditingRow] = useState(null);
    // Состояние для хранения значений редактируемой строки
    const [editingData, setEditingData] = useState({});

    // Функция форматирования значений для отображения в таблице
    const formatVal = val => {
        // Замена null/undefined на строку NULL
        if (val === null || val === undefined) return 'NULL';
        // Проверка и форматирование ISO дат в локальный формат
        if (typeof val === 'string' && /\d{4}-\d{2}-\d{2}T/.test(val)) {
            const d = new Date(val);
            return isNaN(d) ? val : d.toLocaleString();
        }
        // Преобразование любого значения в строку
        return String(val);
    };

    // Функция определения фильтра для идентификации строки при запросе к API
    function getFilterForRow(row, columnsList) {
        // Приоритет 1: использовать id если существует
        if (row.id !== undefined) return { col: 'id', val: row.id };
        // Приоритет 2: найти первую непустую колонку для фильтрации
        for (const c of columnsList) {
            const name = c.column_name;
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return { col: name, val: row[name] };
            }
        }
        // Приоритет 3: использовать локальный идентификатор как последний вариант
        return { col: 'id', val: row._localId };
    }

    // Обработчик удаления строки из таблицы
    const handleDelete = async (localId) => {
        // Запрос подтверждения от пользователя
        const ok = window.confirm('Удалить эту строку?');
        if (!ok) return;
        // Поиск строки для удаления по локальному идентификатору
        const rowToDelete = data.find(r => r._localId === localId);
        if (!rowToDelete) return alert('Строка не найдена');
        // Определение фильтра для API запроса
        const { col: filterColumn, val: filterValue } = getFilterForRow(rowToDelete, columns);

        try {
            // Отправка запроса на удаление на сервер
            await api.deleteRow(tableName, filterColumn, encodeURIComponent(String(filterValue)));
            // Обновление локального состояния: удаление строки и переиндексация
            setData(prev => prev
                .filter(r => r._localId !== localId)
                .map((r, i) => ({ ...r, _localId: i }))
            );
        } catch (err) {
            // Логирование ошибки и оповещение пользователя
            console.error('Delete failed', err);
            alert('Не удалось удалить строку.');
        }
    };

    // Обработчик создания новой строки в таблице
    const handleCreate = (newRow) => {
        // Извлечение данных строки из различных форматов ответа
        const serverRow = newRow && newRow.data && Array.isArray(newRow.data) ? newRow.data[0] : newRow;
        // Вычисление следующего локального идентификатора
        const nextId = data.length ? Math.max(...data.map(d => d._localId)) + 1 : 0;
        // Добавление локального идентификатора к новой строке
        const withLocal = { ...serverRow, _localId: nextId };
        // Обновление состояния и переиндексация локальных идентификаторов
        setData(prev => [...prev, withLocal].map((r, i) => ({ ...r, _localId: i })));
    };

    // Открытие модального окна редактирования для выбранной строки
    const openEdit = (row) => {
        setEditingRow(row);
        // Создание копии строки для редактирования
        setEditingData({ ...row });
    };

    // Закрытие модального окна редактирования
    const closeEdit = () => {
        setEditingRow(null);
        setEditingData({});
    };

    // Обработчик отправки отредактированных данных на сервер
    const submitEdit = async () => {
        if (!editingRow) return;
        // Определение фильтра для идентификации строки при обновлении
        const { col: filterColumn, val: filterValue } = getFilterForRow(editingRow, columns);

        // Построение payload содержащего только реальные колонки таблицы
        const payload = {};
        for (const c of columns) {
            const name = c.column_name;
            // Включение только измененных значений в payload
            if (editingData[name] !== undefined) payload[name] = editingData[name];
        }

        try {
            // Отправка запроса на обновление строки на сервер
            const res = await api.putReplaceRow(tableName, filterColumn, encodeURIComponent(String(filterValue)), payload);
            // Извлечение обновленных данных из ответа сервера
            const updated = (res && res.data && res.data[0]) ? res.data[0] : payload;
            // Обновление локального состояния с новыми данными
            setData(prev => prev.map(r => (r._localId === editingRow._localId ? { ...updated, _localId: r._localId } : r)));
            // Закрытие модального окна после успешного обновления
            closeEdit();
        } catch (err) {
            // Логирование ошибки и оповещение пользователя
            console.error('Replace failed', err);
            alert('Не удалось обновить строку.');
        }
    };

    // Состояние для хранения списка отчетов
    const [reports, setReports] = useState([]);
    // Флаг загрузки отчетов
    const [reportsLoading, setReportsLoading] = useState(false);

    // Функция загрузки списка отчетов с сервера
    const loadReports = async () => {
        setReportsLoading(true);
        try {
            // Запрос списка отчетов для текущей таблицы
            const res = await api.getListReports(tableName);
            // Адаптация различных форматов ответа к единому массиву
            setReports(Array.isArray(res) ? res : (res.data || []));
        } catch (err) {
            // Логирование ошибки и оповещение пользователя
            console.error('Load reports failed', err);
            alert('Не удалось загрузить отчёты.');
        } finally {
            // Завершение загрузки независимо от результата
            setReportsLoading(false);
        }
    };

    // Загрузка отчетов при монтировании компонента или изменении имени таблицы
    useEffect(() => { loadReports(); }, [tableName]);

    // Функция удаления отчета с сервера
    const removeReport = async (id) => {
        // Запрос подтверждения от пользователя перед удалением
        if (!window.confirm('Удалить отчёт?')) return;
        try {
            // Отправка запроса на удаление отчета
            await api.deleteReport(tableName, id);
            // Обновление локального состояния: удаление отчета из списка
            setReports(prev => prev.filter(r => r.id !== id && r.reportId !== id));
        } catch (err) {
            // Логирование ошибки и оповещение пользователя
            console.error('Delete report failed', err);
            alert('Не удалось удалить отчёт.');
        }
    };

    // Функция проверки статуса выполнения отчета
    const checkStatus = async (reportId) => {
        try {
            // Запрос статуса отчета с сервера
            const s = await api.getStatusReport(tableName, reportId);
            // Отображение полученного статуса пользователю
            alert(JSON.stringify(s));
        } catch (err) {
            // Логирование ошибки и оповещение пользователя
            console.error('Status failed', err);
            alert('Не удалось получить статус.');
        }
    };

    // Функция загрузки и сохранения отчета на локальный компьютер
    const downloadReport = async (id) => {
        try {
            // Запрос скачивания отчета с сервера
            const res = await api.getDownloadReport(tableName, id);
            // Определение типа контента из заголовков ответа
            const ct = res.headers.get('content-type') || '';
            // Обработка JSON ответа (может содержать URL для скачивания)
            if (ct.includes('application/json')) {
                const j = await res.json();
                // Если JSON содержит URL, открыть его в новой вкладке
                if (j.url) { window.open(j.url, '_blank'); return; }
                // Иначе отобразить JSON ответ
                alert('Ответ JSON: ' + JSON.stringify(j));
                return;
            }
            // Обработка бинарного файла (документ, архив и т.д.)
            const blob = await res.blob();
            // Извлечение имени файла из заголовка Content-Disposition
            const filename = (() => {
                const cd = res.headers.get('content-disposition') || '';
                // Попытка получить имя файла из UTF-8 кодированного заголовка
                const m = /filename\*=UTF-8''([^;]+)/.exec(cd) || /filename="([^"]+)"/.exec(cd);
                // Использование извлеченного имени или генерирование по умолчанию
                return (m && decodeURIComponent(m[1])) || `${tableName}-${id}`;
            })();
            // Создание объекта URL для blob данных
            const url = URL.createObjectURL(blob);
            // Создание временного элемента ссылки для скачивания
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            // Добавление ссылки в DOM и имитация клика для скачивания
            document.body.appendChild(a);
            a.click();
            // Очистка: удаление ссылки из DOM и освобождение памяти
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            // Логирование ошибки и оповещение пользователя с деталями
            console.error('Download failed', err);
            alert('Не удалось скачать отчёт: ' + (err.message || err));
        }
    };

    return (
        <>
            <h2 className="header-title">{tableName}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px 0' }}>

                {/* КОЛОНКИ */}
                <div className="body-content" style={{ gap: '0' }}>
                    {/* Заголовок секции + кнопка действий над таблицей */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px', marginBottom: '12px' }}>
                        <h3 className="body-content-title" style={{ padding: 0, margin: 0, background: 'none', border: 'none', textAlign: 'left' }}>
                            Колонки
                        </h3>
                        {/* Кнопка сайдбара — перезагружает отчёты после действия */}
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

                    {/* Таблица колонок с их типами, nullable и дефолтными значениями */}
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
                                    {/* Бейдж: зелёный если nullable, красный если нет */}
                                    <td style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '12px', background: col.is_nullable === 'YES' ? '#d1fae5' : '#ffe6ed', color: col.is_nullable === 'YES' ? '#047857' : '#d63855', fontWeight: 600 }}>
                                        {col.is_nullable === 'YES' ? 'Да' : 'Нет'}
                                    </span>
                                    </td>
                                    {/* Если дефолтного значения нет — показываем тире */}
                                    <td style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#777' }}>{col.column_default ?? '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ДАННЫЕ */}
                <div className="body-content" style={{ gap: '0' }}>
                    <h3 className="body-content-title" style={{ marginBottom: '12px' }}>Данные</h3>

                    {/* Если данных нет — сразу показываем форму добавления */}
                    {data.length === 0 ? (
                        <form.AddFormRow
                            tableName={tableName}
                            cols={columns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES', default: c.column_default ?? '' }))}
                            onCreate={handleCreate}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Таблица строк с кнопками редактирования и удаления */}
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
                                            {/* Ячейки строки — timestamp рендерится мельче */}
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
                            {/* Форма добавления новой строки под таблицей */}
                            <form.AddFormRow
                                tableName={tableName}
                                cols={columns.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES', default: c.column_default ?? '' }))}
                                onCreate={handleCreate}
                            />
                        </div>
                    )}
                </div>

                {/* ОТЧЁТЫ */}
                <div className="body-content" style={{ gap: '0' }}>
                    <h3 className="body-content-title" style={{ marginBottom: '12px' }}>Отчёты</h3>

                    {/* Спиннер на время загрузки отчётов */}
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
                                            {/* Цветной бейдж статуса: зелёный/красный/жёлтый */}
                                            <td style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                                                background: r.status === 'done' || r.status === 'completed' ? '#d1fae5' : r.status === 'error' ? '#ffe6ed' : '#fef3c7',
                                                color: r.status === 'done' || r.status === 'completed' ? '#047857' : r.status === 'error' ? '#d63855' : '#d97706'
                                            }}>
                                                {r.status ?? r.state ?? '—'}
                                            </span>
                                            </td>
                                            {/* Дата создания — поддерживаем несколько вариантов поля */}
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

            {/* МОДАЛКА РЕДАКТИРОВАНИЯ строки */}
            {editingRow && (
                /* Полупрозрачный оверлей на весь экран */
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        <h4 style={{ margin: '0 0 20px', fontFamily: 'Helvetica Neue', fontSize: '18px', color: '#333' }}>Редактировать строку</h4>
                        {/* Инпут для каждой колонки редактируемой строки */}
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
                        {/* Кнопки отмены и сохранения */}
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
