const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');

initializeApp();

/**
 * Spustí se automaticky při vytvoření nové novinky v kolekci 'news'.
 * Odešle FCM push notifikaci všem uživatelům, kteří mají uložený token.
 */
exports.sendNewsNotification = onDocumentCreated('news/{newsId}', async (event) => {
  const news = event.data?.data();
  if (!news) return;

  const db = getFirestore();

  // Načti všechny FCM tokeny ze kolekce fcmTokens
  const tokensSnap = await db.collection('fcmTokens').get();
  const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);

  if (!tokens.length) {
    console.log('Žádné FCM tokeny, notifikace se neodešle.');
    return;
  }

  const message = {
    notification: {
      title: `📣 ${news.title}`,
      body:  news.body?.slice(0, 120) + (news.body?.length > 120 ? '…' : ''),
    },
    webpush: {
      notification: {
        icon:  'https://tymdejvid-app.web.app/logo.png',
        badge: 'https://tymdejvid-app.web.app/logo.png',
        tag:   'tymdejvid-news',
      },
      fcmOptions: {
        link: 'https://tymdejvid-app.web.app/',
      },
    },
    tokens,
  };

  const response = await getMessaging().sendEachForMulticast(message);
  console.log(`Odesláno: ${response.successCount} úspěšně, ${response.failureCount} selhalo`);

  // Odstraň neplatné tokeny
  const invalidTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code;
      if (code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(tokensSnap.docs[i].ref);
      }
    }
  });
  if (invalidTokens.length) {
    await Promise.all(invalidTokens.map(ref => ref.delete()));
    console.log(`Smazáno ${invalidTokens.length} neplatných tokenů`);
  }
});
