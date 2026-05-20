import cron, { ScheduledTask } from 'node-cron';
import { prisma } from './prisma';
import { sendPromotion } from './promotions';

// Cache de tasks activas: promotionId -> ScheduledTask
const cronTasks = new Map<string, ScheduledTask>();
let oneShotTimer: NodeJS.Timeout | null = null;
let started = false;

/**
 * Inicializa el scheduler:
 *  - Carga promociones con cronExpr y las programa
 *  - Cada minuto revisa promociones con scheduledAt (one-shot)
 */
export function startScheduler() {
  if (started) return;
  started = true;
  console.log('[scheduler] starting...');

  void rehydrateCronJobs();

  // Revisión periódica de one-shot scheduled
  oneShotTimer = setInterval(() => {
    void runDueOneShots();
  }, 60_000);

  // Primera corrida inmediata
  void runDueOneShots();
}

async function rehydrateCronJobs() {
  const promos = await prisma.promotion.findMany({
    where: { active: true, cronExpr: { not: null } },
  });
  for (const p of promos) {
    schedulePromotionCron(p.id, p.cronExpr!);
  }
  console.log(`[scheduler] ${promos.length} cron promotions rescheduled`);
}

export function schedulePromotionCron(promotionId: string, cronExpr: string) {
  cancelPromotionCron(promotionId);
  if (!cron.validate(cronExpr)) {
    console.warn(`[scheduler] cron expr inválida: ${cronExpr}`);
    return;
  }
  const task = cron.schedule(cronExpr, async () => {
    try {
      const result = await sendPromotion(promotionId);
      console.log(`[scheduler] cron sent promo ${promotionId}:`, result);
    } catch (e) {
      console.error(`[scheduler] cron promo ${promotionId} failed:`, e);
    }
  });
  cronTasks.set(promotionId, task);
}

export function cancelPromotionCron(promotionId: string) {
  const existing = cronTasks.get(promotionId);
  if (existing) {
    existing.stop();
    cronTasks.delete(promotionId);
  }
}

async function runDueOneShots() {
  const now = new Date();
  const due = await prisma.promotion.findMany({
    where: {
      active: true,
      scheduledAt: { lte: now, not: null },
      lastSentAt: null,
    },
  });
  for (const p of due) {
    try {
      const result = await sendPromotion(p.id);
      console.log(`[scheduler] one-shot sent promo ${p.id}:`, result);
    } catch (e) {
      console.error(`[scheduler] one-shot promo ${p.id} failed:`, e);
    }
  }
}
