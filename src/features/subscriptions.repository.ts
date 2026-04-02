import type { Subscription } from "../types/Subscription";
import { getDataFromLocalStorage, setDataToLocalStorage } from "../utils/LocalStorage";

export interface SubscriptionRepository {
  getAll(): Subscription[];
  saveAll(subscriptions: Subscription[]): void;
  getNotificationHistory(): string[];
  saveNotificationHistory(history: string[]): void;
}

const SUBSCRIPTIONS_KEY = 'subscriptions';
const SUBSCRIPTION_NOTIFICATIONS_KEY = 'subscriptionNotifications';
const NOTIFICATION_HISTORY_RETENTION_MONTHS = 6;

const parseHistoryPeriod = (entry: string): { year: number; month: number } | null => {
  const parts = entry.split(':');
  if (parts.length < 3) return null;

  const period = parts[1];
  const [yearRaw, monthRaw] = period.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
};

const getMonthDiffFromNow = (year: number, month: number): number => {
  const now = new Date();
  const nowMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const entryMonthIndex = year * 12 + (month - 1);
  return nowMonthIndex - entryMonthIndex;
};

const pruneOldHistory = (history: string[]): string[] => {
  return history.filter((entry) => {
    const parsed = parseHistoryPeriod(entry);
    if (!parsed) return false;

    const diff = getMonthDiffFromNow(parsed.year, parsed.month);
    return diff >= 0 && diff <= NOTIFICATION_HISTORY_RETENTION_MONTHS;
  });
};

export class LocalStorageSubscriptionRepository implements SubscriptionRepository {
  getAll(): Subscription[] {
    return getDataFromLocalStorage<Subscription[]>(SUBSCRIPTIONS_KEY) ?? [];
  }

  saveAll(subscriptions: Subscription[]): void {
    setDataToLocalStorage(SUBSCRIPTIONS_KEY, subscriptions);
  }

  getNotificationHistory(): string[] {
    const raw = getDataFromLocalStorage<string[]>(SUBSCRIPTION_NOTIFICATIONS_KEY) ?? [];
    const pruned = pruneOldHistory(raw);

    if (pruned.length !== raw.length) {
      setDataToLocalStorage(SUBSCRIPTION_NOTIFICATIONS_KEY, pruned);
    }

    return pruned;
  }

  saveNotificationHistory(history: string[]): void {
    setDataToLocalStorage(SUBSCRIPTION_NOTIFICATIONS_KEY, pruneOldHistory(history));
  }
}
