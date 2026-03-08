import React, { useState} from 'react';
import '../index.css';
import './addForm.css'
import * as api from '../api.js'

const DEFAULT_TYPES = ['integer', 'text', 'boolean', 'timestamp', 'date', 'numeric'];


export default function AddFormTable({ disabled }) {
    const [open, setOpen] = useState(false);
    const [tableName, setTableName] = useState('');
    const [cols, setCols] = useState([{ name: '', type: 'text', nullable: false, defaultValue: ''}]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const updateCol = (index, patch) =>
        setCols(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

    const addCol = () =>
        setCols(prev => [
            ...prev,
            { name: '', type: 'text', nullable: false, defaultValue: '' },
        ]);
    const removeCol = index => setCols(prev => prev.filter((_, i) => i !== index));

    const openModal = () => {
        setError(null);
        setOpen(true);
    };

    const resetForm = () => {
        setTableName('');
        setCols([{ name: '', type: 'text', nullable: false, defaultValue: '' }]);
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
            columns: cols.map(c => ({
                name: c.name.trim(),
                type: c.type,
                nullable: c.nullable,
                default: c.defaultValue || null,
            })),
        };

        setLoading(true);
        try {
            const result = await api.postCreateTable(payload);
            const id = result?.data?.id || payload.tableName;
            window.location.href = `/tables/${encodeURIComponent(id)}`;
        } catch (e) {
            setError(e?.message || (e?.payload && (e.payload.error || e.payload.message)) || 'Ошибка создания');
            setLoading(false);
        }
    };

    return (
        <>
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

            {open && (
                <div className="af__overlay" role="dialog" aria-modal="true">
                    <div className="af__modal">

                        <div className="af__header">
                            <div className="af__header-left">
                                <span className="af__header-title">Новая таблица</span>
                            </div>
                        </div>

                        <div className="af__body">

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

                            <div className="af__col-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                <div className="af__cols-title">Колонки</div>

                                {cols.map((c, i) => (
                                    <div className="af__col" data-index={i} key={i} style={{ display: 'flex',alignItems: 'center', gap: '8px',width: '100%', minWidth: 0 }}>
                                        <input
                                            className="af__input"
                                            style={{ flex: 1, minWidth: 0 }}
                                            placeholder="column_name"
                                            aria-label={`Имя колонки ${i + 1}`}
                                            value={c.name}
                                            onChange={e => updateCol(i, { name: e.target.value })}
                                            disabled={loading}
                                        />

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

                                        <input
                                            className="af__input"
                                            style={{ flex: 1, minWidth: 0 }}
                                            placeholder="default"
                                            aria-label={`Значение по умолчанию колонки ${i + 1}`}
                                            value={c.defaultValue}
                                            onChange={e => updateCol(i, { defaultValue: e.target.value })}
                                            disabled={loading}
                                        />

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

                            {error ? <div className="af__error" role="alert">{error}</div> : null}

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
                    <div className="af__backdrop" onClick={closeModal} />
                </div>
            )}
        </>
    );
}
