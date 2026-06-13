// scripts/cleanup-rooms.js
// 24時間以上前に作成されたルームを削除する

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://splatoon-draft-54bf8-default-rtdb.firebaseio.com'
});

const db = admin.database();
const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24時間

async function cleanup() {
  const now = Date.now();
  const snapshot = await db.ref('rooms').once('value');

  if (!snapshot.exists()) {
    console.log('ルームなし、終了');
    return;
  }

  const rooms = snapshot.val();
  const roomIds = Object.keys(rooms);
  let deleted = 0;

  for (const roomId of roomIds) {
    const room = rooms[roomId];

    // 作成日時の決定: room.createdAt（新ルームは明示保存）を優先。
    // 無い旧ルームは lobby.members の最も古い joinedAt で推定（後方互換）。
    let createdAt = typeof room?.createdAt === 'number' ? room.createdAt : 0;
    if (!createdAt) {
      const members = room?.lobby?.members || {};
      const joinedAts = Object.values(members).map(m => m.joinedAt || 0).filter(t => t > 0);
      createdAt = joinedAts.length > 0 ? Math.min(...joinedAts) : 0;
    }

    if (createdAt === 0) {
      // createdAt も joinedAt も特定できないルーム（作成途中で放棄／破損など）。
      // 旧仕様同様に削除対象とする。
      await db.ref(`rooms/${roomId}`).remove();
      console.log(`削除(作成時刻不明): ${roomId}`);
      deleted++;
    } else if (now - createdAt > EXPIRE_MS) {
      await db.ref(`rooms/${roomId}`).remove();
      console.log(`削除: ${roomId} (作成: ${new Date(createdAt).toISOString()})`);
      deleted++;
    }
  }

  console.log(`完了: ${deleted}件削除 / ${roomIds.length}件中`);
  process.exit(0);
}

cleanup().catch(e => {
  console.error('エラー:', e);
  process.exit(1);
});
