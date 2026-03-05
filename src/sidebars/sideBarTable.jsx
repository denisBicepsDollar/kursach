import React, { useEffect, useState } from 'react';
import * as api from '../api.js';
import './sidebar.css';

export default function SidebarTable({ onClickTable }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState('');

    // report form state (встроенная форма)
    const [reportOpen, setReportOpen] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportTitle, setReportTitle] = useState('');
    const [reportParamsText, setReportParamsText] = useState('{}');
    const [reportError, setReportError] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const res = await api.getTable();
                if (!mounted) return;
                setItems(Array.isArray(res) ? res : (res?.data || []));
            } catch (e) {
                if (!mounted) return;
                setError(e?.message || String(e));
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const handleSelect = name => {
        setSelected(name);
        if (onClickTable) onClickTable(name);
    };

    const openReportModal = () => {
        setReportError(null);
        setReportTitle('');
        setReportParamsText('{}');
        setReportOpen(true);
    };
    const closeReportModal = () => {
        if (reportLoading) return;
        setReportOpen(false);
        setReportError(null);
    };

    const submitCreateReport = async () => {
        setReportError(null);
        if (!selected || !selected.trim()) {
            setReportError('Выберите таблицу');
            return;
        }

        let params = null;
        if (reportParamsText && reportParamsText.trim() !== '') {
            try {
                params = JSON.parse(reportParamsText);
            } catch (err) {
                setReportError('Неверный JSON в параметрах');
                return;
            }
        }

        setReportLoading(true);
        try {
            const res = await api.postCreateReport(selected, { title: reportTitle || null, params });
            alert(`Отчет создан: ${res?.id ?? JSON.stringify(res)}`);
            setReportOpen(false);
            setReportTitle('');
            setReportParamsText('{}');
        } catch (e) {
            setReportError(e?.message || String(e));
        } finally {
            setReportLoading(false);
        }
    };

    const handleDeleteTable = async (name) => {
        if (!confirm(`Удалить таблицу "${name}" ?`)) return;
        try {
            setLoading(true);
            await api.deleteTable(name);
            alert('Таблица удалена');
            // обновим список
            const res = await api.getTable();
            setItems(Array.isArray(res) ? res : (res?.data || []));
            if (selected === name) setSelected('');
        } catch (e) {
            alert(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        try {
            setLoading(true);
            const res = await api.getTable();
            setItems(Array.isArray(res) ? res : (res?.data || []));
        } catch (e) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside className="sidebar">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button type="button" onClick={refresh}>Обновить</button>
                <button type="button" onClick={openReportModal} disabled={!selected}>Создать отчёт</button>
            </div>

            {loading && <p className="muted">Загрузка...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && (
                <ul className="table-list">
                    {items.length === 0 ? (
                        <li className="muted">Таблицы не найдены.</li>
                    ) : items.map(name => (
                        <li
                            key={name}
                            className={`table-list__item ${name === selected ? 'selected' : ''}`}
                            onClick={() => handleSelect(name)}
                            role="button"
                            tabIndex={0}
                        >
                            <span onDoubleClick={() => handleDeleteTable(name)}>{name}</span>
                        </li>
                    ))}
                </ul>
            )}

            {reportOpen && (
                <div className="af__modal" role="dialog" aria-modal="true" aria-label="Создать отчёт">
                    <div className="af__modal-content">
                        <div className="af__modal-header">
                            <h3>Новый отчёт</h3>
                            <button className="af__modal-close" onClick={closeReportModal} aria-label="Закрыть" disabled={reportLoading}>×</button>
                        </div>

                        <label className="af__label" htmlFor="st-report-table">Таблица</label>
                        <input id="st-report-table" className="af__input" value={selected} readOnly disabled />

                        <label className="af__label" htmlFor="st-report-title">Заголовок (необязательно)</label>
                        <input id="st-report-title" className="af__input" value={reportTitle} onChange={e => setReportTitle(e.target.value)} disabled={reportLoading} />

                        <label className="af__label" htmlFor="st-report-params">Параметры (JSON)</label>
                        <textarea id="st-report-params" className="af__textarea" value={reportParamsText} onChange={e => setReportParamsText(e.target.value)} disabled={reportLoading} rows={6} />

                        {reportError && <div className="af__error" role="alert">{reportError}</div>}

                        <div className="af__actions">
                            <button className="af__create" type="button" onClick={submitCreateReport} disabled={reportLoading}>
                                {reportLoading ? 'Создаю...' : 'Создать'}
                            </button>
                            <button className="af__cancel" type="button" onClick={closeReportModal} disabled={reportLoading}>Отмена</button>
                        </div>
                    </div>
                    <div className="af__modal-backdrop" onClick={closeReportModal} />
                </div>
            )}
        </aside>
    );
}
