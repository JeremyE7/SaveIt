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

export class LocalStorageSubscriptionRepository implements SubscriptionRepository {
  getAll(): Subscription[] {
    return getDataFromLocalStorage<Subscription[]>(SUBSCRIPTIONS_KEY) ?? [];
  }

  saveAll(subscriptions: Subscription[]): void {
    setDataToLocalStorage(SUBSCRIPTIONS_KEY, subscriptions);
  }

  getNotificationHistory(): string[] {
    return getDataFromLocalStorage<string[]>(SUBSCRIPTION_NOTIFICATIONS_KEY) ?? [];
  }

  saveNotificationHistory(history: string[]): void {
    setDataToLocalStorage(SUBSCRIPTION_NOTIFICATIONS_KEY, history);
  }
}
