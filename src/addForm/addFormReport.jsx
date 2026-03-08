import { useState, useCallback } from 'react';
import './addForm.css';
import * as api from '../api.js';
// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const WHERE_OPERATORS = [
    { value: '=',           label: '= равно' },
    { value: '!=',          label: '≠ не равно' },
    { value: '>',           label: '> больше' },
    { value: '>=',          label: '≥ больше или равно' },
    { value: '<',           label: '< меньше' },
    { value: '<=',          label: '≤ меньше или равно' },
    { value: 'ILIKE',       label: 'ILIKE содержит (без регистра)' },
    { value: 'LIKE',        label: 'LIKE содержит' },
    { value: 'NOT ILIKE',   label: 'NOT ILIKE не содержит' },
    { value: 'IS NULL',     label: 'IS NULL пусто' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL не пусто' },
    { value: 'IN',          label: 'IN из списка' },
    { value: 'NOT IN',      label: 'NOT IN не из списка' },
    { value: 'BETWEEN',     label: 'BETWEEN диапазон' },
];

const AGGREGATE_FNS = ['COUNT', 'AVG', 'SUM', 'MIN', 'MAX', 'STDDEV', 'VARIANCE', 'MEDIAN'];

const WINDOW_FNS = [
    { key: 'rowNumber',  label: 'ROW_NUMBER()',  needsCol: false },
    { key: 'rank',       label: 'RANK()',        needsCol: false },
    { key: 'denseRank',  label: 'DENSE_RANK()',  needsCol: false },
    { key: 'percentRank',label: 'PERCENT_RANK()',needsCol: false },
    { key: 'cumeDist',   label: 'CUME_DIST()',   needsCol: false },
    { key: 'ntile',      label: 'NTILE(n)',      needsCol: false, needsN: true },
    { key: 'lag',        label: 'LAG(col)',      needsCol: true },
    { key: 'lead',       label: 'LEAD(col)',     needsCol: true },
    { key: 'firstValue', label: 'FIRST_VALUE(col)', needsCol: true },
    { key: 'lastValue',  label: 'LAST_VALUE(col)',  needsCol: true },
    { key: 'nthValue',   label: 'NTH_VALUE(col, n)',needsCol: true, needsN: true },
];

const ORDER_DIRECTIONS = ['ASC', 'DESC', 'ASC NULLS LAST', 'DESC NULLS LAST', 'ASC NULLS FIRST', 'DESC NULLS FIRST'];

const COALESCE_DEFAULTS = {
    numeric: '0',
    text: "''",
    boolean: 'false',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = () => Date.now() + Math.random();

const noValueOperators = new Set(['IS NULL', 'IS NOT NULL']);

// ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────

function buildPayload({ title, selectedCols, filters, aggregates, groupBy, having, orderBy, orderDir, windowConfig, coalesces, limit, withSummary }) {
    // WHERE filters → object
    const whereObj = {};
    filters.forEach(f => {
        if (!f.col) return;
        const key = f.col;
        if (noValueOperators.has(f.op)) {
            whereObj[key] = { op: f.op };
        } else if (f.op === 'BETWEEN') {
            whereObj[key] = { op: f.op, value: [f.value, f.value2] };
        } else if (f.op === 'IN' || f.op === 'NOT IN') {
            whereObj[key] = { op: f.op, value: f.value.split(',').map(s => s.trim()) };
        } else {
            whereObj[key] = { op: f.op, value: f.value };
        }
    });

    // Aggregates
    const aggObj = {};
    aggregates.forEach(a => {
        if (!a.fn) return;
        const col = a.fn === 'COUNT' && !a.col ? '*' : a.col;
        if (a.fn !== 'COUNT' && !col) return;
        const alias = a.alias || `${a.fn.toLowerCase()}_${col}`.replace(/[^a-zA-Z0-9_]/g, '_');
        aggObj[alias] = { fn: a.fn, col: col || '*', distinct: a.distinct };
    });

    // Window fns
    const winFns = {};
    windowConfig.fns.forEach(w => {
        if (!w.key) return;
        winFns[w.key] = {
            fn: w.key,
            col: w.col || undefined,
            n: w.n ? parseInt(w.n) : undefined,
            partitionBy: windowConfig.partitionBy || undefined,
            orderBy: windowConfig.orderBy || undefined,
            orderDir: windowConfig.orderDir || 'ASC',
            alias: w.alias || undefined,
        };
    });

    // COALESCE enrichments
    const coalesceObj = {};
    coalesces.forEach(c => {
        if (!c.col || !c.default) return;
        coalesceObj[c.col] = c.default;
    });

    const payload = {
        title: title.trim() || null,
        columns: selectedCols.length ? selectedCols : null,
        where: Object.keys(whereObj).length ? whereObj : null,
        aggregates: Object.keys(aggObj).length ? aggObj : null,
        groupBy: groupBy || null,
        having: having.trim() || null,
        orderBy: orderBy || null,
        orderDir: orderBy ? (orderDir || 'ASC') : null,
        windowFns: Object.keys(winFns).length ? winFns : null,
        coalesce: Object.keys(coalesceObj).length ? coalesceObj : null,
        limit: limit !== 'all' ? parseInt(limit) : null,
        withSummary: withSummary || null,
    };

    return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null && v !== undefined));
}

// ─── SECTION WRAPPER ─────────────────────────────────────────────────────────

function Section({ title, badge, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="af__section" style={{ overflow: 'visible' }}>
            <button type="button" className="af__section-header" onClick={() => setOpen(o => !o)}>
                <span className="af__section-arrow">{open ? '▾' : '▸'}</span>
                <span className="af__section-title">{title}</span>
                {badge > 0 && <span className="af__badge">{badge}</span>}
            </button>
            {open && <div className="af__section-body">{children}</div>}
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function AddFormReport({ tableName = '', disabled = false, onCreate }) {
    const [open, setOpen]       = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);
    const [columns, setColumns] = useState([]);

    // ── Форма ──
    const [title, setTitle]               = useState('');
    const [selectedCols, setSelectedCols] = useState([]);   // string[]
    const [filters, setFilters]           = useState([]);   // { id, col, op, value, value2 }[]
    const [aggregates, setAggregates]     = useState([]);   // { id, fn, col, distinct, alias }[]
    const [groupBy, setGroupBy]           = useState('');
    const [having, setHaving]             = useState('');
    const [orderBy, setOrderBy]           = useState('');
    const [orderDir, setOrderDir]         = useState('ASC');
    const [windowConfig, setWindowConfig] = useState({     // window global settings
        partitionBy: '',
        orderBy: '',
        orderDir: 'ASC',
        fns: [],   // { id, key, col, n, alias }[]
    });
    const [coalesces, setCoalesces]       = useState([]);   // { id, col, default }[]
    const [limit, setLimit]               = useState('100');
    const [withSummary, setWithSummary]   = useState(false);

    // ─── Load columns ──────────────────────────────────────────────
    const loadColumns = useCallback(async () => {
        if (!tableName) return;
        try {
            const resp = await api.getTable(tableName);
            const list = Array.isArray(resp)
                ? resp
                : Array.isArray(resp?.columns)    ? resp.columns
                    : Array.isArray(resp?.data?.columns) ? resp.data.columns
                        : [];
            const cols = list
                .map(c => typeof c === 'string' ? c : (c.column_name ?? c.name ?? ''))
                .map(s => s.toString().trim())
                .filter(Boolean);
            setColumns(cols);
        } catch {
            setColumns([]);
        }
    }, [tableName]);

    // ─── Open / Close ──────────────────────────────────────────────
    const openModal = () => {
        setError(null);
        setTitle('');
        setSelectedCols([]);
        setFilters([]);
        setAggregates([]);
        setGroupBy('');
        setHaving('');
        setOrderBy('');
        setOrderDir('ASC');
        setWindowConfig({ partitionBy: '', orderBy: '', orderDir: 'ASC', fns: [] });
        setCoalesces([]);
        setLimit('100');
        setWithSummary(false);
        setOpen(true);
        loadColumns();
    };

    const closeModal = () => {
        if (loading) return;
        setOpen(false);
        setError(null);
    };

    // ─── Column toggle ─────────────────────────────────────────────
    const toggleCol = col =>
        setSelectedCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );

    const selectAllCols = () => setSelectedCols([...columns]);
    const clearAllCols  = () => setSelectedCols([]);

    // ─── Filters ───────────────────────────────────────────────────
    const addFilter    = () => setFilters(f => [...f, { id: uid(), col: columns[0] || '', op: '=', value: '', value2: '' }]);
    const removeFilter = id  => setFilters(f => f.filter(x => x.id !== id));
    const updateFilter = (id, field, val) =>
        setFilters(f => f.map(x => x.id === id ? { ...x, [field]: val } : x));

    // ─── Aggregates ────────────────────────────────────────────────
    const addAggregate    = () => setAggregates(a => [...a, { id: uid(), fn: 'COUNT', col: '', distinct: false, alias: '' }]);
    const removeAggregate = id  => setAggregates(a => a.filter(x => x.id !== id));
    const updateAggregate = (id, field, val) =>
        setAggregates(a => a.map(x => x.id === id ? { ...x, [field]: val } : x));

    // ─── Window fns ────────────────────────────────────────────────
    const addWinFn    = () => setWindowConfig(w => ({ ...w, fns: [...w.fns, { id: uid(), key: 'rowNumber', col: '', n: '4', alias: '' }] }));
    const removeWinFn = id  => setWindowConfig(w => ({ ...w, fns: w.fns.filter(f => f.id !== id) }));
    const updateWinFn = (id, field, val) =>
        setWindowConfig(w => ({ ...w, fns: w.fns.map(f => f.id === id ? { ...f, [field]: val } : f) }));
    const updateWinCfg = (field, val) =>
        setWindowConfig(w => ({ ...w, [field]: val }));

    // ─── Coalesces ─────────────────────────────────────────────────
    const addCoalesce    = () => setCoalesces(c => [...c, { id: uid(), col: columns[0] || '', default: '0' }]);
    const removeCoalesce = id  => setCoalesces(c => c.filter(x => x.id !== id));
    const updateCoalesce = (id, field, val) =>
        setCoalesces(c => c.map(x => x.id === id ? { ...x, [field]: val } : x));

    // ─── Submit ────────────────────────────────────────────────────
    const submit = async () => {
        setError(null);
        if (!tableName?.trim()) { setError('Требуется имя таблицы'); return; }

        const payload = buildPayload({ title, selectedCols, filters, aggregates, groupBy, having, orderBy, orderDir, windowConfig, coalesces, limit, withSummary });

        setLoading(true);
        try {
            const res = await api.postCreateReport(tableName, payload);
            setOpen(false);
            await onCreate?.(res);
        } catch (e) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────────
    return (
        <>
            <button type="button" onClick={openModal} disabled={disabled || !tableName} className="btn-accent">
                Создать отчёт
            </button>

            {open && (
                <div className="af__overlay" role="dialog" aria-modal="true">
                    <div className="af__modal">

                        {/* ── Header ── */}
                        <div className="af__header">
                            <div className="af__header-left">
                                <span className="af__header-title">Новый отчёт</span>
                                <span className="af__header-table-title">{tableName}</span>
                            </div>
                        </div>

                        {/* ── Body ── */}
                        <div className="af__body">

                            {/* Название */}
                            <div className="af__field-row">
                                <label className="af__label" style={{marginBottom: 18}}>Название отчёта</label>
                                <input
                                    className="af__input"
                                    placeholder="необязательно..."
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {/* ── SELECT ── */}
                            <Section title="SELECT — колонки" badge={selectedCols.length} defaultOpen={true}>
                                <div className="af__col-actions">
                                    <button type="button" className="af__chip-btn" onClick={selectAllCols}>Все</button>
                                    <button type="button" className="af__chip-btn" onClick={clearAllCols}>Сбросить</button>
                                    <span className="af__hint">Пусто = SELECT *</span>
                                </div>
                                <div className="af__col-grid">
                                    {columns.map(col => (
                                        <button
                                            key={col}
                                            type="button"
                                            className={`af__col-chip ${selectedCols.includes(col) ? 'active' : ''}`}
                                            onClick={() => toggleCol(col)}
                                        >
                                            {col}
                                        </button>
                                    ))}
                                    {columns.length === 0 && <span className="af__hint">Загрузка колонок...</span>}
                                </div>
                            </Section>

                            {/* ── COALESCE / Обогащение ── */}
                            <Section title="COALESCE — дефолты для NULL" badge={coalesces.length} defaultOpen={false}>
                                {coalesces.map(c => (
                                    <div key={c.id} className="af__row">
                                        <select className="af__input af__input--sm" value={c.col} onChange={e => updateCoalesce(c.id, 'col', e.target.value)} disabled={loading}>
                                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                        </select>
                                        <span className="af__row-sep">→</span>
                                        <input className="af__input af__input--sm" placeholder="0 / '' / 'Нет данных'" value={c.default} onChange={e => updateCoalesce(c.id, 'default', e.target.value)} disabled={loading} />
                                        <button type="button" className="af__icon-btn af__icon-btn--del" onClick={() => removeCoalesce(c.id)}>✕</button>
                                    </div>
                                ))}
                                <button type="button" className="af__add-btn" onClick={addCoalesce} disabled={loading || !columns.length}>+ Добавить COALESCE</button>
                            </Section>

                            {/* ── WHERE ── */}
                            <Section title="WHERE — фильтры" badge={filters.length} defaultOpen={true}>
                                {filters.map(f => (
                                    <div key={f.id} className="af__row af__row--wrap">
                                        <select className="af__input af__input--sm" value={f.col} onChange={e => updateFilter(f.id, 'col', e.target.value)} disabled={loading}>
                                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                        </select>
                                        <select className="af__input af__input--md" value={f.op} onChange={e => updateFilter(f.id, 'op', e.target.value)} disabled={loading}>
                                            {WHERE_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        {!noValueOperators.has(f.op) && (
                                            <>
                                                <input
                                                    className="af__input af__input--sm"
                                                    placeholder={f.op === 'IN' || f.op === 'NOT IN' ? 'val1, val2, ...' : f.op === 'BETWEEN' ? 'от' : 'значение'}
                                                    value={f.value}
                                                    onChange={e => updateFilter(f.id, 'value', e.target.value)}
                                                    disabled={loading}
                                                />
                                                {f.op === 'BETWEEN' && (
                                                    <>
                                                        <span className="af__row-sep">и</span>
                                                        <input className="af__input af__input--sm" placeholder="до" value={f.value2} onChange={e => updateFilter(f.id, 'value2', e.target.value)} disabled={loading} />
                                                    </>
                                                )}
                                            </>
                                        )}
                                        <button type="button" className="af__icon-btn af__icon-btn--del" onClick={() => removeFilter(f.id)}>✕</button>
                                    </div>
                                ))}
                                <button type="button" className="af__add-btn" onClick={addFilter} disabled={loading || !columns.length}>+ Добавить условие</button>
                            </Section>

                            {/* ── AGGREGATES ── */}
                            <Section title="Агрегации" badge={aggregates.length} defaultOpen={false}>
                                {aggregates.map(a => (
                                    <div key={a.id} className="af__row af__row--wrap">
                                        <select className="af__input" value={a.fn} onChange={e => updateAggregate(a.id, 'fn', e.target.value)} disabled={loading}>
                                            {AGGREGATE_FNS.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                                        </select>
                                        <select className="af__input af__input--sm" value={a.col} onChange={e => updateAggregate(a.id, 'col', e.target.value)} disabled={loading}>
                                            <option value="">* (все)</option>
                                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                                        </select>
                                        <label className="af__checkbox-inline">
                                            <input type="checkbox" checked={a.distinct} onChange={e => updateAggregate(a.id, 'distinct', e.target.checked)} disabled={loading} />
                                            DISTINCT
                                        </label>
                                        <input className="af__input af__input--sm" placeholder="AS псевдоним" value={a.alias} onChange={e => updateAggregate(a.id, 'alias', e.target.value)} disabled={loading} />
                                        <button type="button" className="af__icon-btn af__icon-btn--del" onClick={() => removeAggregate(a.id)}>✕</button>
                                    </div>
                                ))}
                                <button type="button" className="af__add-btn" onClick={addAggregate} disabled={loading || !columns.length}>+ Добавить агрегацию</button>
                            </Section>

                            {/* ── GROUP BY / HAVING / ORDER BY ── */}
                            <Section title="Группировка и сортировка" badge={[groupBy, orderBy].filter(Boolean).length} defaultOpen={false}>
                                <div className="af__grid-2">
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">GROUP BY</label>
                                        <select className="af__input" value={groupBy} onChange={e => setGroupBy(e.target.value)} disabled={loading}>
                                            <option value="">— без группировки —</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">HAVING</label>
                                        <input className="af__input" placeholder='COUNT(*) > 5' value={having} onChange={e => setHaving(e.target.value)} disabled={loading || !groupBy} style={{ opacity: groupBy ? 1 : 0.35 }} />
                                    </div>
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">ORDER BY</label>
                                        <select className="af__input" value={orderBy} onChange={e => setOrderBy(e.target.value)} disabled={loading}>
                                            <option value="">— без сортировки —</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">Направление</label>
                                        <select className="af__input" value={orderDir} onChange={e => setOrderDir(e.target.value)} disabled={loading || !orderBy} style={{ opacity: orderBy ? 1 : 0.35 }}>
                                            {ORDER_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </Section>

                            {/* ── WINDOW FUNCTIONS ── */}
                            <Section title="Оконные функции" badge={windowConfig.fns.length} defaultOpen={false}>
                                <div className="af__grid-2" style={{ marginBottom: '12px' }}>
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">PARTITION BY</label>
                                        <select className="af__input" value={windowConfig.partitionBy} onChange={e => updateWinCfg('partitionBy', e.target.value)} disabled={loading}>
                                            <option value="">— без партиции —</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">OVER ORDER BY</label>
                                        <select className="af__input" value={windowConfig.orderBy} onChange={e => updateWinCfg('orderBy', e.target.value)} disabled={loading}>
                                            <option value="">— колонка —</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">Направление окна</label>
                                        <select className="af__input" value={windowConfig.orderDir} onChange={e => updateWinCfg('orderDir', e.target.value)} disabled={loading}>
                                            {ORDER_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {windowConfig.fns.map(w => {
                                    const meta = WINDOW_FNS.find(f => f.key === w.key) || {};
                                    return (
                                        <div key={w.id} className="af__row af__row--wrap">
                                            <select className="af__input af__input--md" value={w.key} onChange={e => updateWinFn(w.id, 'key', e.target.value)} disabled={loading}>
                                                {WINDOW_FNS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                                            </select>
                                            {meta.needsCol && (
                                                <select className="af__input af__input--sm" value={w.col} onChange={e => updateWinFn(w.id, 'col', e.target.value)} disabled={loading}>
                                                    <option value="">— колонка —</option>
                                                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            )}
                                            {meta.needsN && (
                                                <input className="af__input" placeholder="n" value={w.n} onChange={e => updateWinFn(w.id, 'n', e.target.value)} disabled={loading} />
                                            )}
                                            <input className="af__input af__input--sm" placeholder="AS псевдоним" value={w.alias} onChange={e => updateWinFn(w.id, 'alias', e.target.value)} disabled={loading} />
                                            <button type="button" className="af__icon-btn af__icon-btn--del" onClick={() => removeWinFn(w.id)}>✕</button>
                                        </div>
                                    );
                                })}
                                <button type="button" className="af__add-btn" onClick={addWinFn} disabled={loading}>+ Добавить оконную функцию</button>
                            </Section>

                            {/* ── LIMIT + SUMMARY ── */}
                            <Section title="Лимит и итоги" defaultOpen={false}>
                                <div className="af__grid-2">
                                    <div className="af__field">
                                        <label className="af__label af__label--sm">LIMIT</label>
                                        <select className="af__input" value={limit} onChange={e => setLimit(e.target.value)} disabled={loading}>
                                            {['10','25','50','100','500','1000','all'].map(l => (
                                                <option key={l} value={l}>{l === 'all' ? 'Без лимита' : l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="af__field af__field--center">
                                        <label className="af__checkbox-inline af__checkbox-inline--lg">
                                            <input type="checkbox" checked={withSummary} onChange={e => setWithSummary(e.target.checked)} disabled={loading} />
                                            UNION ALL итоговая строка
                                        </label>
                                    </div>
                                </div>
                            </Section>

                        </div>

                        {/* ── Error ── */}
                        {error && <div className="af__error" role="alert">{error}</div>}

                        {/* ── Footer ── */}
                        <div className="af__footer">
                            <button type="button" className="af__btn-cancel" onClick={closeModal} disabled={loading}>Отмена</button>
                            <button type="button" className="af__btn-submit" onClick={submit} disabled={loading}>
                                {loading ? <span className="af__spinner" /> : null}
                                {loading ? 'Создаю...' : 'Создать отчёт'}
                            </button>
                        </div>
                    </div>
                    <div className="af__backdrop" onClick={closeModal} />
                </div>
            )}
        </>
    );
}