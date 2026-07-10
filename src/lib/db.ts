import Dexie, { type EntityTable } from 'dexie';
import type { Plan, PlanItem, ScheduleEntry, ReviewCard, PlanOutput, AppSettings } from './types';

class PlanDatabase extends Dexie {
  plans!: EntityTable<Plan, 'id'>;
  planItems!: EntityTable<PlanItem, 'id'>;
  scheduleEntries!: EntityTable<ScheduleEntry, 'id'>;
  reviewCards!: EntityTable<ReviewCard, 'id'>;
  planOutputs!: EntityTable<PlanOutput, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('OneClickPlanDB');

    this.version(1).stores({
      plans: 'id, status, createdAt',
      planItems: 'id, planId, order, type',
      scheduleEntries: 'id, planItemId, planId, date, status, isCompleted',
      reviewCards: 'id, planItemId, planId, nextReviewDate, status',
      planOutputs: 'id, planId, planItemId, createdAt',
      settings: 'id',
    });

    // v2: 给 planOutputs 添加 updatedAt 索引
    this.version(2).stores({
      planOutputs: 'id, planId, planItemId, createdAt, updatedAt',
    });
  }
}

export const db = new PlanDatabase();

// ========== Plan 操作 ==========

export async function getAllPlans(): Promise<Plan[]> {
  return db.plans.orderBy('createdAt').reverse().toArray();
}

export async function getPlanById(id: string): Promise<Plan | undefined> {
  return db.plans.get(id);
}

export async function createPlan(plan: Plan): Promise<string> {
  return db.plans.add(plan);
}

export async function updatePlan(id: string, updates: Partial<Plan>): Promise<number> {
  return db.plans.update(id, { ...updates, updatedAt: new Date() });
}

export async function deletePlan(id: string): Promise<void> {
  await db.transaction('rw', db.plans, db.planItems, db.scheduleEntries, db.reviewCards, db.planOutputs, async () => {
    await db.plans.delete(id);
    await db.planItems.where('planId').equals(id).delete();
    await db.scheduleEntries.where('planId').equals(id).delete();
    await db.reviewCards.where('planId').equals(id).delete();
    await db.planOutputs.where('planId').equals(id).delete();
  });
}

// ========== PlanItem 操作 ==========

export async function getPlanItems(planId: string): Promise<PlanItem[]> {
  return db.planItems.where('planId').equals(planId).sortBy('order');
}

export async function getPlanItemById(id: string): Promise<PlanItem | undefined> {
  return db.planItems.get(id);
}

export async function createPlanItem(item: PlanItem): Promise<string> {
  return db.planItems.add(item);
}

export async function updatePlanItem(id: string, updates: Partial<PlanItem>): Promise<number> {
  return db.planItems.update(id, { ...updates, updatedAt: new Date() });
}

export async function deletePlanItem(id: string): Promise<void> {
  await db.transaction('rw', db.planItems, db.scheduleEntries, db.reviewCards, async () => {
    await db.planItems.delete(id);
    await db.scheduleEntries.where('planItemId').equals(id).delete();
    await db.reviewCards.where('planItemId').equals(id).delete();
  });
}

export async function bulkCreatePlanItems(items: PlanItem[]): Promise<string[]> {
  return db.planItems.bulkAdd(items, { allKeys: true }) as Promise<string[]>;
}

// ========== ScheduleEntry 操作 ==========

export async function getScheduleByDate(date: string): Promise<ScheduleEntry[]> {
  return db.scheduleEntries.where('date').equals(date).toArray();
}

export async function getScheduleByDateRange(startDate: string, endDate: string): Promise<ScheduleEntry[]> {
  return db.scheduleEntries
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

export async function getScheduleByPlan(planId: string): Promise<ScheduleEntry[]> {
  return db.scheduleEntries.where('planId').equals(planId).toArray();
}

export async function createScheduleEntry(entry: ScheduleEntry): Promise<string> {
  return db.scheduleEntries.add(entry);
}

export async function updateScheduleEntry(id: string, updates: Partial<ScheduleEntry>): Promise<number> {
  return db.scheduleEntries.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  await db.scheduleEntries.delete(id);
}

export async function bulkCreateScheduleEntries(entries: ScheduleEntry[]): Promise<string[]> {
  return db.scheduleEntries.bulkAdd(entries, { allKeys: true }) as Promise<string[]>;
}

export async function shiftScheduleDates(
  planId: string,
  fromDate: string,
  daysToShift: number
): Promise<void> {
  const entries = await db.scheduleEntries
    .where('planId').equals(planId)
    .and(e => e.date >= fromDate && e.status !== 'completed')
    .toArray();

  for (const entry of entries) {
    const newDate = shiftDate(entry.date, daysToShift);
    await db.scheduleEntries.update(entry.id, { date: newDate, updatedAt: new Date() });
  }
}

// ========== ReviewCard 操作 ==========

export async function getDueReviews(): Promise<ReviewCard[]> {
  const today = formatDate(new Date());
  return db.reviewCards
    .where('nextReviewDate')
    .equals(today)
    .and(card => card.status === 'due')
    .toArray();
}

export async function getUpcomingReviews(limit = 10): Promise<ReviewCard[]> {
  const today = formatDate(new Date());
  return db.reviewCards
    .where('nextReviewDate')
    .above(today)
    .and(card => card.status === 'upcoming')
    .limit(limit)
    .toArray();
}

export async function getReviewCardsByPlanItem(planItemId: string): Promise<ReviewCard | undefined> {
  return db.reviewCards.where('planItemId').equals(planItemId).first();
}

export async function createReviewCard(card: ReviewCard): Promise<string> {
  return db.reviewCards.add(card);
}

export async function updateReviewCard(id: string, updates: Partial<ReviewCard>): Promise<number> {
  return db.reviewCards.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteReviewCard(id: string): Promise<void> {
  await db.reviewCards.delete(id);
}

// ========== PlanOutput 操作 ==========

export async function getOutputsByPlan(planId: string): Promise<PlanOutput[]> {
  return db.planOutputs.where('planId').equals(planId).toArray();
}

export async function getAllOutputs(): Promise<PlanOutput[]> {
  return db.planOutputs.orderBy('updatedAt').reverse().toArray();
}

export async function getOutputById(id: string): Promise<PlanOutput | undefined> {
  return db.planOutputs.get(id);
}

export async function createOutput(output: PlanOutput): Promise<string> {
  return db.planOutputs.add(output);
}

export async function updateOutput(id: string, updates: Partial<PlanOutput>): Promise<number> {
  return db.planOutputs.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteOutput(id: string): Promise<void> {
  await db.planOutputs.delete(id);
}

export async function searchOutputs(query: string): Promise<PlanOutput[]> {
  const lower = query.toLowerCase();
  return db.planOutputs
    .filter(
      o =>
        o.title.toLowerCase().includes(lower) ||
        o.content.toLowerCase().includes(lower) ||
        o.tags.some(t => t.toLowerCase().includes(lower))
    )
    .toArray();
}

// ========== Settings 操作 ==========

const SETTINGS_KEY = 'default';

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get(SETTINGS_KEY);
  if (!settings) {
    const defaultSettings: AppSettings = {
      id: SETTINGS_KEY,
      aiProvider: 'openai',
      aiApiKey: '',
      aiModel: 'gpt-4o',
      aiBaseUrl: '',
      notificationsEnabled: true,
      notificationAdvanceMinutes: 15,
      defaultReviewStrategy: 'sm2',
      defaultReviewIntervals: [1, 3, 7, 15, 30],
    };
    await db.settings.put({ ...defaultSettings, id: SETTINGS_KEY });
    return defaultSettings;
  }
  return settings;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<number> {
  const current = await getSettings();
  return db.settings.update(SETTINGS_KEY, { ...current, ...updates });
}

// ========== 工具函数 ==========

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}
