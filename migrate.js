const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// 1. Firebase Yetkilendirme
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const results = [];

// 2. CSV Dosyasını Oku ve Dönüştür
fs.createReadStream('beril_logs.csv')
  .pipe(csv({ separator: ';' })) // Senin CSV noktalı virgül kullanıyor
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    console.log(`${results.length} kayıt okundu. Göç başlıyor...`);

    const batch = db.batch();
    const logsRef = db.collection('logs');

    results.forEach((row) => {
      const docRef = logsRef.doc();
      
      // Veri Mapping (Kotlin -> React Native)
      const newLog = {
        type: row.type,
        startTime: parseInt(row.startTime),
        endTime: parseInt(row.endTime),
        side: row.side || null,
        amount: row.amount ? parseInt(row.amount) : null,
        // "Kakalı, Az Çişli" gibi verileri diziye çeviriyoruz
        status: row.status ? row.status.split(',').map(s => s.trim()) : [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, newLog);
    });

    try {
      await batch.commit();
      console.log("Tebrikler! Beril'in tüm geçmişi Firebase'e aktarıldı. 🚀");
      process.exit();
    } catch (error) {
      console.error("Hata oluştu:", error);
      process.exit(1);
    }
  });