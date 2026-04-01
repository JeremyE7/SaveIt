import { getDataFromLocalStorage, setDataToLocalStorage } from "../utils/LocalStorage";

export type NotificationCenterType = 'subscription_charge' | 'subscription_reminder' | 'system';

export interface NotificationCenterItem {
  id: string;
  title: string;
  body: string;
  type: NotificationCenterType;
  createdAt: string;
  read: boolean;
}

const NOTIFICATION_CENTER_KEY = 'notificationCenter';

export const getNotificationCenterItems = (): NotificationCenterItem[] => {
  return getDataFromLocalStorage<NotificationCenterItem[]>(NOTIFICATION_CENTER_KEY) ?? [];
};

const saveNotificationCenterItems = (items: NotificationCenterItem[]) => {
  setDataToLocalStorage(NOTIFICATION_CENTER_KEY, items);
};

const emitNotificationCenterUpdated = () => {
  window.dispatchEvent(new CustomEvent('notificationCenterUpdated'));
};

export const addNotificationCenterItem = (
  title: string,
  body: string,
  type: NotificationCenterType,
) => {
  const items = getNotificationCenterItems();
  items.unshift({
    id: crypto.randomUUID(),
    title,
    body,
    type,
    createdAt: new Date().toISOString(),
    read: false,
  });

  saveNotificationCenterItems(items.slice(0, 50));
  emitNotificationCenterUpdated();
};

export const getNotificationUnreadCount = (): number => {
  return getNotificationCenterItems().filter((item) => !item.read).length;
};

export const markAllNotificationsAsRead = () => {
  const items = getNotificationCenterItems();
  const updated = items.map((item) => ({ ...item, read: true }));
  saveNotificationCenterItems(updated);
  emitNotificationCenterUpdated();
};
