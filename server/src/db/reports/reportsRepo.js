import client from './reportsClient.js';

// Создаёт новую запись отчёта со статусом 'В ожидании...'.
// Все новые параметры (where, aggregates, windowFns и т.д.) упаковываются
// в jsonb-колонку config — так схема таблицы не меняется при добавлении фич.
// Старые поля (count, avg, group_by, order_by, order_dir) хранятся в своих колонках
// для обратной совместимости.
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
    console.log(`[reportsRepo] create table="${table_name}"`);

    const config = { where, aggregates, having, windowFns, coalesce, limit, withSummary };

    const sql = `
        INSERT INTO reports
            (table_name, title, filter, columns, count, avg, group_by, order_by, order_dir, config)
        VALUES
            ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10::jsonb)
        RETURNING *
    `;
    const values = [
        table_name,
        title,
        JSON.stringify(filter),
        JSON.stringify(columns),
        count,
        avg,
        groupBy,
        orderBy,
        orderDir,
        JSON.stringify(config),
    ];

    const { rows } = await client.query(sql, values);
    console.log(`[reportsRepo] create result id=${rows[0]?.id}`);
    return rows[0];
}

// Атомарно берёт один отчёт со статусом 'В ожидании...' и переводит его в 'В процессе...'.
// FOR UPDATE SKIP LOCKED гарантирует что два воркера не возьмут одну задачу одновременно.
export async function getPendingAndLock() {
    console.log(`[reportsRepo] getPendingAndLock`);

    const sql = `
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
        RETURNING reports.*
    `;
    const { rows } = await client.query(sql);
    console.log(`[reportsRepo] getPendingAndLock result:`, rows[0]?.id ?? 'no pending reports');
    return rows[0];
}

// Помечает отчёт как успешно завершённый, сохраняет путь к файлу и mime-тип.
export async function markDone(id, resultPath, mime) {
    console.log(`[reportsRepo] markDone id=${id} path="${resultPath}"`);

    await client.query(
        `UPDATE reports SET status='Готово', result_path=$2, mime=$3, finished_at=now() WHERE id=$1`,
        [id, resultPath, mime]
    );
}

// Помечает отчёт как упавший с ошибкой, сохраняет текст ошибки.
export async function markFailed(id, error) {
    console.log(`[reportsRepo] markFailed id=${id} error="${error}"`);

    await client.query(
        `UPDATE reports SET status='Ошибка', error=$2, finished_at=now() WHERE id=$1`,
        [id, String(error)]
    );
}

// Помечает отчёт как FILE_MISSING — файл был, но его больше нет на диске.
export async function markMissing(id) {
    console.log(`[reportsRepo] markMissing id=${id}`);

    await client.query(
        `UPDATE reports SET status='FILE_MISSING', result_path=NULL WHERE id=$1`,
        [id]
    );
}

// Возвращает полную запись отчёта по id или undefined если не найден.
export async function getReport(id) {
    console.log(`[reportsRepo] getReport id=${id}`);

    const { rows } = await client.query(`SELECT * FROM reports WHERE id=$1`, [id]);
    console.log(`[reportsRepo] getReport result:`, rows[0] ? `found` : `not found`);
    return rows[0];
}

// Удаляет запись отчёта из БД. Файл на диске удаляется отдельно в сервисе.
export async function removeReport(id) {
    console.log(`[reportsRepo] removeReport id=${id}`);

    await client.query(`DELETE FROM reports WHERE id=$1`, [id]);
    console.log(`[reportsRepo] removeReport done`);
}

// Возвращает список отчётов для таблицы, отсортированных по дате создания (новые первые).
// Не включает тяжёлые поля filter/columns — только то что нужно для списка на фронте.
export async function listReportByTable(tableName) {
    console.log(`[reportsRepo] listReportByTable table="${tableName}"`);

    const { rows } = await client.query(
        `SELECT id, table_name, title, status, result_path, mime, created_at, finished_at, config
         FROM reports
         WHERE table_name=$1
         ORDER BY created_at DESC`,
        [tableName]
    );
    console.log(`[reportsRepo] listReportByTable result: ${rows.length} reports`);
    return rows;
}