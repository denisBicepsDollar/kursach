import React, { useState } from "react";
import * as api from "../api.js";

export function AddFormRow({ tableName = '', disabled = false, onCreate, cols = [] }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [values, setValues] = useState({});
    const [error, setError] = useState(null);

    const openModal = () => {
        setError(null);
        const init = {};
        for (const c of cols) init[c.name] = c.default ?? '';
        setValues(init);
        setOpen(true);
    };

    const closeModal = () => { if (loading) return; setOpen(false); setError(null); };
    const updateValue = (key, val) => setValues(v => ({ ...v, [key]: val }));

    const parseValueByType = (type, raw) => {
        const s = typeof raw === 'string' ? raw.trim() : raw;
        if (s === '') return s;
        try {
            if (type === 'json' || (typeof s === 'string' && ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))))) return JSON.parse(s);
        } catch {}
        if (type === 'number' || type === 'int' || type === 'float') {
            const n = Number(s);
            return Number.isFinite(n) ? n : raw;
        }
        if (type === 'boolean') {
            if (s === 'true') return true;
            if (s === 'false') return false;
        }
        if (typeof s === 'string' && s.includes(',')) return s.split(',').map(x => x.trim());
        return raw;
    };

    const validate = () => {
        for (const c of cols) {
            const val = values[c.name];
            const empty = val === '' || val === null || typeof val === 'undefined';
            if (!c.nullable && empty) return `Поле "${c.name}" обязательно`;
        }
        return null;
    };

    const submit = async () => {
        setError(null);
        if (!tableName?.trim()) { setError('Требуется имя таблицы'); return; }
        const vErr = validate();
        if (vErr) { setError(vErr); return; }

        const payload = {};
        for (const c of cols) {
            const raw = values[c.name];
            const empty = raw === '' || raw === null || typeof raw === 'undefined';
            payload[c.name] = empty ? (c.nullable ? null : raw) : parseValueByType(c.type, raw);
        }

        setLoading(true);
        try {
            const res = await api.postCreateRow(tableName, payload);
            if (onCreate) onCreate(res);
            alert(`Строка создана: ${res?.id ?? JSON.stringify(res)}`);
            setOpen(false);
        } catch (e) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = (c) => {
        if (c.type === 'json') return '{ "key": "value" }';
        if (c.type === 'boolean') return 'true / false';
        if (c.type === 'int' || c.type === 'float' || c.type === 'number') return '0';
        return '';
    };

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                disabled={disabled || !tableName || !cols.length}
                className="af__add-btn"
            >
                + Создать строку
            </button>

            {open && (
                <div className="af__overlay">
                    <div className="af__backdrop" onClick={closeModal} />

                    <div className="af__modal" role="dialog" aria-modal="true" aria-label="Создать строку">

                        {/* Header */}
                        <div className="af__header">
                            <div className="af__header-left">
                                <span className="af__header-title">Новая строка</span>
                                <span className="af__header-table-title">{tableName}</span>
                            </div>
                            <button className="af__close" onClick={closeModal} aria-label="Закрыть" disabled={loading}>×</button>
                        </div>

                        {/* Body */}
                        <div className="af__body">
                            <div className="af__section">
                                <div className="af__section-header" style={{ cursor: 'default' }}>
                                    <span className="af__section-title">Поля</span>
                                </div>

                                <div className="af__section-body">
                                    {cols.map((c) => (
                                        <div key={c.name} className="af__field">
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

                        {/* Error */}
                        {error && (
                            <div className="af__error" role="alert">
                                ⚠ {error}
                            </div>
                        )}

                        {/* Footer */}
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