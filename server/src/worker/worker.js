// ── worker.js ─────────────────────────────────────────────────────────────────
// Воркер для обработки очереди отчётов.
// Крутится в бесконечном цикле: берёт задачу → выполняет → берёт следующую.
// Если задач нет — ждёт pollMs миллисекунд перед следующей попыткой.
// Ошибки не роняют воркер — логируются и цикл продолжается.

import * as reportService from '../services/Reports/reportService.js';

export async function runWorker(pollMs = 1000) {
    console.log('[worker] запущен');

    while (true) {
        try {
            const did = await reportService.processNext();
            // Если задач не было — ждём перед следующим поллингом
            if (!did) await new Promise(resolve => setTimeout(resolve, pollMs));
        } catch (err) {
            console.error('[worker] ошибка:', err);
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }
    }
}