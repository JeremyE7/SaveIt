import admin from 'firebase-admin';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
const timeZone = process.env.NOTIFICATION_TIMEZONE || 'America/Guayaquil';
const dryRun = (process.env.DRY_RUN || '').toLowerCase() === 'true';

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

const db = admin.firestore();

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
  console.log(`[start] timezone=${timeZone} date=${today.isoDate} period=${today.period}`);

  const usersSnap = await db.collection('users').get();

  let processedUsers = 0;
  let reminderNotifications = 0;
  let chargeNotifications = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const appDataRef = userDoc.ref.collection('appData').doc('main');
    const appDataSnap = await appDataRef.get();

    if (!appDataSnap.exists) continue;

    const data = appDataSnap.data() || {};
    const subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];
    const history = new Set(Array.isArray(data.subscriptionNotifications) ? data.subscriptionNotifications : []);

    if (!subscriptions.length) continue;

    let userHistoryChanged = false;

    for (const subscription of subscriptions) {
      if (!subscription || subscription.status !== 'active') continue;

      if (!subscription.startDate || subscription.startDate > today.isoDate) continue;

      const billingDay = Number(subscription.billingDay);
      const notifyDaysBefore = Number(subscription.notifyDaysBefore || 0);
      if (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 31) continue;

      const reminderDay = billingDay - notifyDaysBefore;

      if (subscription.notifyEnabled && notifyDaysBefore > 0 && reminderDay >= 1 && today.day === reminderDay) {
        const reminderKey = `${subscription.id}:${today.period}:reminder`;
        if (!history.has(reminderKey)) {
          await sendPush({
            externalId: uid,
            title: 'Recordatorio de suscripción',
            body: `Se aproxima el cobro de ${subscription.name} por $${Number(subscription.amount || 0).toFixed(2)}.`,
            data: {
              type: 'subscription_reminder',
              subscriptionId: subscription.id,
              period: today.period,
            },
          });

          history.add(reminderKey);
          userHistoryChanged = true;
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

    if (userHistoryChanged) {
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
    `[done] processedUsers=${processedUsers} reminderNotifications=${reminderNotifications} chargeNotifications=${chargeNotifications} dryRun=${dryRun}`,
  );
};

run().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
