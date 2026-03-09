import pool from './defaultClient.js';

// ── helpers ──────────────────────────────────────────────────────────────────

// Оборачивает имя идентификатора (таблица, колонка) в двойные кавычки.
// Экранирует внутренние кавычки удвоением — защита от SQL-инъекций в именах.
function quoteIdent(name) {
    return `"${String(name).replace(/"/g, '""')}"`;
}

// Оборачивает строковое значение в одинарные кавычки для подстановки в SQL.
// Экранирует внутренние одинарные кавычки удвоением.
function quoteValue(val) {
    return `'${String(val).replace(/'/g, "''")}'`;
}

// ── builders ─────────────────────────────────────────────────────────────────

// Строит строку WHERE-clause из объекта фильтров.
// Новый формат: { col: { op: '=', value: 5 } }
// Legacy-формат: { col: '= 5' } — строка подставляется напрямую.
// Поддерживаемые операторы:
//   IS NULL / IS NOT NULL  — без value
//   BETWEEN                — value: [from, to] или value + value2
//   IN / NOT IN            — value: array или строка через запятую
//   LIKE / ILIKE / NOT LIKE / NOT ILIKE — автодобавляет % если нет
//   = != > >= < <=         — числа и булевы без кавычек, строки в кавычках
function buildWhereClause(whereObj) {
    console.log(`[rowRepo] buildWhereClause:`, JSON.stringify(whereObj, null, 2));

    if (!whereObj || typeof whereObj !== 'object' || Array.isArray(whereObj)) {
        console.log(`[rowRepo] whereObj пустой — пропускаем`);
        return '';
    }

    const NO_VALUE_OPS = new Set(['IS NULL', 'IS NOT NULL']);
    const parts = [];

    for (const [col, expr] of Object.entries(whereObj)) {
        const quotedCol = quoteIdent(col);

        if (expr && typeof expr === 'object' && expr.op) {
            const { op, value } = expr;
            const upperOp = op.toUpperCase().trim();

            if (NO_VALUE_OPS.has(upperOp)) {
                parts.push(`${quotedCol} ${upperOp}`);
                continue;
            }

            if (upperOp === 'BETWEEN') {
                const [from, to] = Array.isArray(value) ? value : [value, expr.value2 ?? ''];
                parts.push(`${quotedCol} BETWEEN ${quoteValue(from)} AND ${quoteValue(to)}`);
                continue;
            }

            if (upperOp === 'IN' || upperOp === 'NOT IN') {
                const list = Array.isArray(value)
                    ? value
                    : String(value).split(',').map(s => s.trim());
                parts.push(`${quotedCol} ${upperOp} (${list.map(quoteValue).join(', ')})`);
                continue;
            }

            if (['ILIKE', 'LIKE', 'NOT ILIKE', 'NOT LIKE'].includes(upperOp)) {
                const pattern = String(value).includes('%') ? value : `%${value}%`;
                parts.push(`${quotedCol} ${upperOp} ${quoteValue(pattern)}`);
                continue;
            }

            // =, !=, >, >=, <, <= — числа и булевы без кавычек
            const safeVal = String(value).trim();
            if (safeVal === 'true' || safeVal === 'false' || (!isNaN(safeVal) && safeVal !== '')) {
                parts.push(`${quotedCol} ${upperOp} ${safeVal}`);
            } else {
                parts.push(`${quotedCol} ${upperOp} ${quoteValue(safeVal)}`);
            }
            continue;
        }

        // Legacy: строковое выражение подставляется как есть
        parts.push(`${quotedCol} ${String(expr).trim()}`);
    }

    const result = parts.join(' AND ');
    console.log(`[rowRepo] WHERE clause:`, result);
    return result;
}

// Строит Map: имя_колонки → SQL-выражение COALESCE("col", default).
// Используется чтобы заменить голые имена колонок в SELECT на COALESCE-обёртки.
// Входной формат: { col: defaultValue } — числа без кавычек, строки в кавычках.
function buildCoalesceMap(coalesceObj) {
    const map = new Map();
    if (!coalesceObj || typeof coalesceObj !== 'object') return map;

    for (const [col, def] of Object.entries(coalesceObj)) {
        const defStr = String(def).trim();
        const defSql = (!isNaN(defStr) && defStr !== '') ? defStr : quoteValue(defStr);
        map.set(col, `COALESCE(${quoteIdent(col)}, ${defSql}) AS ${quoteIdent(col)}`);
    }
    return map;
}

// Строит массив SELECT-выражений из списка колонок и агрегатов.
// Если columns пустой и агрегатов нет — добавляет SELECT *.
// Колонки из coalesceMap заменяются на COALESCE-выражения.
// Агрегаты: { alias: { fn, col, distinct } } — поддерживает MEDIAN через PERCENTILE_CONT.
function buildSelectParts(columns, aggregates, coalesceMap) {
    const parts = [];

    if (Array.isArray(columns) && columns.length > 0) {
        for (const col of columns) {
            if (col === '*')               parts.push('*');
            else if (coalesceMap.has(col)) parts.push(coalesceMap.get(col));
            else                           parts.push(quoteIdent(col));
        }
    } else if (!aggregates || Object.keys(aggregates).length === 0) {
        parts.push('*');
    }

    if (aggregates && typeof aggregates === 'object') {
        for (const [alias, agg] of Object.entries(aggregates)) {
            const { fn, col, distinct } = agg;
            const upperFn    = fn.toUpperCase();
            const colExpr    = (!col || col === '*') ? '*' : quoteIdent(col);
            const distinctKw = distinct ? 'DISTINCT ' : '';

            const expr = upperFn === 'MEDIAN'
                ? `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${colExpr})`
                : `${upperFn}(${distinctKw}${colExpr})`;

            parts.push(`${expr} AS ${quoteIdent(alias)}`);
        }
    }

    return parts;
}

// Карта поддерживаемых оконных функций: ключ фронта → SQL-выражение или функция-генератор.
// Функции-генераторы принимают аргументы (col, n) и возвращают готовое SQL-выражение.
const WIN_FN_SQL = {
    rowNumber:   'ROW_NUMBER()',
    rank:        'RANK()',
    denseRank:   'DENSE_RANK()',
    percentRank: 'PERCENT_RANK()',
    cumeDist:    'CUME_DIST()',
    ntile:       (n)       => `NTILE(${parseInt(n) || 4})`,
    lag:         (col)     => `LAG(${quoteIdent(col)}, 1)`,
    lead:        (col)     => `LEAD(${quoteIdent(col)}, 1)`,
    firstValue:  (col)     => `FIRST_VALUE(${quoteIdent(col)})`,
    lastValue:   (col)     => `LAST_VALUE(${quoteIdent(col)})`,
    nthValue:    (col, n)  => `NTH_VALUE(${quoteIdent(col)}, ${parseInt(n) || 2})`,
};

// Строит массив оконных SELECT-выражений из объекта windowFns.
// Формат: { anyKey: { fn, col, n, partitionBy, orderBy, orderDir, alias } }
// Неизвестные fn пропускаются с предупреждением.
function buildWindowParts(windowFns) {
    if (!windowFns || typeof windowFns !== 'object') return [];

    const parts = [];

    for (const [key, cfg] of Object.entries(windowFns)) {
        const { fn, col, n, partitionBy, orderBy, orderDir = 'ASC', alias } = cfg;
        const fnKey = fn || key;
        const fnDef = WIN_FN_SQL[fnKey];

        if (!fnDef) {
            console.warn(`[rowRepo] buildWindowParts: неизвестная fn "${fnKey}" — пропускаем`);
            continue;
        }

        let fnExpr;
        if (typeof fnDef === 'function') {
            if (fnKey === 'ntile')         fnExpr = fnDef(n);
            else if (fnKey === 'nthValue') fnExpr = fnDef(col, n);
            else                           fnExpr = fnDef(col);
        } else {
            fnExpr = fnDef;
        }

        const overParts = [];
        if (partitionBy) overParts.push(`PARTITION BY ${quoteIdent(partitionBy)}`);
        if (orderBy)     overParts.push(`ORDER BY ${quoteIdent(orderBy)} ${orderDir.toUpperCase()}`);

        const overClause = overParts.length ? `OVER (${overParts.join(' ')})` : 'OVER ()';
        const safeAlias  = alias || `win_${fnKey}`;

        parts.push(`${fnExpr} ${overClause} AS ${quoteIdent(safeAlias)}`);
    }

    return parts;
}

// ── exports ───────────────────────────────────────────────────────────────────

// Выполняет гибкий SELECT с поддержкой фильтрации, агрегации, оконных функций и лимитов.
// Параметры:
//   filter/where   — объект WHERE-условий (where приоритетнее filter)
//   columns        — список колонок для SELECT (null = все)
//   aggregates     — объект агрегатных функций { alias: { fn, col, distinct } }
//   count/avg      — legacy-агрегаты, преобразуются в aggregates
//   groupBy        — имя колонки для GROUP BY
//   having         — строка условия HAVING (только с groupBy)
//   orderBy        — имя колонки для ORDER BY
//   orderDir       — направление сортировки (ASC/DESC и варианты с NULLS)
//   windowFns      — объект оконных функций
//   coalesce       — объект замены NULL-значений { col: defaultVal }
//   limit          — максимальное количество строк (число или 'all')
//   withSummary    — добавить итоговую строку через UNION ALL
export async function findByColumns(tableName, {
    filter      = null,
    columns     = null,
    count       = null,
    avg         = null,
    groupBy     = null,
    orderBy     = null,
    orderDir    = null,
    where       = null,
    aggregates  = null,
    having      = null,
    windowFns   = null,
    coalesce    = null,
    limit       = null,
    withSummary = null,
} = {}) {
    console.log(`[rowRepo] findByColumns table="${tableName}"`, { columns, where, groupBy, orderBy, limit });

    if (typeof columns === 'string') columns = [columns];
    if (!Array.isArray(columns) || columns.length === 0) columns = null;

    const coalesceMap = buildCoalesceMap(coalesce);

    // Legacy count/avg превращаем в aggregates для единообразия
    const mergedAggregates = { ...(aggregates || {}) };
    if (count) mergedAggregates['count_result'] = { fn: 'COUNT', col: count === '*' ? null : count };
    if (avg)   mergedAggregates['avg_result']   = { fn: 'AVG',   col: avg };

    const allSelectParts = [
        ...buildSelectParts(columns, mergedAggregates, coalesceMap),
        ...buildWindowParts(windowFns),
    ];

    let sql = `SELECT ${allSelectParts.join(',\n       ')}\nFROM ${quoteIdent(tableName)}`;

    // where приоритетнее legacy filter
    const whereClause = where
        ? buildWhereClause(where)
        : (filter ? buildWhereClause(filter) : '');

    if (whereClause) sql += `\nWHERE ${whereClause}`;

    if (groupBy) {
        sql += `\nGROUP BY ${quoteIdent(groupBy)}`;
        if (having && having.trim()) sql += `\nHAVING ${having.trim()}`;
    }

    if (orderBy) {
        const VALID_DIRS = ['ASC', 'DESC', 'ASC NULLS LAST', 'DESC NULLS LAST', 'ASC NULLS FIRST', 'DESC NULLS FIRST'];
        const dir = VALID_DIRS.includes((orderDir || '').toUpperCase()) ? orderDir.toUpperCase() : 'ASC';
        sql += `\nORDER BY ${quoteIdent(orderBy)} ${dir}`;
    }

    if (limit && limit !== 'all') {
        const safeLimit = parseInt(limit);
        if (!isNaN(safeLimit) && safeLimit > 0) sql += `\nLIMIT ${safeLimit}`;
    }

    // Итоговая строка: первая колонка = 'ИТОГО', остальные NULL
    if (withSummary) {
        const summaryParts = allSelectParts.map((_, i) => i === 0 ? `'ИТОГО'` : 'NULL');
        sql += `\n\nUNION ALL\n\nSELECT ${summaryParts.join(', ')}\nFROM ${quoteIdent(tableName)}`;
    }

    console.log(`[rowRepo] SQL:\n${sql}`);
    const { rows } = await pool.query(sql);
    console.log(`[rowRepo] findByColumns result: ${rows.length} rows`);
    return rows;
}

// Возвращает метаданные колонок и все строки таблицы (лимит 1000).
// Используется для отображения таблицы на фронте: columns — схема, data — данные.
export async function find(tableName) {
    console.log(`[rowRepo] find table="${tableName}"`);

    const { rows: columns } = await pool.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName]
    );

    const { rows: data } = await pool.query(
        `SELECT * FROM ${quoteIdent(tableName)} LIMIT 1000`
    );

    console.log(`[rowRepo] find result: ${data.length} rows, ${columns.length} columns`);
    return { columns, data };
}

// Вставляет новую строку в таблицу.
// Значение 'DEFAULT' подставляется как SQL-ключевое слово, остальные — параметрами $N.
export async function create(tableName, data) {
    console.log(`[rowRepo] create table="${tableName}"`, data);

    const keys   = Object.keys(data);
    const cols   = keys.map(k => quoteIdent(k)).join(', ');
    const values = [];
    const placeholders = keys.map(k => {
        if (data[k] === 'DEFAULT') return 'DEFAULT';
        values.push(data[k]);
        return `$${values.length}`;
    });

    const sql = `INSERT INTO ${quoteIdent(tableName)} (${cols}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const { rows } = await pool.query(sql, values);
    console.log(`[rowRepo] create result:`, rows[0]);
    return rows;
}

// Обновляет строку по значению фильтра (по умолчанию фильтр по колонке id).
// Значение 'DEFAULT' сбрасывает колонку к дефолту, null/''/'' — устанавливает NULL.
// Все значения передаются параметрами $N — не через шаблонные строки.
export async function replace(tableName, data, filterValue, filterColumn = 'id') {
    console.log(`[rowRepo] replace table="${tableName}" where ${filterColumn}=${filterValue}`, data);

    const keys = Object.keys(data);
    if (!keys.length) return null;

    const values = [];
    const sets = keys.map(k => {
        if (data[k] === 'DEFAULT') return `${quoteIdent(k)} = DEFAULT`;
        if (data[k] === null || data[k] === '') return `${quoteIdent(k)} = NULL`;
        values.push(data[k]);
        return `${quoteIdent(k)} = $${values.length}`;
    }).join(', ');

    values.push(filterValue);
    const sql = `UPDATE ${quoteIdent(tableName)} SET ${sets} WHERE ${quoteIdent(filterColumn)} = $${values.length} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    console.log(`[rowRepo] replace result: ${rows.length} rows`);
    return rows;
}

// Удаляет строку по значению указанной колонки.
// filterValue передаётся параметром $1 — не через шаблонную строку.
export async function remove(tableName, filterValue, filterColumn) {
    console.log(`[rowRepo] remove table="${tableName}" where ${filterColumn}=${filterValue}`);

    const values = [filterValue];
    const sql    = `DELETE FROM ${quoteIdent(tableName)} WHERE ${quoteIdent(filterColumn)} = $1 RETURNING *`;
    const { rows } = await pool.query(sql, values);
    console.log(`[rowRepo] remove result: ${rows.length} rows`);
    return rows;
}