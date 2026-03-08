import pool from "./defaultClient.js";
import logger from "../../utils/logger.js";


function quoteIdent(name) {
    return `"${String(name).replace(/"/g, '""')}"`;
}

/** Безопасное экранирование строкового значения */
function quoteValue(val) {
    return `'${String(val).replace(/'/g, "''")}'`;
}

function buildWhereClause(whereObj) {
    console.log(`[BUILDER] buildWhereClause input:`, JSON.stringify(whereObj, null, 2));

    if (!whereObj || typeof whereObj !== 'object' || Array.isArray(whereObj)) {
        console.log(`[BUILDER] whereObj пустой или невалидный — пропускаем`);
        return '';
    }

    const NO_VALUE_OPS = new Set(['IS NULL', 'IS NOT NULL']);
    const parts = [];

    for (const [col, expr] of Object.entries(whereObj)) {
        console.log(`[BUILDER] WHERE обрабатываем колонку "${col}", expr:`, expr);

        const quotedCol = quoteIdent(col);

        // Новый формат: { op, value }
        if (expr && typeof expr === 'object' && expr.op) {
            const { op, value, value: value2 } = expr;
            const upperOp = op.toUpperCase().trim();

            if (NO_VALUE_OPS.has(upperOp)) {
                parts.push(`${quotedCol} ${upperOp}`);
                console.log(`[BUILDER] → ${quotedCol} ${upperOp}`);
                continue;
            }

            if (upperOp === 'BETWEEN') {
                const [from, to] = Array.isArray(value) ? value : [value, expr.value2 ?? ''];
                parts.push(`${quotedCol} BETWEEN ${quoteValue(from)} AND ${quoteValue(to)}`);
                console.log(`[BUILDER] → BETWEEN ${from} AND ${to}`);
                continue;
            }

            if (upperOp === 'IN' || upperOp === 'NOT IN') {
                const list = Array.isArray(value)
                    ? value
                    : String(value).split(',').map(s => s.trim());
                const inList = list.map(quoteValue).join(', ');
                parts.push(`${quotedCol} ${upperOp} (${inList})`);
                console.log(`[BUILDER] → ${upperOp} (${inList})`);
                continue;
            }

            if (upperOp === 'ILIKE' || upperOp === 'LIKE' || upperOp === 'NOT ILIKE' || upperOp === 'NOT LIKE') {
                const pattern = String(value).includes('%') ? value : `%${value}%`;
                parts.push(`${quotedCol} ${upperOp} ${quoteValue(pattern)}`);
                console.log(`[BUILDER] → ${upperOp} ${pattern}`);
                continue;
            }

            // =, !=, >, >=, <, <=
            const safeVal = String(value).trim();
            // Если значение выглядит как boolean
            if (safeVal === 'true' || safeVal === 'false') {
                parts.push(`${quotedCol} ${upperOp} ${safeVal}`);
            } else if (!isNaN(safeVal) && safeVal !== '') {
                // Числовое — без кавычек
                parts.push(`${quotedCol} ${upperOp} ${safeVal}`);
            } else {
                parts.push(`${quotedCol} ${upperOp} ${quoteValue(safeVal)}`);
            }
            console.log(`[BUILDER] → ${quotedCol} ${upperOp} ${safeVal}`);
            continue;
        }

        // Старый формат (строка): обратная совместимость
        const rawExpr = String(expr).trim();
        parts.push(`${quotedCol} ${rawExpr}`);
        console.log(`[BUILDER] WHERE (legacy) → ${quotedCol} ${rawExpr}`);
    }

    const result = parts.join(' AND ');
    console.log(`[BUILDER] WHERE clause:`, result);
    return result;
}

/**
 * Конвертирует coalesce-объект { col: defaultVal } в SELECT-выражения.
 * Возвращает Map: colName → sqlExpr, чтобы заменить голые имена колонок.
 */
function buildCoalesceMap(coalesceObj) {
    console.log(`[BUILDER] buildCoalesceMap:`, coalesceObj);

    const map = new Map(); // col → "COALESCE("col", default)"
    if (!coalesceObj || typeof coalesceObj !== 'object') return map;

    for (const [col, def] of Object.entries(coalesceObj)) {
        const defaultExpr = String(def).trim();
        // Определяем — число или строка
        const defaultSql = (!isNaN(defaultExpr) && defaultExpr !== '')
            ? defaultExpr
            : quoteValue(defaultExpr);
        map.set(col, `COALESCE(${quoteIdent(col)}, ${defaultSql}) AS ${quoteIdent(col)}`);
        console.log(`[BUILDER] COALESCE: "${col}" → ${map.get(col)}`);
    }

    return map;
}

/**
 * Строит SELECT-выражения с учётом coalesce-обёрток.
 */
function buildSelectParts(columns, aggregates, coalesceMap) {
    console.log(`[BUILDER] buildSelectParts → columns:`, columns, `| aggregates:`, JSON.stringify(aggregates, null, 2));

    const parts = [];

    // Обычные колонки
    if (Array.isArray(columns) && columns.length > 0) {
        for (const col of columns) {
            if (col === '*') {
                parts.push('*');
            } else if (coalesceMap.has(col)) {
                parts.push(coalesceMap.get(col));
            } else {
                parts.push(quoteIdent(col));
            }
        }
    } else if (!aggregates || Object.keys(aggregates).length === 0) {
        parts.push('*');
    }

    // Агрегации
    if (aggregates && typeof aggregates === 'object') {
        for (const [alias, agg] of Object.entries(aggregates)) {
            const { fn, col, distinct } = agg;
            const upperFn = fn.toUpperCase();
            const colExpr = (!col || col === '*') ? '*' : quoteIdent(col);
            const distinctKw = distinct ? 'DISTINCT ' : '';

            let expr;
            if (upperFn === 'MEDIAN') {
                expr = `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${colExpr})`;
            } else {
                expr = `${upperFn}(${distinctKw}${colExpr})`;
            }

            parts.push(`${expr} AS ${quoteIdent(alias)}`);
            console.log(`[BUILDER] AGG: ${expr} AS "${alias}"`);
        }
    }

    console.log(`[BUILDER] SELECT parts:`, parts);
    return parts;
}

/**
 * Карта fn-ключей фронта → SQL-имена функций.
 */
const WIN_FN_SQL = {
    rowNumber:   'ROW_NUMBER()',
    rank:        'RANK()',
    denseRank:   'DENSE_RANK()',
    percentRank: 'PERCENT_RANK()',
    cumeDist:    'CUME_DIST()',
    ntile:       (n) => `NTILE(${parseInt(n) || 4})`,
    lag:         (col) => `LAG(${quoteIdent(col)}, 1)`,
    lead:        (col) => `LEAD(${quoteIdent(col)}, 1)`,
    firstValue:  (col) => `FIRST_VALUE(${quoteIdent(col)})`,
    lastValue:   (col) => `LAST_VALUE(${quoteIdent(col)})`,
    nthValue:    (col, n) => `NTH_VALUE(${quoteIdent(col)}, ${parseInt(n) || 2})`,
};

/**
 * Строит оконные SELECT-выражения из windowFns-объекта.
 */
function buildWindowParts(windowFns) {
    console.log(`[BUILDER] buildWindowParts:`, JSON.stringify(windowFns, null, 2));

    if (!windowFns || typeof windowFns !== 'object') return [];

    const parts = [];

    for (const [key, cfg] of Object.entries(windowFns)) {
        const { fn, col, n, partitionBy, orderBy, orderDir = 'ASC', alias } = cfg;

        console.log(`[BUILDER] WINDOW fn="${fn}", col="${col}", n=${n}, orderBy="${orderBy}", alias="${alias}"`);

        // Получаем SQL-функцию
        const fnKey = fn || key;
        const fnDef = WIN_FN_SQL[fnKey];
        if (!fnDef) {
            console.warn(`[BUILDER] WINDOW unknown fn: "${fnKey}" — пропускаем`);
            continue;
        }

        let fnExpr;
        if (typeof fnDef === 'function') {
            // ntile → n, остальные с col → col, nthValue → col + n
            if (fnKey === 'ntile')    fnExpr = fnDef(n);
            else if (fnKey === 'nthValue') fnExpr = fnDef(col, n);
            else fnExpr = fnDef(col);
        } else {
            fnExpr = fnDef; // строка: RANK(), ROW_NUMBER() и т.д.
        }

        // OVER (...)
        const overParts = [];
        if (partitionBy) overParts.push(`PARTITION BY ${quoteIdent(partitionBy)}`);
        if (orderBy)     overParts.push(`ORDER BY ${quoteIdent(orderBy)} ${orderDir.toUpperCase()}`);

        const overClause = overParts.length ? `OVER (${overParts.join(' ')})` : 'OVER ()';
        const safeAlias  = alias || `win_${fnKey}`;
        const expr       = `${fnExpr} ${overClause} AS ${quoteIdent(safeAlias)}`;

        parts.push(expr);
        console.log(`[BUILDER] WINDOW expr: ${expr}`);
    }

    return parts;
}


// ── главная функция ───────────────────────────────────────────────

export async function findByColumns(tableName, {
    // старые поля
    filter   = null,
    columns  = null,
    count    = null,
    avg      = null,
    groupBy  = null,
    orderBy  = null,
    orderDir = null,
    // новые поля
    where       = null,
    aggregates  = null,
    having      = null,
    windowFns   = null,
    coalesce    = null,
    limit       = null,
    withSummary = null,
} = {}) {

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[BUILDER] findByColumns → table: "${tableName}"`);
    console.log(`[BUILDER] params:`, JSON.stringify({
        columns, where, aggregates, having, groupBy, orderBy, orderDir,
        windowFns: windowFns ? Object.keys(windowFns) : null,
        coalesce, limit, withSummary,
    }, null, 2));

    // ── Нормализация columns ─────────────────────────────────────
    if (typeof columns === 'string') columns = [columns];
    if (!Array.isArray(columns) || columns.length === 0) columns = null;
    console.log(`[BUILDER] columns after normalize:`, columns);

    // ── COALESCE map ─────────────────────────────────────────────
    const coalesceMap = buildCoalesceMap(coalesce);

    // ── SELECT ───────────────────────────────────────────────────

    // Старая совместимость: count/avg → превращаем в aggregates
    const mergedAggregates = { ...(aggregates || {}) };
    if (count) {
        mergedAggregates['count_result'] = { fn: 'COUNT', col: count === '*' ? null : count };
        console.log(`[BUILDER] legacy count → добавлен в aggregates`);
    }
    if (avg) {
        mergedAggregates['avg_result'] = { fn: 'AVG', col: avg };
        console.log(`[BUILDER] legacy avg → добавлен в aggregates`);
    }

    const selectParts = buildSelectParts(columns, mergedAggregates, coalesceMap);
    const windowParts = buildWindowParts(windowFns);
    const allSelectParts = [...selectParts, ...windowParts];

    console.log(`[BUILDER] final SELECT parts (${allSelectParts.length}):`, allSelectParts);

    let sql = `SELECT ${allSelectParts.join(',\n       ')}\nFROM ${quoteIdent(tableName)}`;
    console.log(`[BUILDER] после SELECT+FROM:\n${sql}`);

    // ── WHERE ────────────────────────────────────────────────────
    // Новый формат приоритетнее
    const whereClause = where
        ? buildWhereClause(where)
        : (filter ? buildWhereClause(filter) : '');   // legacy filter

    if (whereClause) {
        sql += `\nWHERE ${whereClause}`;
        console.log(`[BUILDER] после WHERE:\n${sql}`);
    } else {
        console.log(`[BUILDER] WHERE — пропущен`);
    }

    // ── GROUP BY ─────────────────────────────────────────────────
    if (groupBy) {
        sql += `\nGROUP BY ${quoteIdent(groupBy)}`;
        console.log(`[BUILDER] после GROUP BY:\n${sql}`);

        if (having && having.trim()) {
            sql += `\nHAVING ${having.trim()}`;
            console.log(`[BUILDER] после HAVING:\n${sql}`);
        }
    }

    // ── ORDER BY ─────────────────────────────────────────────────
    if (orderBy) {
        const dir = ['ASC','DESC','ASC NULLS LAST','DESC NULLS LAST','ASC NULLS FIRST','DESC NULLS FIRST']
            .includes((orderDir || '').toUpperCase())
            ? orderDir.toUpperCase()
            : 'ASC';
        sql += `\nORDER BY ${quoteIdent(orderBy)} ${dir}`;
        console.log(`[BUILDER] после ORDER BY:\n${sql}`);
    }

    // ── LIMIT ────────────────────────────────────────────────────
    if (limit && limit !== 'all') {
        const safeLimit = parseInt(limit);
        if (!isNaN(safeLimit) && safeLimit > 0) {
            sql += `\nLIMIT ${safeLimit}`;
            console.log(`[BUILDER] после LIMIT:\n${sql}`);
        }
    }

    // ── UNION ALL итоговая строка ─────────────────────────────────
    if (withSummary) {
        // Простая итоговая строка: COUNT(*) + SUM/AVG по числовым агрегатам
        const summarySelects = allSelectParts.map((part, i) => {
            // Первую колонку — метка
            if (i === 0) return `'ИТОГО'`;
            return 'NULL';
        });
        sql += `\n\nUNION ALL\n\nSELECT ${summarySelects.join(', ')}\nFROM ${quoteIdent(tableName)}`;
        console.log(`[BUILDER] после UNION ALL (summary):\n${sql}`);
    }

    console.log(`\n[BUILDER] ══ ИТОГОВЫЙ SQL ══\n${sql}\n${'='.repeat(60)}\n`);
    logger.debug(`[SQL] ${sql}`);

    const { rows } = await pool.query(sql);

    console.log(`[BUILDER] результат: ${rows.length} строк`);
    return rows;
}

export async function find(tableName) {
    // безопасный идентификатор
    const safeTable = quoteIdent(tableName);

    // Получаем метаданные колонок
    const colsSql = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `;
    const { rows: columns } = await pool.query(colsSql, [tableName]);

    // Получаем данные
    const dataSql = `SELECT * FROM ${safeTable} LIMIT 1000;`;
    const { rows: data } = await pool.query(dataSql);

    return { columns, data };
}

export async function create(tableName, data){
    const keys = Object.keys(data);
    const cols = keys.map(key => `"${key}"`).join(', ');

    const values = [];
    const placeholders = keys.map(key => {
        if (data[key] === 'DEFAULT') return 'DEFAULT'; // вшиваем в запрос, не в параметры
        values.push(data[key]);
        return `$${values.length}`;
    });

    const query = `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders.join(', ')}) RETURNING *`;

    const results = await pool.query(query, values);
    return results.rows;
}
export async function replace(tableName, data, filterValue, filterColumn = 'id') {
    const keys = Object.keys(data);
    if (!keys.length) return null;
    const sets = keys.map(key => {
        if (data[key] === 'DEFAULT') return `"${key}" = DEFAULT`;
        if (data[key] === null || data[key] === '') return `"${key}" = NULL`;
        return `"${key}" = '${data[key]}'`;
    }).join(', ');
    const query = `UPDATE ${tableName} SET ${sets} WHERE ${filterColumn} = '${filterValue}' RETURNING *;`;
    const results = await pool.query(query);
    return results.rows;
}

export async function remove(tableName, filterValue, filterColumn) {
    const query = `DELETE FROM ${tableName} WHERE ${filterColumn} = '${filterValue}' RETURNING *;`;
    const results = await pool.query(query);
    return results.rows;
}
