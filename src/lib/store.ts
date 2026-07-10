import { create } from 'zustand';
import type { Plan, PlanItem, ScheduleEntry, ReviewCard, PlanOutput, KnowledgeEntry } from '@/lib/types';
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanItems,
  createPlanItem,
  updatePlanItem,
  deletePlanItem,
  bulkCreatePlanItems,
  getScheduleByDate,
  getScheduleByDateRange,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  bulkCreateScheduleEntries,
  shiftScheduleDates,
  getDueReviews,
  getUpcomingReviews,
  createReviewCard,
  updateReviewCard,
  getAllOutputs,
  getOutputsByPlan,
  createOutput,
  updateOutput,
  deleteOutput,
  searchOutputs,
  getAllKnowledgeEntries,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeByCategory,
  todayStr,
} from '@/lib/db';

interface PlanStore {
  // Plans
  plans: Plan[];
  currentPlan: Plan | null;
  loadPlans: () => Promise<void>;
  loadPlan: (id: string) => Promise<void>;
  addPlan: (plan: Plan) => Promise<string>;
  editPlan: (id: string, updates: Partial<Plan>) => Promise<void>;
  removePlan: (id: string) => Promise<void>;

  // PlanItems
  planItems: PlanItem[];
  loadPlanItems: (planId: string) => Promise<void>;
  addPlanItem: (item: PlanItem) => Promise<string>;
  editPlanItem: (id: string, updates: Partial<PlanItem>) => Promise<void>;
  removePlanItem: (id: string) => Promise<void>;
  bulkAddPlanItems: (items: PlanItem[]) => Promise<string[]>;

  // Schedule
  todaySchedule: ScheduleEntry[];
  weekSchedule: ScheduleEntry[];
  loadTodaySchedule: () => Promise<void>;
  loadWeekSchedule: (startDate?: string) => Promise<void>;
  addScheduleEntry: (entry: ScheduleEntry) => Promise<string>;
  editScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => Promise<void>;
  removeScheduleEntry: (id: string) => Promise<void>;
  bulkAddScheduleEntries: (entries: ScheduleEntry[]) => Promise<string[]>;
  postponePlan: (planId: string, fromDate: string, days: number) => Promise<void>;

  // Reviews
  dueReviews: ReviewCard[];
  upcomingReviews: ReviewCard[];
  loadDueReviews: () => Promise<void>;
  loadUpcomingReviews: () => Promise<void>;
  addReviewCard: (card: ReviewCard) => Promise<string>;
  editReviewCard: (id: string, updates: Partial<ReviewCard>) => Promise<void>;

  // Outputs
  outputs: PlanOutput[];
  planOutputs: PlanOutput[];
  loadAllOutputs: () => Promise<void>;
  loadPlanOutputs: (planId: string) => Promise<void>;
  addOutput: (output: PlanOutput) => Promise<string>;
  editOutput: (id: string, updates: Partial<PlanOutput>) => Promise<void>;
  removeOutput: (id: string) => Promise<void>;
  searchInOutputs: (query: string) => Promise<PlanOutput[]>;

  // Knowledge
  knowledgeEntries: KnowledgeEntry[];
  loadKnowledgeEntries: () => Promise<void>;
  addKnowledgeEntry: (entry: KnowledgeEntry) => Promise<string>;
  editKnowledgeEntry: (id: string, updates: Partial<KnowledgeEntry>) => Promise<void>;
  removeKnowledgeEntry: (id: string) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  // Plans
  plans: [],
  currentPlan: null,

  loadPlans: async () => {
    const plans = await getAllPlans();
    set({ plans });
  },

  loadPlan: async (id: string) => {
    const plan = await getPlanById(id);
    set({ currentPlan: plan || null });
  },

  addPlan: async (plan: Plan) => {
    const id = await createPlan(plan);
    await get().loadPlans();
    return id;
  },

  editPlan: async (id: string, updates: Partial<Plan>) => {
    await updatePlan(id, updates);
    await get().loadPlans();
    if (get().currentPlan?.id === id) {
      await get().loadPlan(id);
    }
  },

  removePlan: async (id: string) => {
    await deletePlan(id);
    set({ currentPlan: null, planItems: [] });
    await get().loadPlans();
  },

  // PlanItems
  planItems: [],

  loadPlanItems: async (planId: string) => {
    const items = await getPlanItems(planId);
    set({ planItems: items });
  },

  addPlanItem: async (item: PlanItem) => {
    const id = await createPlanItem(item);
    await get().loadPlanItems(item.planId);
    return id;
  },

  editPlanItem: async (id: string, updates: Partial<PlanItem>) => {
    await updatePlanItem(id, updates);
    const items = get().planItems;
    const item = items.find(i => i.id === id);
    if (item) {
      await get().loadPlanItems(item.planId);
    }
  },

  removePlanItem: async (id: string) => {
    const items = get().planItems;
    const item = items.find(i => i.id === id);
    await deletePlanItem(id);
    if (item) {
      await get().loadPlanItems(item.planId);
    }
  },

  bulkAddPlanItems: async (items: PlanItem[]) => {
    const ids = await bulkCreatePlanItems(items);
    if (items.length > 0) {
      await get().loadPlanItems(items[0].planId);
    }
    return ids;
  },

  // Schedule
  todaySchedule: [],
  weekSchedule: [],

  loadTodaySchedule: async () => {
    const today = todayStr();
    const schedule = await getScheduleByDate(today);
    set({ todaySchedule: schedule });
  },

  loadWeekSchedule: async (startDate?: string) => {
    const today = startDate || todayStr();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 6);
    const endStr = endDate.toISOString().split('T')[0];
    const schedule = await getScheduleByDateRange(today, endStr);
    set({ weekSchedule: schedule });
  },

  addScheduleEntry: async (entry: ScheduleEntry) => {
    const id = await createScheduleEntry(entry);
    await get().loadTodaySchedule();
    await get().loadWeekSchedule();
    return id;
  },

  editScheduleEntry: async (id: string, updates: Partial<ScheduleEntry>) => {
    await updateScheduleEntry(id, updates);
    await get().loadTodaySchedule();
    await get().loadWeekSchedule();
  },

  removeScheduleEntry: async (id: string) => {
    await deleteScheduleEntry(id);
    await get().loadTodaySchedule();
    await get().loadWeekSchedule();
  },

  bulkAddScheduleEntries: async (entries: ScheduleEntry[]) => {
    const ids = await bulkCreateScheduleEntries(entries);
    await get().loadTodaySchedule();
    await get().loadWeekSchedule();
    return ids;
  },

  postponePlan: async (planId: string, fromDate: string, days: number) => {
    await shiftScheduleDates(planId, fromDate, days);
    await get().loadTodaySchedule();
    await get().loadWeekSchedule();
  },

  // Reviews
  dueReviews: [],
  upcomingReviews: [],

  loadDueReviews: async () => {
    const reviews = await getDueReviews();
    set({ dueReviews: reviews });
  },

  loadUpcomingReviews: async () => {
    const reviews = await getUpcomingReviews(20);
    set({ upcomingReviews: reviews });
  },

  addReviewCard: async (card: ReviewCard) => {
    const id = await createReviewCard(card);
    await get().loadDueReviews();
    return id;
  },

  editReviewCard: async (id: string, updates: Partial<ReviewCard>) => {
    await updateReviewCard(id, updates);
    await get().loadDueReviews();
    await get().loadUpcomingReviews();
  },

  // Outputs
  outputs: [],
  planOutputs: [],

  loadAllOutputs: async () => {
    const outputs = await getAllOutputs();
    set({ outputs });
  },

  loadPlanOutputs: async (planId: string) => {
    const outputs = await getOutputsByPlan(planId);
    set({ planOutputs: outputs });
  },

  addOutput: async (output: PlanOutput) => {
    const id = await createOutput(output);
    await get().loadAllOutputs();
    return id;
  },

  editOutput: async (id: string, updates: Partial<PlanOutput>) => {
    await updateOutput(id, updates);
    await get().loadAllOutputs();
  },

  removeOutput: async (id: string) => {
    await deleteOutput(id);
    await get().loadAllOutputs();
  },

  searchInOutputs: async (query: string) => {
    return searchOutputs(query);
  },

  // Knowledge
  knowledgeEntries: [],

  loadKnowledgeEntries: async () => {
    const entries = await getAllKnowledgeEntries();
    set({ knowledgeEntries: entries });
  },

  addKnowledgeEntry: async (entry: KnowledgeEntry) => {
    const id = await createKnowledgeEntry(entry);
    await get().loadKnowledgeEntries();
    return id;
  },

  editKnowledgeEntry: async (id: string, updates: Partial<KnowledgeEntry>) => {
    await updateKnowledgeEntry(id, updates);
    await get().loadKnowledgeEntries();
  },

  removeKnowledgeEntry: async (id: string) => {
    await deleteKnowledgeEntry(id);
    await get().loadKnowledgeEntries();
  },
}));

// UI State Store
interface UIStore {
  sidebarOpen: boolean;
  calendarView: 'day' | 'week' | 'month';
  selectedDate: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCalendarView: (view: 'day' | 'week' | 'month') => void;
  setSelectedDate: (date: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  calendarView: 'week',
  selectedDate: todayStr(),

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setCalendarView: (view) => set({ calendarView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
