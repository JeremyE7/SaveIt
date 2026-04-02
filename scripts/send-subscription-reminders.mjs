import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
const timeZone = process.env.NOTIFICATION_TIMEZONE || 'America/Guayaquil';
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
const dryRun = (process.env.DRY_RUN || '').toLowerCase() === 'true';
const HISTORY_RETENTION_MONTHS = Number(process.env.NOTIFICATION_HISTORY_MONTHS || 6);
const forceSendActive = (process.env.FORCE_SEND_ACTIVE || '').toLowerCase() === 'true';

if (!serviceAccountJson) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
}

if (!oneSignalAppId || !oneSignalApiKey) {
  throw new Error('Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY');
}

const serviceAccount = JSON.parse(serviceAccountJson);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore(admin.app(), firestoreDatabaseId);

const getDatePartsInTZ = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(byType.year);
  const month = Number(byType.month);
  const day = Number(byType.day);

  return {
    year,
    month,
    day,
    isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    period: `${year}-${String(month).padStart(2, '0')}`,
  };
};

const parseHistoryPeriod = (entry) => {
  const parts = String(entry || '').split(':');
  if (parts.length < 3) return null;

  const [yearRaw, monthRaw] = parts[1].split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
};

const monthDiff = (year, month, referenceYear, referenceMonth) => {
  const currentIndex = referenceYear * 12 + (referenceMonth - 1);
  const entryIndex = year * 12 + (month - 1);
  return currentIndex - entryIndex;
};

const pruneHistory = (history, referenceYear, referenceMonth) => {
  return history.filter((entry) => {
    const parsed = parseHistoryPeriod(entry);
    if (!parsed) return false;

    const diff = monthDiff(parsed.year, parsed.month, referenceYear, referenceMonth);
    return diff >= 0 && diff <= HISTORY_RETENTION_MONTHS;
  });
};

const sendPush = async ({ externalId, title, body, data }) => {
  const payload = {
    app_id: oneSignalAppId,
    include_aliases: {
      external_id: [externalId],
    },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body },
    data,
  };

  if (dryRun) {
    console.log('[DRY_RUN] Push payload:', JSON.stringify(payload));
    return;
  }

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${oneSignalApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OneSignal error (${response.status}): ${text}`);
  }
};

const run = async () => {
  const today = getDatePartsInTZ();
  console.log(`[start] timezone=${timeZone} date=${today.isoDate} period=${today.period} db=${firestoreDatabaseId} project=${serviceAccount.project_id} forceSendActive=${forceSendActive}`);

  try {
    const rootCollections = await db.listCollections();
    const rootIds = rootCollections.map((col) => col.id).sort();
    console.log(`[debug] rootCollections=${rootIds.join(',') || '(none)'}`);
  } catch (error) {
    console.log('[debug] rootCollections=unavailable', error?.message || error);
  }

  const usersSnap = await db.collection('users').get();
  let userRefs = usersSnap.docs.map((doc) => doc.ref);

  if (userRefs.length === 0) {
    const appDataGroupSnap = await db.collectionGroup('appData').get();
    const mainDocs = appDataGroupSnap.docs.filter((doc) => doc.id === 'main');

    const refsByUid = new Map();
    mainDocs.forEach((doc) => {
      const parentUserRef = doc.ref.parent.parent;
      if (parentUserRef && parentUserRef.parent.id === 'users') {
        refsByUid.set(parentUserRef.id, parentUserRef);
      }
    });

    userRefs = Array.from(refsByUid.values());
    console.log(`[debug] fallbackViaCollectionGroup=true appDataMainDocs=${mainDocs.length} inferredUsers=${userRefs.length}`);
  }

  let usersFound = userRefs.length;
  let usersWithAppData = 0;
  let usersWithSubscriptions = 0;
  let processedUsers = 0;
  let reminderNotifications = 0;
  let chargeNotifications = 0;

  for (const userRef of userRefs) {
    const uid = userRef.id;
    const appDataRef = userRef.collection('appData').doc('main');
    const appDataSnap = await appDataRef.get();

    if (!appDataSnap.exists) continue;
    usersWithAppData += 1;

    const data = appDataSnap.data() || {};
    const subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];
    const rawHistory = Array.isArray(data.subscriptionNotifications) ? data.subscriptionNotifications : [];
    const prunedHistory = pruneHistory(rawHistory, today.year, today.month);
    const history = new Set(prunedHistory);

    if (!subscriptions.length) continue;
    usersWithSubscriptions += 1;

    let userHistoryChanged = false;

    for (const subscription of subscriptions) {
      if (!subscription || subscription.status !== 'active') continue;

      if (!subscription.startDate || subscription.startDate > today.isoDate) continue;

      const billingDay = Number(subscription.billingDay);
      const notifyDaysBefore = Number(subscription.notifyDaysBefore || 0);
      if (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 31) continue;

      const reminderDay = billingDay - notifyDaysBefore;
      const shouldForceNotify = forceSendActive && subscription.notifyEnabled;

      if (shouldForceNotify || (subscription.notifyEnabled && notifyDaysBefore > 0 && reminderDay >= 1 && today.day === reminderDay)) {
        const reminderKey = `${subscription.id}:${today.period}:reminder`;
        if (shouldForceNotify || !history.has(reminderKey)) {
          await sendPush({
            externalId: uid,
            title: shouldForceNotify ? 'Prueba de notificación de suscripción' : 'Recordatorio de suscripción',
            body: shouldForceNotify
              ? `${subscription.name} está activa y tiene notificaciones habilitadas.`
              : `Se aproxima el cobro de ${subscription.name} por $${Number(subscription.amount || 0).toFixed(2)}.`,
            data: {
              type: shouldForceNotify ? 'subscription_force_test' : 'subscription_reminder',
              subscriptionId: subscription.id,
              period: today.period,
            },
          });

          if (!shouldForceNotify) {
            history.add(reminderKey);
            userHistoryChanged = true;
          }
          reminderNotifications += 1;
        }
      }

      if (today.day === billingDay) {
        const chargeKey = `${subscription.id}:${today.period}:charge`;
        if (!history.has(chargeKey)) {
          await sendPush({
            externalId: uid,
            title: 'Cobro de suscripción',
            body: `Hoy se cobra ${subscription.name} por $${Number(subscription.amount || 0).toFixed(2)}.`,
            data: {
              type: 'subscription_charge',
              subscriptionId: subscription.id,
              period: today.period,
            },
          });

          history.add(chargeKey);
          userHistoryChanged = true;
          chargeNotifications += 1;
        }
      }
    }

    if (userHistoryChanged || prunedHistory.length !== rawHistory.length) {
      await appDataRef.set(
        {
          subscriptionNotifications: Array.from(history),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }

    processedUsers += 1;
  }

  console.log(
    `[done] usersFound=${usersFound} usersWithAppData=${usersWithAppData} usersWithSubscriptions=${usersWithSubscriptions} processedUsers=${processedUsers} reminderNotifications=${reminderNotifications} chargeNotifications=${chargeNotifications} dryRun=${dryRun}`,
  );
};

run().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
