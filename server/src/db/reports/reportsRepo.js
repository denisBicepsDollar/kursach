import pool from './reportsClient.js';
import logger from '../../utils/logger.js';

export async function create({
                                 table_name,
                                 title       = null,
                                 filter      = null,
                                 columns     = null,
                                 where       = null,
                                 aggregates  = null,
                                 count       = null,
                                 avg         = null,
                                 groupBy     = null,
                                 having      = null,
                                 orderBy     = null,
                                 orderDir    = null,
                                 windowFns   = null,
                                 coalesce    = null,
                                 limit       = null,
                                 withSummary = null,
                             } = {}) {
    console.log(`[REPO] create → table_name: "${table_name}"`);

    // Все новые поля пакуем в одну jsonb-колонку config,
    // чтобы не менять структуру таблицы reports.
    // Если у тебя есть миграция — раскомментируй отдельные поля.
    const config = {
        where, aggregates, having, windowFns, coalesce, limit, withSummary,
    };

    console.log(`[REPO] config to save:`, JSON.stringify(config, null, 2));

    const query = `
        INSERT INTO reports (table_name, title, filter, columns, where_clause, count, avg, group_by, order_by, order_dir, config)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11::jsonb)
        RETURNING *
    `;

    const values = [
        table_name,
        title,
        JSON.stringify(filter),
        JSON.stringify(columns),
        JSON.stringify(where),          // дублируем в where_clause для обратной совместимости
        count,
        avg,
        groupBy,
        orderBy,
        orderDir,
        JSON.stringify(config),
    ];

    console.log(`[REPO] SQL values (без jsonb):`, [table_name, title, columns, count, avg, groupBy, orderBy, orderDir, limit]);

    const { rows } = await pool.query(query, values);

    console.log(`[REPO] inserted row id: ${rows[0]?.id}`);
    return rows[0];
}

export async function getPendingAndLock() {
    const query = `
        WITH next AS (
            SELECT id FROM reports
            WHERE status = 'В ожидании...'
            ORDER BY created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
                    )
        UPDATE reports
        SET status = 'В процессе...'
            FROM next
        WHERE reports.id = next.id
            RETURNING reports.*;`;
    const { rows } = await pool.query(query);
    return rows[0];
}
export async function markDone(id, resultPath, mime) {
    await pool.query(
        `UPDATE reports SET status='Готово', result_path=$2, mime=$3, finished_at=now() WHERE id = $1`,
        [id, resultPath, mime]
    );
}
export async function markFailed(id, error) {
    await pool.query(
        `UPDATE reports SET status='Ошибка', error=$2, finished_at=now() WHERE id = $1`,
        [id, error]
    );
}
export async function getReport(id) {
    const { rows } = await pool.query(`SELECT * FROM reports WHERE id = $1`, [id]);
    return rows[0];
}
export async function markMissing(id) {
    await pool.query(
        `UPDATE reports SET status='FILE_MISSING', result_path=NULL WHERE id=$1`,
        [id]
    );
}

export async function removeReport(id) {
    await pool.query(
        `DELETE FROM reports WHERE id=$1`,
        [id]
    );
}

export async function listReportByTable(tableName) {
    const { rows } = await pool.query(
        `SELECT id, table_name, title, status, result_path, mime, created_at, finished_at, config
         FROM reports
         WHERE table_name=$1
         ORDER BY created_at DESC;`,
        [tableName]
    );
    return rows;
}