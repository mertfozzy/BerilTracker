Beril Tracker 🍼✨
Beril Tracker, ebeveynlerin bebeklerinin günlük rutinlerini (emzirme, biberon, uyku ve bez değişimi) anlık olarak takip edebilmesi için geliştirilmiş çapraz platform (Cross-Platform) bir mobil/web uygulamasıdır.

Başlangıçta yerel bir Kotlin & SQLite uygulaması olarak geliştirilen proje; gerçek zamanlı veri senkronizasyonu ve hem Android hem de iOS cihazlarda (PWA aracılığıyla) kesintisiz kullanım ihtiyacı doğrultusunda React Native (Expo) ve Firebase altyapısına taşınmıştır. Eski Kotlin verileri özel bir Node.js scripti ile Firestore'a entegre edilmiştir.

🚀 Öne Çıkan Özellikler
Gerçek Zamanlı Senkronizasyon: Firebase Firestore sayesinde eşlerden biri veri girdiğinde diğer cihazlarda anında güncellenir.

Çapraz Platform (Cross-Platform): Android için native .apk çıktısı, iOS/Safari için PWA (Progressive Web App) desteği ile "Ana Ekrana Ekle" uyumluluğu.

Detaylı Kayıt Yönetimi: * Emzirme: Sol/Sağ taraf takibi ve kronometre bazlı süre hesaplaması.

Süt (Sağım/Biberon): Mililitre (ml) bazında tüketim takibi.

Bez: Durum bazlı (Az Çişli, Çok Çişli, Kakalı) kayıt.

Uyku: Başlangıç ve bitiş saatlerine göre toplam uyku süresi.

Akıllı Tahminler (Beril Algoritması): Son beslenme ve uyku verilerine dayanarak tahmini acıkma süresini, uyanıklık süresini ve bir sonraki emzirmede hangi tarafın öncelikli olması gerektiğini hesaplar.

Gelişim İstatistikleri: Geçmiş 7 güne ait süt/emzirme tüketim grafikleri ve günlük toplam uyku saati raporları.

🛠️ Teknoloji Yığını (Tech Stack)
Frontend: React Native, Expo, React Hooks

Backend & Veritabanı: Firebase (Firestore)

Hosting (Web & PWA): Firebase Hosting

Tarih/Zaman Yönetimi: date-fns

İkonlar & UI: @expo/vector-icons (MaterialCommunityIcons), @react-native-community/datetimepicker

📦 Kurulum ve Çalıştırma
Projeyi yerel ortamında (lokal) çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

Depoyu klonlayın:

Bash
git clone https://github.com/KULLANICI_ADIN/BerilTrackerCross.git
cd BerilTrackerCross
Gerekli bağımlılıkları yükleyin:

Bash
npm install
Firebase yapılandırmanızı ekleyin:
Proje dizininde firebaseConfig.js dosyası oluşturun ve kendi Firebase kimlik bilgilerinizi (API Key, Project ID vb.) ekleyin.

Uygulamayı başlatın:

Bash
npx expo start
Web Sürümü İçin Derleme (Export):

Bash
npx expo export --platform web
firebase deploy --only hosting
📝 Notlar
Bu proje, kişisel bir ihtiyaçtan doğmuş olup, ebeveynlerin bebek bakım sürecindeki bilişsel yükünü hafifletmeyi ve veriye dayalı rutinler oluşturmayı amaçlamaktadır.
