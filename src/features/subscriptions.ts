import type { Expense } from "../types/Expense";
import type { Subscription } from "../types/Subscription";
import { getDataFromLocalStorage, setDataToLocalStorage } from "../utils/LocalStorage";
import { getTodayLocalInputDateValue } from "../utils/general";
import { LocalStorageSubscriptionRepository, type SubscriptionRepository } from "./subscriptions.repository";
import { addNotificationCenterItem } from "./notifications";

let subscriptionRepository: SubscriptionRepository = new LocalStorageSubscriptionRepository();

export const setSubscriptionRepository = (repository: SubscriptionRepository): void => {
  subscriptionRepository = repository;
};

const pad2 = (value: number): string => value.toString().padStart(2, '0');

const getCurrentPeriodKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

const parseDateInput = (dateInput: string): Date => new Date(`${dateInput}T00:00:00`);

const getNotificationHistory = (): string[] => subscriptionRepository.getNotificationHistory();

const saveNotificationHistory = (history: string[]): void => {
  subscriptionRepository.saveNotificationHistory(history);
};

const buildNotificationKey = (subscriptionId: string, period: string, type: 'reminder' | 'charge'): string => {
  return `${subscriptionId}:${period}:${type}`;
};

const hasNotificationBeenSent = (key: string): boolean => {
  const history = getNotificationHistory();
  return history.includes(key);
};

const markNotificationAsSent = (key: string): void => {
  const history = getNotificationHistory();
  if (history.includes(key)) return;
  history.push(key);
  saveNotificationHistory(history);
};

export const getAllSubscriptions = (): Subscription[] => {
  return subscriptionRepository.getAll();
};

export const saveSubscriptions = (subscriptions: Subscription[]): void => {
  subscriptionRepository.saveAll(subscriptions);
};

export const upsertSubscription = (subscription: Subscription): void => {
  const current = getAllSubscriptions();
  const index = current.findIndex((item) => item.id === subscription.id);

  if (index >= 0) {
    current[index] = subscription;
  } else {
    current.unshift(subscription);
  }

  saveSubscriptions(current);
};

export const deleteSubscriptionById = (id: string): void => {
  const filtered = getAllSubscriptions().filter((item) => item.id !== id);
  saveSubscriptions(filtered);
};

export const confirmDeleteSubscription = (id: string): void => {
  const subscriptions = getAllSubscriptions();
  const subscription = subscriptions.find((item) => item.id === id);
  if (!subscription) return;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-popup-overlay';
  overlay.innerHTML = `
    <div class="confirm-popup">
      <div class="confirm-popup-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h3 class="confirm-popup-title">Eliminar Suscripción</h3>
      <p class="confirm-popup-message">¿Seguro que deseas eliminar <strong>${subscription.name}</strong> por <strong>$${subscription.amount.toFixed(2)}</strong>?</p>
      <div class="confirm-popup-buttons">
        <button class="confirm-popup-btn cancel" data-cancel>Cancelar</button>
        <button class="confirm-popup-btn danger" data-confirm>Eliminar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const cleanup = () => {
    overlay.remove();
  };

  const handleCancel = () => {
    cleanup();
  };

  const handleConfirm = () => {
    cleanup();
    deleteSubscriptionById(id);
    window.dispatchEvent(new CustomEvent('subscriptionDeleted'));
  };

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      handleCancel();
    }
  });

  overlay.querySelector('[data-cancel]')?.addEventListener('click', handleCancel);
  overlay.querySelector('[data-confirm]')?.addEventListener('click', handleConfirm);
};

export const toggleSubscriptionStatus = (id: string): void => {
  const subscriptions = getAllSubscriptions();
  const index = subscriptions.findIndex((item) => item.id === id);
  if (index === -1) return;

  const current = subscriptions[index];
  subscriptions[index] = {
    ...current,
    status: current.status === 'active' ? 'cancelled' : 'active',
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(subscriptions);
};

const hasSubscriptionStarted = (subscription: Subscription, today: Date): boolean => {
  const startDate = parseDateInput(subscription.startDate);
  return startDate.getTime() <= today.getTime();
};

const canNotify = (): boolean => {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
};

const getOneSignalSdk = (): any | null => {
  if (typeof window === 'undefined') return null;
  return (window as any).OneSignal || null;
};

export const getOneSignalSubscriptionState = async (): Promise<'subscribed' | 'not-subscribed' | 'unavailable'> => {
  if (typeof window === 'undefined') return 'unavailable';

  const deferred = (window as any).OneSignalDeferred;
  if (!Array.isArray(deferred)) return 'unavailable';

  return await new Promise((resolve) => {
    let settled = false;

    const finalize = (value: 'subscribed' | 'not-subscribed' | 'unavailable') => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timeoutId = window.setTimeout(() => finalize('unavailable'), 1500);

    deferred.push(async (oneSignal: any) => {
      try {
        const optedIn = oneSignal?.User?.PushSubscription?.optedIn;
        window.clearTimeout(timeoutId);
        finalize(optedIn ? 'subscribed' : 'not-subscribed');
      } catch {
        window.clearTimeout(timeoutId);
        finalize('unavailable');
      }
    });
  });
};

const sendPwaNotification = async (title: string, body: string): Promise<void> => {
  if (!canNotify()) return;

  const icon = '/icons/icon-192x192.png';

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag: `saveit-${Date.now()}`,
        });
        return;
      }
    }
  } catch {
    // Fallback below
  }

  new Notification(title, { body, icon });
};

export const getNotificationPermissionState = (): NotificationPermission | 'unsupported' => {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
};

export const requestSubscriptionNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (typeof Notification === 'undefined') return 'unsupported';

  const oneSignal = getOneSignalSdk();

  try {
    if (oneSignal?.Notifications?.requestPermission) {
      await oneSignal.Notifications.requestPermission();
      return Notification.permission;
    }
  } catch {
    // fallback nativo
  }

  return Notification.requestPermission();
};

export const getNextChargeDate = (subscription: Subscription, referenceDate: Date = new Date()): Date => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  if (subscription.billingDay >= currentDay) {
    return new Date(year, month, subscription.billingDay);
  }

  return new Date(year, month + 1, subscription.billingDay);
};

export const processSubscriptionsForToday = async (): Promise<{ generatedCount: number; reminderCount: number }> => {
  const subscriptions = getAllSubscriptions();
  const activeSubscriptions = subscriptions.filter((item) => item.status === 'active');

  if (activeSubscriptions.length === 0) {
    return { generatedCount: 0, reminderCount: 0 };
  }

  const today = new Date();
  const todayDay = today.getDate();
  const period = getCurrentPeriodKey(today);
  const todayInputDate = getTodayLocalInputDateValue();

  const expenses = getDataFromLocalStorage<Expense[]>('expenses') ?? [];

  let generatedCount = 0;
  let reminderCount = 0;

  for (const subscription of activeSubscriptions) {
    if (!hasSubscriptionStarted(subscription, today)) continue;

    const reminderDay = subscription.billingDay - subscription.notifyDaysBefore;

    if (subscription.notifyEnabled && subscription.notifyDaysBefore > 0 && todayDay === reminderDay && reminderDay >= 1) {
      const reminderKey = buildNotificationKey(subscription.id, period, 'reminder');
      if (!hasNotificationBeenSent(reminderKey)) {
        await sendPwaNotification(
          'Recordatorio de suscripción',
          `Mañana o pronto se cobrará ${subscription.name} por $${subscription.amount.toFixed(2)}.`
        );
        addNotificationCenterItem(
          'Recordatorio de suscripción',
          `Se aproxima el cobro de ${subscription.name} por $${subscription.amount.toFixed(2)}.`,
          'subscription_reminder'
        );
        markNotificationAsSent(reminderKey);
        reminderCount += 1;
      }
    }

    if (todayDay !== subscription.billingDay) continue;

    const existsForPeriod = expenses.some((expense) => (
      expense.subscriptionId === subscription.id && expense.subscriptionPeriod === period
    ));

    if (existsForPeriod) continue;

    const autoExpense: Expense = {
      id: crypto.randomUUID(),
      amount: subscription.amount,
      category: subscription.category,
      detail: `${subscription.name} (Suscripción)`,
      date: new Date(`${todayInputDate}T00:00:00`).toISOString(),
      source: 'subscription',
      subscriptionId: subscription.id,
      subscriptionPeriod: period,
    };

    expenses.unshift(autoExpense);
    generatedCount += 1;

    const chargeKey = buildNotificationKey(subscription.id, period, 'charge');
    if (!hasNotificationBeenSent(chargeKey)) {
      await sendPwaNotification(
        'Cobro de suscripción registrado',
        `Se registró ${subscription.name} por $${subscription.amount.toFixed(2)} en ${period}.`
      );
      addNotificationCenterItem(
        'Cobro de suscripción registrado',
        `${subscription.name}: $${subscription.amount.toFixed(2)} (${period}).`,
        'subscription_charge'
      );
      markNotificationAsSent(chargeKey);
    }
  }

  if (generatedCount > 0) {
    setDataToLocalStorage('expenses', expenses);
    setDataToLocalStorage('filteredExpenses', expenses);
  }

  return { generatedCount, reminderCount };
};
