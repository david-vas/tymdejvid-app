const functions  = require('firebase-functions');
const admin      = require('firebase-admin');

admin.initializeApp();

/**
 * Spustí se automaticky při vytvoření nové novinky v kolekci 'news'.
 * Odešle FCM push notifikaci všem uživatelům, kteří mají uložený token.
 */
exports.sendNewsNotification = functions.firestore
  .document('news/{newsId}')
  .onCreate(async (snap) => {
    const news = snap.data();
    if (!news) return null;

    const db = admin.firestore();

    // Načti všechny FCM tokeny ze kolekce fcmTokens
    const tokensSnap = await db.collection('fcmTokens').get();
    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);

    if (!tokens.length) {
      console.log('Žádné FCM tokeny, notifikace se neodešle.');
      return null;
    }

    const message = {
      notification: {
        title: `📣 ${news.title}`,
        body:  (news.body || '').slice(0, 120) + ((news.body || '').length > 120 ? '…' : ''),
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

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Odesláno: ${response.successCount} úspěšně, ${response.failureCount} selhalo`);

    // Odstraň neplatné tokeny
    const invalidRefs = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code;
        if (code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered') {
          invalidRefs.push(tokensSnap.docs[i].ref);
        }
      }
    });
    if (invalidRefs.length) {
      await Promise.all(invalidRefs.map(ref => ref.delete()));
      console.log(`Smazáno ${invalidRefs.length} neplatných tokenů`);
    }

    return null;
  });
