import React, { useState } from 'react';
import './addForm.css';
import * as api from '../api.js'

const DEFAULT_TYPES = ['integer', 'text', 'boolean', 'timestamp', 'date', 'numeric'];

export default function AddForm({ disabled }) {
    const [open, setOpen] = useState(false);
    const [tableName, setTableName] = useState('');
    const [cols, setCols] = useState([{ name: '', type: 'text', nullable: false }]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const updateCol = (index, patch) =>
        setCols(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

    const addCol = () => setCols(prev => [...prev, { name: '', type: 'text', nullable: false }]);
    const removeCol = index => setCols(prev => prev.filter((_, i) => i !== index));

    const openModal = () => {
        setError(null);
        setOpen(true);
    };

    const resetForm = () => {
        setTableName('');
        setCols([{ name: '', type: 'text', nullable: false }]);
        setError(null);
    };

    const closeModal = () => {
        if (loading) return;
        setOpen(false);
        resetForm();
    };

    const submit = async () => {
        setError(null);
        if (!tableName.trim()) return setError('Введите имя таблицы');
        if (cols.some(c => !c.name.trim())) return setError('Все колонки должны иметь имя');

        const payload = {
            tableName: tableName.trim(),
            columns: cols.map(c => ({ ...c, name: c.name.trim() })),
        };

        setLoading(true);
        try {
            const result = await api.postCreateTable(payload);
            // ожидаем { data: table } — если есть id, используем; иначе имя таблицы
            const id = result?.data?.id || payload.tableName;
            // простое перенаправление
            window.location.href = `/tables/${encodeURIComponent(id)}`;
        } catch (e) {
            setError(e?.message || (e?.payload && (e.payload.error || e.payload.message)) || 'Ошибка создания');
            setLoading(false);
        }
    };

    return (
        <>
            <button
                className="af__create-main"
                type="button"
                onClick={openModal}
                disabled={disabled}
                aria-haspopup="dialog"
            >
                Создать таблицу
            </button>

            {open && (
                <div className="af__modal" role="dialog" aria-modal="true" aria-label="Создать таблицу">
                    <div className="af__modal-content">
                        <div className="af__modal-header">
                            <h3>Новая таблица</h3>
                            <button className="af__modal-close" onClick={closeModal} aria-label="Закрыть" disabled={loading}>×</button>
                        </div>

                        <label className="af__label" htmlFor="af-table-name">Имя таблицы</label>
                        <input
                            id="af-table-name"
                            className="af__input"
                            placeholder="users"
                            value={tableName}
                            onChange={e => setTableName(e.target.value)}
                            disabled={loading}
                        />

                        <div className="af__cols">
                            <div className="af__cols-title">Колонки</div>

                            {cols.map((c, i) => (
                                <div className="af__col" data-index={i} key={i}>
                                    <input
                                        className="af__col-name"
                                        placeholder="column_name"
                                        aria-label={`Имя колонки ${i + 1}`}
                                        value={c.name}
                                        onChange={e => updateCol(i, { name: e.target.value })}
                                        disabled={loading}
                                    />

                                    <select
                                        className="af__col-type"
                                        aria-label={`Тип колонки ${i + 1}`}
                                        value={c.type}
                                        onChange={e => updateCol(i, { type: e.target.value })}
                                        disabled={loading}
                                    >
                                        {DEFAULT_TYPES.map(t => <option value={t} key={t}>{t}</option>)}
                                    </select>

                                    <label className="af__col-null">
                                        <input
                                            type="checkbox"
                                            aria-label={`Nullable колонки ${i + 1}`}
                                            checked={c.nullable}
                                            onChange={e => updateCol(i, { nullable: e.target.checked })}
                                            disabled={loading}
                                        />
                                        nullable
                                    </label>

                                    <button
                                        className="af__col-remove"
                                        type="button"
                                        aria-label={`Удалить колонку ${i + 1}`}
                                        onClick={() => removeCol(i)}
                                        disabled={loading || cols.length === 1}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            <button className="af__add-col" type="button" onClick={addCol} disabled={loading}>
                                Добавить колонку
                            </button>
                        </div>

                        {error ? <div className="af__error" role="alert">{error}</div> : null}

                        <div className="af__actions">
                            <button
                                className="af__create"
                                type="button"
                                onClick={submit}
                                disabled={loading}
                                aria-disabled={loading}
                            >
                                {loading ? 'Создаю...' : 'Создать'}
                            </button>
                            <button className="af__cancel" type="button" onClick={closeModal} disabled={loading}>
                                Отмена
                            </button>
                        </div>
                    </div>

                    <div className="af__modal-backdrop" onClick={closeModal} />
                </div>
            )}
        </>
    );
}
