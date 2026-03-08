import React, { useState} from 'react';
import '../index.css';
import './addForm.css'
import * as api from '../api.js'

// Доступные типы данных для колонок таблицы
const DEFAULT_TYPES = ['integer', 'text', 'boolean', 'timestamp', 'date', 'numeric'];


export default function AddFormTable({ disabled }) {
    // Состояние для управления видимостью модального окна
    const [open, setOpen] = useState(false);

    // Состояние названия таблицы
    const [tableName, setTableName] = useState('');

    // Состояние массива колонок с их свойствами
    const [cols, setCols] = useState([{ name: '', type: 'text', nullable: false, defaultValue: ''}]);

    // Состояние для отображения ошибок
    const [error, setError] = useState(null);

    // Состояние для отслеживания процесса создания таблицы
    const [loading, setLoading] = useState(false);

    // Обновляет свойства колонки по индексу
    const updateCol = (index, patch) =>
        setCols(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

    // Добавляет новую пустую колонку в конец списка
    const addCol = () =>
        setCols(prev => [
            ...prev,
            { name: '', type: 'text', nullable: false, defaultValue: '' },
        ]);

    // Удаляет колонку по индексу
    const removeCol = index => setCols(prev => prev.filter((_, i) => i !== index));

    // Открывает модальное окно и очищает ошибки
    const openModal = () => {
        setError(null);
        setOpen(true);
    };

    // Сбрасывает форму в исходное состояние
    const resetForm = () => {
        setTableName('');
        setCols([{ name: '', type: 'text', nullable: false, defaultValue: '' }]);
        setError(null);
    };

    // Закрывает модальное окно (если не идёт загрузка) и сбрасывает форму
    const closeModal = () => {
        if (loading) return;
        setOpen(false);
        resetForm();
    };

    // Обработчик отправки формы для создания таблицы
    const submit = async () => {
        setError(null);

        // Валидация: проверка названия таблицы
        if (!tableName.trim()) return setError('Введите имя таблицы');

        // Валидация: проверка, что все колонки имеют имена
        if (cols.some(c => !c.name.trim())) return setError('Все колонки должны иметь имя');

        // Формируем объект с данными таблицы
        const payload = {
            tableName: tableName.trim(),
            columns: cols.map(c => ({
                name: c.name.trim(),
                type: c.type,
                nullable: c.nullable,
                default: c.defaultValue || null,
            })),
        };

        setLoading(true);
        try {
            // Отправляем запрос на создание таблицы
            const result = await api.postCreateTable(payload);

            // Получаем ID созданной таблицы
            const id = result?.data?.id || payload.tableName;

            // Перенаправляем на страницу новой таблицы
            window.location.href = `/tables/${encodeURIComponent(id)}`;
        } catch (e) {
            // Обрабатываем ошибку и отображаем сообщение пользователю
            setError(e?.message || (e?.payload && (e.payload.error || e.payload.message)) || 'Ошибка создания');
            setLoading(false);
        }
    };

    return (
        <>
            {/* Кнопка для открытия модального окна создания таблицы */}
            <button
                className="btn-accent"
                style={{width : '88%', marginLeft : '17px', marginTop : '20px'}}
                type="button"
                onClick={openModal}
                disabled={disabled}
                aria-haspopup="dialog"
            >
                Создать таблицу
            </button>

            {/* Модальное окно для создания таблицы */}
            {open && (
                <div className="af__overlay" role="dialog" aria-modal="true">
                    <div className="af__modal">

                        {/* Заголовок модального окна */}
                        <div className="af__header">
                            <div className="af__header-left">
                                <span className="af__header-title">Новая таблица</span>
                            </div>
                        </div>

                        {/* Основное содержимое модального окна */}
                        <div className="af__body">

                            {/* Поле ввода названия таблицы */}
                            <div className="af__field-row">
                                <label className="af__label">Имя таблицы</label>
                                <input
                                    id="af-table-name"
                                    className="af__input"
                                    placeholder="Имя таблицы"
                                    value={tableName}
                                    onChange={e => setTableName(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* Секция для управления колонками */}
                            <div className="af__col-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                <div className="af__cols-title">Колонки</div>

                                {/* Список колонок с полями для редактирования */}
                                {cols.map((c, i) => (
                                    <div className="af__col" data-index={i} key={i} style={{ display: 'flex',alignItems: 'center', gap: '8px',width: '100%', minWidth: 0 }}>
                                        {/* Поле для имени колонки */}
                                        <input
                                            className="af__input"
                                            style={{ flex: 1, minWidth: 0 }}
                                            placeholder="column_name"
                                            aria-label={`Имя колонки ${i + 1}`}
                                            value={c.name}
                                            onChange={e => updateCol(i, { name: e.target.value })}
                                            disabled={loading}
                                        />

                                        {/* Выпадающий список для выбора типа данных */}
                                        <select
                                            className="af__input"
                                            style={{ flex: '0 0 100px' }}
                                            aria-label={`Тип колонки ${i + 1}`}
                                            value={c.type}
                                            onChange={e => updateCol(i, { type: e.target.value })}
                                            disabled={loading}
                                        >
                                            {DEFAULT_TYPES.map(t => <option value={t} key={t}>{t}</option>)}
                                        </select>

                                        {/* Поле для значения по умолчанию */}
                                        <input
                                            className="af__input"
                                            style={{ flex: 1, minWidth: 0 }}
                                            placeholder="default"
                                            aria-label={`Значение по умолчанию колонки ${i + 1}`}
                                            value={c.defaultValue}
                                            onChange={e => updateCol(i, { defaultValue: e.target.value })}
                                            disabled={loading}
                                        />

                                        {/* Чекбокс для свойства nullable */}
                                        <label className="af__checkbox-inline" style={{ flex: '0 0 auto', fontSize: '16px'}}>
                                            <input
                                                type="checkbox"
                                                aria-label={`Nullable колонки ${i + 1}`}
                                                checked={c.nullable}
                                                onChange={e => updateCol(i, { nullable: e.target.checked })}
                                                disabled={loading}
                                            />
                                            nullable
                                        </label>

                                        {/* Кнопка для удаления колонки */}
                                        <button
                                            className="af__icon-btn--del"
                                            style={{ flex: '0 0 auto'}}
                                            type="button"
                                            aria-label={`Удалить колонку ${i + 1}`}
                                            onClick={() => removeCol(i)}
                                            disabled={loading || cols.length === 1}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                {/* Кнопка для добавления новой колонки */}
                                <button
                                    className="af__add-btn"
                                    style={{ alignSelf: 'flex-start' }}
                                    type="button"
                                    onClick={addCol}
                                    disabled={loading}
                                >
                                    Добавить колонку
                                </button>
                            </div>

                            {/* Отображение ошибок, если они есть */}
                            {error ? <div className="af__error" role="alert">{error}</div> : null}

                            {/* Кнопки действий (создать и отмена) */}
                            <div className="af__footer">
                                <button
                                    className="af__btn-submit"
                                    type="button"
                                    onClick={submit}
                                    disabled={loading}
                                    aria-disabled={loading}
                                >
                                    {loading ? 'Создаю...' : 'Создать'}
                                </button>
                                <button className="af__btn-cancel" type="button" onClick={closeModal} disabled={loading}>
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Полупрозрачный фон для закрытия модального окна */}
                    <div className="af__backdrop" onClick={closeModal} />
                </div>
            )}
        </>
    );
}
