import React, {useState} from "react";
import * as api from "../api.js";


export function AddFormRow({ tableName = '', disabled = false, onCreate, cols = [] }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [values, setValues] = useState({});
    const [error, setError] = useState(null);

    const openModal = () => {
        setError(null);
        // инициализируем значения: если есть default — ставим его, иначе пустая строка
        const init = {};
        for (const c of cols) init[c.name] = c.default ?? '';
        setValues(init);
        setOpen(true);
    };
    const closeModal = () => { if (loading) return; setOpen(false); setError(null); };

    const updateValue = (key, val) => setValues(v => ({ ...v, [key]: val }));

    const parseValueByType = (type, raw) => {
        const s = typeof raw === 'string' ? raw.trim() : raw;
        if (s === '') return s; // keep empty string; nullable check handled separately
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
        // проверка non-nullable полей
        for (const c of cols) {
            const val = values[c.name];
            const empty = val === '' || val === null || typeof val === 'undefined';
            if (!c.nullable && empty) {
                return `Поле "${c.name}" обязательно`;
            }
        }
        return null;
    };

    const submit = async () => {
        setError(null);
        if (!tableName || !tableName.trim()) { setError('Требуется имя таблицы'); return; }
        const vErr = validate();
        if (vErr) { setError(vErr); return; }

        // собираем полезную нагрузку, парсим по типам
        const payload = {};
        for (const c of cols) {
            const raw = values[c.name];
            const empty = raw === '' || raw === null || typeof raw === 'undefined';
            if (empty) {
                payload[c.name] = c.nullable ? null : raw; // non-nullable уже проверены
            } else {
                payload[c.name] = parseValueByType(c.type, raw);
            }
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

    return (
        <>
            <button type="button" onClick={openModal} disabled={disabled || !tableName || !cols.length} className="btn-accent">
                Создать строку
            </button>

            {open && (
                <div className="af__modal" role="dialog" aria-modal="true" aria-label="Создать строку">
                    <div className="af__modal-content">
                        <div className="af__modal-header">
                            <h3>Новая строка</h3>
                            <button className="af__modal-close" onClick={closeModal} aria-label="Закрыть" disabled={loading}>×</button>
                        </div>

                        <label className="af__label-header" htmlFor="af-row-table">Таблица</label>
                        <input id="af-row-table" className="af__input" value={tableName} readOnly disabled />

                        <label className="af__label-header">Колонки</label>
                        {cols.map((c) => (
                            <div key={c.name} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="af__label" htmlFor={`col-${c.name}`}>
                                            {c.name} <small style={{ marginLeft: 8 }}>({c.type}{c.nullable ? ', nullable' : ', required'})</small>
                                        </label>
                                        <input
                                            id={`col-${c.name}`}
                                            className="af__input"
                                            value={values[c.name]}
                                            onChange={e => updateValue(c.name, e.target.value)}
                                            disabled={loading}
                                            placeholder={c.type === 'json' ? 'JSON или {..} / [..]' : c.type === 'boolean' ? 'true / false' : ''}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {error && <div className="af__error" role="alert">{error}</div>}

                        <div className="af__actions">
                            <button className="af__create" type="button" onClick={submit} disabled={loading}>{loading ? 'Создаю...' : 'Создать'}</button>
                            <button className="af__cancel" type="button" onClick={closeModal} disabled={loading}>Отмена</button>
                        </div>
                    </div>
                    <div className="af__modal-backdrop" onClick={closeModal} />
                </div>
            )}
        </>
    );
}