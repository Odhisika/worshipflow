const STORAGE_KEY = 'worshipflow_schedules_v2';

export interface ScheduleActivity {
  id: string;
  name: string;
  duration_minutes: number;
  order_index: number;
  background_path: string | null;
  background_type: 'image' | 'video' | 'none';
  font_family: string;
  font_size: number;
  font_color: string;
  font_weight: 'normal' | 'bold';
  text_align: 'left' | 'center' | 'right';
  content: string;
  content_type: 'text' | 'song' | 'bible' | 'media';
  media_path: string | null;
}

export interface ScheduleDay {
  id: string;
  date: string;
  title: string;
  activities: ScheduleActivity[];
  created_at: string;
  updated_at: string;
}

let cache: ScheduleDay[] | null = null;

function loadAll(): ScheduleDay[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : [];
    return cache!;
  } catch {
    cache = [];
    return cache;
  }
}

function persist(schedules: ScheduleDay[]) {
  cache = schedules;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  window.dispatchEvent(new CustomEvent('schedule-changed'));
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const scheduleApi = {
  getAll(): ScheduleDay[] {
    return loadAll();
  },

  getByDate(date: string): ScheduleDay | null {
    const all = loadAll();
    return all.find(s => s.date === date) || null;
  },

  getToday(): ScheduleDay | null {
    const today = new Date().toISOString().slice(0, 10);
    return this.getByDate(today);
  },

  getById(id: string): ScheduleDay | null {
    const all = loadAll();
    return all.find(s => s.id === id) || null;
  },

  create(schedule: { date: string; title: string }): ScheduleDay {
    const all = loadAll();
    const existing = all.findIndex(s => s.date === schedule.date);
    const now = new Date().toISOString();
    const newSchedule: ScheduleDay = {
      id: generateId(),
      date: schedule.date,
      title: schedule.title,
      activities: [],
      created_at: now,
      updated_at: now,
    };
    if (existing >= 0) {
      all[existing] = { ...all[existing], ...newSchedule, created_at: all[existing].created_at };
    } else {
      all.push(newSchedule);
    }
    persist(all);
    return newSchedule;
  },

  update(id: string, patch: Partial<Pick<ScheduleDay, 'title' | 'date'>>): ScheduleDay | null {
    const all = loadAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
    persist(all);
    return all[idx];
  },

  delete(id: string): void {
    const all = loadAll();
    const filtered = all.filter(s => s.id !== id);
    persist(filtered);
  },

  addActivity(scheduleId: string, activity: Omit<ScheduleActivity, 'id' | 'order_index'>): ScheduleActivity | null {
    const all = loadAll();
    const schedule = all.find(s => s.id === scheduleId);
    if (!schedule) return null;
    const newActivity: ScheduleActivity = {
      ...activity,
      id: generateId(),
      order_index: schedule.activities.length,
    };
    schedule.activities.push(newActivity);
    schedule.updated_at = new Date().toISOString();
    persist(all);
    return newActivity;
  },

  updateActivity(scheduleId: string, activityId: string, patch: Partial<ScheduleActivity>): ScheduleActivity | null {
    const all = loadAll();
    const schedule = all.find(s => s.id === scheduleId);
    if (!schedule) return null;
    const idx = schedule.activities.findIndex(a => a.id === activityId);
    if (idx < 0) return null;
    schedule.activities[idx] = { ...schedule.activities[idx], ...patch };
    schedule.updated_at = new Date().toISOString();
    persist(all);
    return schedule.activities[idx];
  },

  deleteActivity(scheduleId: string, activityId: string): void {
    const all = loadAll();
    const schedule = all.find(s => s.id === scheduleId);
    if (!schedule) return;
    schedule.activities = schedule.activities
      .filter(a => a.id !== activityId)
      .map((a, i) => ({ ...a, order_index: i }));
    schedule.updated_at = new Date().toISOString();
    persist(all);
  },

  reorderActivities(scheduleId: string, activityIds: string[]): void {
    const all = loadAll();
    const schedule = all.find(s => s.id === scheduleId);
    if (!schedule) return;
    const map = new Map(schedule.activities.map(a => [a.id, a]));
    schedule.activities = activityIds
      .map((id, i) => {
        const a = map.get(id);
        return a ? { ...a, order_index: i } : null;
      })
      .filter((a): a is ScheduleActivity => a !== null);
    schedule.updated_at = new Date().toISOString();
    persist(all);
  },
};
