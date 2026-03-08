import React, { useState } from "react";
import * as api from "../api.js";

// Компонент формы для добавления новой строки в таблицу
export function AddFormRow({ tableName = '', disabled = false, onCreate, cols = [] }) {
    // Состояние видимости модального окна
    const [open, setOpen] = useState(false);

    // Состояние процесса создания строки
    const [loading, setLoading] = useState(false);

    // Состояние значений полей формы
    const [values, setValues] = useState({});

    // Состояние для отображения ошибок
    const [error, setError] = useState(null);

    // Открывает модальное окно и инициализирует значения по умолчанию
    const openModal = () => {
        setError(null);
        const init = {};
        // Заполняем начальные значения из значений по умолчанию колонок
        for (const c of cols) init[c.name] = c.default ?? '';
        setValues(init);
        setOpen(true);
    };

    // Закрывает модальное окно (если не идёт загрузка)
    const closeModal = () => { if (loading) return; setOpen(false); setError(null); };

    // Обновляет значение конкретного поля
    const updateValue = (key, val) => setValues(v => ({ ...v, [key]: val }));

    // Преобразует строковое значение в нужный тип данных
    const parseValueByType = (type, raw) => {
        const s = typeof raw === 'string' ? raw.trim() : raw;

        // Пустое значение остаётся пустым
        if (s === '') return s;

        try {
            // Попытка распарсить JSON
            if (type === 'json' || (typeof s === 'string' && ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))))) return JSON.parse(s);
        } catch {}

        // Преобразование в число
        if (type === 'number' || type === 'int' || type === 'float') {
            const n = Number(s);
            return Number.isFinite(n) ? n : raw;
        }

        // Преобразование в булево значение
        if (type === 'boolean') {
            if (s === 'true') return true;
            if (s === 'false') return false;
        }

        // Преобразование в массив, если строка содержит запятые
        if (typeof s === 'string' && s.includes(',')) return s.split(',').map(x => x.trim());

        // Возвращаем исходное значение, если преобразование не требуется
        return raw;
    };

    // Проверяет корректность заполнения обязательных полей
    const validate = () => {
        for (const c of cols) {
            const val = values[c.name];
            const empty = val === '' || val === null || typeof val === 'undefined';
            // Если поле не nullable и пусто, возвращаем ошибку
            if (!c.nullable && empty) return `Поле "${c.name}" обязательно`;
        }
        return null;
    };

    // Обработчик отправки формы
    const submit = async () => {
        setError(null);

        // Проверка наличия названия таблицы
        if (!tableName?.trim()) { setError('Требуется имя таблицы'); return; }

        // Валидация полей
        const vErr = validate();
        if (vErr) { setError(vErr); return; }

        // Формируем объект с преобразованными значениями
        const payload = {};
        for (const c of cols) {
            const raw = values[c.name];
            const empty = raw === '' || raw === null || typeof raw === 'undefined';
            // Если поле пусто и nullable, устанавливаем null, иначе преобразуем значение
            payload[c.name] = empty ? (c.nullable ? null : raw) : parseValueByType(c.type, raw);
        }

        setLoading(true);
        try {
            // Отправляем запрос на создание строки
            const res = await api.postCreateRow(tableName, payload);

            // Вызываем callback функцию, если она передана
            if (onCreate) onCreate(res);

            // Информируем пользователя об успехе
            alert(`Строка создана: ${res?.id ?? JSON.stringify(res)}`);
            setOpen(false);
        } catch (e) {
            // Отображаем ошибку
            setError(e?.message || String(e));
        } finally {
            // Сбрасываем флаг загрузки
            setLoading(false);
        }
    };

    // Возвращает подсказку-плейсхолдер в зависимости от типа колонки
    const getPlaceholder = (c) => {
        if (c.type === 'json') return '{ "key": "value" }';
        if (c.type === 'boolean') return 'true / false';
        if (c.type === 'int' || c.type === 'float' || c.type === 'number') return '0';
        return '';
    };

    return (
        <>
            {/* Кнопка для открытия модального окна создания строки */}
            <button
                type="button"
                onClick={openModal}
                disabled={disabled || !tableName || !cols.length}
                className="af__add-btn"
            >
                + Создать строку
            </button>

            {/* Модальное окно */}
            {open && (
                <div className="af__overlay">
                    {/* Полупрозрачный фон для закрытия модального окна */}
                    <div className="af__backdrop" onClick={closeModal} />

                    {/* Основное содержимое модального окна */}
                    <div className="af__modal" role="dialog" aria-modal="true" aria-label="Создать строку">

                        {/* Заголовок модального окна с названием таблицы */}
                        <div className="af__header">
                            <div className="af__header-left">
                                <span className="af__header-title">Новая строка</span>
                                <span className="af__header-table-title">{tableName}</span>
                            </div>
                            {/* Кнопка закрытия модального окна */}
                            <button className="af__close" onClick={closeModal} aria-label="Закрыть" disabled={loading}>×</button>
                        </div>

                        {/* Основная часть с полями формы */}
                        <div className="af__body">
                            <div className="af__section">
                                <div className="af__section-header" style={{ cursor: 'default' }}>
                                    <span className="af__section-title">Поля</span>
                                </div>

                                {/* Список полей для заполнения */}
                                <div className="af__section-body">
                                    {cols.map((c) => (
                                        <div key={c.name} className="af__field">
                                            {/* Метаинформация о поле (имя, тип, обязательность) */}
                                            <div className="af__row">
                                                <label className="af__label af__label--sm" htmlFor={`col-${c.name}`}>
                                                    {c.name}
                                                </label>
                                                <span className="af__hint" style={{ fontSize: 10 }}>
                                                    {c.type}
                                                </span>
                                                {!c.nullable
                                                    ? <span style={{ color: 'var(--af-danger)', fontSize: 10, marginLeft: 2 }}>required</span>
                                                    : <span className="af__hint" style={{ fontSize: 10 }}>nullable</span>
                                                }
                                            </div>

                                            {/* Выпадающий список для булевых значений, текстовое поле для остального */}
                                            {c.type === 'boolean' ? (
                                                <select
                                                    id={`col-${c.name}`}
                                                    className="af__input"
                                                    value={values[c.name]}
                                                    onChange={e => updateValue(c.name, e.target.value)}
                                                    disabled={loading}
                                                >
                                                    {c.nullable && <option value="">— null —</option>}
                                                    <option value="true">true</option>
                                                    <option value="false">false</option>
                                                </select>
                                            ) : (
                                                <input
                                                    id={`col-${c.name}`}
                                                    className="af__input"
                                                    value={values[c.name] ?? ''}
                                                    onChange={e => updateValue(c.name, e.target.value)}
                                                    disabled={loading}
                                                    placeholder={getPlaceholder(c)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Отображение ошибок, если они есть */}
                        {error && (
                            <div className="af__error" role="alert">
                                ⚠ {error}
                            </div>
                        )}

                        {/* Кнопки действий (отмена и создание) */}
                        <div className="af__footer">
                            <button
                                className="af__btn-cancel"
                                type="button"
                                onClick={closeModal}
                                disabled={loading}
                            >
                                Отмена
                            </button>
                            <button
                                className="af__btn-submit"
                                type="button"
                                onClick={submit}
                                disabled={loading}
                            >
                                {loading && <span className="af__spinner" />}
                                {loading ? 'Создаю...' : 'Создать строку'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
