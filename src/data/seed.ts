import type { Category, ExampleSentence, Grammar, PDFMaterial, PDFPage, Vocabulary } from '../domain/models';

// Authored demonstration content authorized for STEP 2. Not extracted from PDFs.
// JLPT levels are illustrative study groupings, not an official JLPT word list.
const stamp = '2026-09-20T00:00:00.000Z';
const timestamps = { createdAt: stamp, updatedAt: stamp };
const categoryNames = ['日常生活', '仕事', '介護', '病院', '買い物', '交通', '感情', '天気', '食べ物', '会話', '職場'];
export const seedCategories: Category[] = categoryNames.map((name, i) => ({ id: `category-${i + 1}`, name, description: 'Kategori awal; dapat diubah.', isSeed: true, ...timestamps }));
const categoryId = (name: string) => seedCategories.find(item => item.name === name)!.id;
export const seedMaterials: PDFMaterial[] = (['N3', 'N2'] as const).flatMap(level => (['vocabulary', 'grammar'] as const).map(kind => ({
  name: `Seed ${level} ${kind} — sumber dummy`, file: null, source: 'Referensi seed dummy', completedPages: 0, totalPages: kind === 'vocabulary' ? (level === 'N3' ? 50 : 20) : (level === 'N3' ? 20 : 10),
  id: `seed-${level}-${kind}`, title: `Seed ${level} ${kind} — sumber dummy`, filename: `DUMMY-${level}-${kind}.pdf`,
  pageCount: kind === 'vocabulary' ? (level === 'N3' ? 50 : 20) : (level === 'N3' ? 20 : 10),
  isDummy: true, status: 'REFERENCE_ONLY', checksum: null, ...timestamps,
})));
export const seedPages: PDFPage[] = seedMaterials.flatMap(material => Array.from({ length: material.pageCount }, (_, i) => ({
  id: `${material.id}:page:${i + 1}`, materialId: material.id, pageNumber: i + 1, printedPageLabel: null,
  text: 'Referensi halaman dummy untuk seed. Tidak ada berkas PDF atau teks hasil ekstraksi.', ...timestamps,
})));
// kanji | kana | romaji | meaning | part of speech | category | example | translation
const vocabularyN3 = `介護|かいご|kaigo|Perawatan orang yang membutuhkan bantuan|名詞・する動詞|介護|祖母の介護をしています。|Saya merawat nenek saya.
改善|かいぜん|kaizen|Perbaikan; peningkatan|名詞・する動詞|仕事|仕事の進め方を改善しました。|Kami memperbaiki cara menjalankan pekerjaan.
準備|じゅんび|junbi|Persiapan|名詞・する動詞|日常生活|旅行の準備をしています。|Saya sedang mempersiapkan perjalanan.
予定|よてい|yotei|Rencana; jadwal|名詞|日常生活|明日の予定を教えてください。|Tolong beri tahu jadwal besok.
約束|やくそく|yakusoku|Janji|名詞・する動詞|会話|友達との約束を守ります。|Saya menepati janji dengan teman.
連絡|れんらく|renraku|Kontak; menghubungi|名詞・する動詞|仕事|着いたら連絡してください。|Hubungi saya setelah tiba.
相談|そうだん|soudan|Konsultasi; berdiskusi|名詞・する動詞|会話|先生に進学について相談しました。|Saya berkonsultasi dengan guru tentang melanjutkan pendidikan.
確認|かくにん|kakunin|Pemeriksaan; konfirmasi|名詞・する動詞|仕事|会議の時間を確認します。|Saya akan memastikan waktu rapat.
説明|せつめい|setsumei|Penjelasan|名詞・する動詞|会話|使い方を説明してください。|Tolong jelaskan cara menggunakannya.
紹介|しょうかい|shoukai|Perkenalan; memperkenalkan|名詞・する動詞|会話|友達を紹介します。|Saya akan memperkenalkan teman saya.
経験|けいけん|keiken|Pengalaman|名詞・する動詞|仕事|日本で働いた経験があります。|Saya memiliki pengalaman bekerja di Jepang.
習慣|しゅうかん|shuukan|Kebiasaan|名詞|日常生活|毎朝歩く習慣があります。|Saya memiliki kebiasaan berjalan setiap pagi.
生活|せいかつ|seikatsu|Kehidupan sehari-hari|名詞・する動詞|日常生活|日本での生活に慣れました。|Saya sudah terbiasa dengan kehidupan di Jepang.
場合|ばあい|baai|Situasi; apabila|名詞|日常生活|雨の場合は中止です。|Jika hujan, acara dibatalkan.
理由|りゆう|riyuu|Alasan|名詞|会話|遅れた理由を説明しました。|Saya menjelaskan alasan keterlambatan saya.
原因|げんいん|gen'in|Penyebab|名詞|病院|病気の原因を調べています。|Penyebab penyakit itu sedang diperiksa.
結果|けっか|kekka|Hasil|名詞|仕事|試験の結果が出ました。|Hasil ujian sudah keluar.
方法|ほうほう|houhou|Cara; metode|名詞|日常生活|別の方法を試しましょう。|Mari mencoba cara lain.
意見|いけん|iken|Pendapat|名詞|会話|あなたの意見を聞かせてください。|Tolong sampaikan pendapat Anda.
関係|かんけい|kankei|Hubungan|名詞・する動詞|職場|同僚といい関係を築きたいです。|Saya ingin membangun hubungan baik dengan rekan kerja.
必要|ひつよう|hitsuyou|Perlu; kebutuhan|な形容詞・名詞|日常生活|申し込みには写真が必要です。|Foto diperlukan untuk pendaftaran.
大切|たいせつ|taisetsu|Penting; berharga|な形容詞|感情|家族との時間は大切です。|Waktu bersama keluarga itu berharga.
安全|あんぜん|anzen|Aman; keselamatan|な形容詞・名詞|職場|作業の前に安全を確認します。|Kami memeriksa keselamatan sebelum bekerja.
危険|きけん|kiken|Berbahaya; bahaya|な形容詞・名詞|交通|ここで泳ぐのは危険です。|Berenang di sini berbahaya.
便利|べんり|benri|Praktis; mudah digunakan|な形容詞|日常生活|このアプリは便利です。|Aplikasi ini praktis.
複雑|ふくざつ|fukuzatsu|Rumit; kompleks|な形容詞|仕事|この問題は複雑です。|Masalah ini rumit.
残念|ざんねん|zannen|Sayang sekali; kecewa|な形容詞|感情|会えなくて残念です。|Sayang sekali kita tidak bisa bertemu.
十分|じゅうぶん|juubun|Cukup; memadai|な形容詞・副詞|日常生活|時間は十分あります。|Waktunya cukup.
急ぐ|いそぐ|isogu|Bergegas|五段動詞|交通|駅まで急ぎましょう。|Mari bergegas ke stasiun.
選ぶ|えらぶ|erabu|Memilih|五段動詞|買い物|好きな色を選んでください。|Silakan pilih warna yang disukai.
決める|きめる|kimeru|Memutuskan|一段動詞|日常生活|旅行の日を決めました。|Kami sudah menentukan tanggal perjalanan.
続ける|つづける|tsuzukeru|Melanjutkan|一段動詞|日常生活|毎日勉強を続けます。|Saya akan terus belajar setiap hari.
比べる|くらべる|kuraberu|Membandingkan|一段動詞|買い物|二つの商品を比べました。|Saya membandingkan dua produk.
調べる|しらべる|shiraberu|Mencari tahu; memeriksa|一段動詞|日常生活|辞書で意味を調べます。|Saya mencari artinya di kamus.
伝える|つたえる|tsutaeru|Menyampaikan|一段動詞|会話|感謝の気持ちを伝えたいです。|Saya ingin menyampaikan rasa terima kasih.
手伝う|てつだう|tetsudau|Membantu|五段動詞|日常生活|母の料理を手伝います。|Saya membantu ibu memasak.
間に合う|まにあう|maniau|Sempat; tepat waktu|五段動詞|交通|電車に間に合いました。|Saya berhasil tiba tepat waktu untuk naik kereta.
片付ける|かたづける|katazukeru|Membereskan|一段動詞|日常生活|食事の後で机を片付けます。|Saya membereskan meja setelah makan.
受ける|うける|ukeru|Menerima; mengikuti|一段動詞|病院|来週、健康診断を受けます。|Minggu depan saya akan menjalani pemeriksaan kesehatan.
直す|なおす|naosu|Memperbaiki|五段動詞|日常生活|壊れた椅子を直しました。|Saya memperbaiki kursi yang rusak.
運ぶ|はこぶ|hakobu|Membawa; mengangkut|五段動詞|仕事|荷物を部屋まで運びます。|Saya membawa barang ke kamar.
戻る|もどる|modoru|Kembali|五段動詞|日常生活|夕方までに家に戻ります。|Saya akan kembali ke rumah paling lambat sore.
間違える|まちがえる|machigaeru|Salah; keliru|一段動詞|日常生活|電話番号を間違えました。|Saya salah memasukkan nomor telepon.
忘れる|わすれる|wasureru|Lupa|一段動詞|日常生活|傘を持ってくるのを忘れました。|Saya lupa membawa payung.
届く|とどく|todoku|Sampai; terkirim|五段動詞|買い物|昨日、荷物が届きました。|Paketnya tiba kemarin.
迎える|むかえる|mukaeru|Menjemput; menyambut|一段動詞|交通|空港で友達を迎えます。|Saya akan menjemput teman di bandara.
遅れる|おくれる|okureru|Terlambat|一段動詞|交通|バスが十分遅れています。|Bus terlambat sepuluh menit.
増える|ふえる|fueru|Bertambah|一段動詞|仕事|最近、仕事が増えました。|Belakangan ini pekerjaan bertambah.
減る|へる|heru|Berkurang|五段動詞|日常生活|ごみの量が減りました。|Jumlah sampah berkurang.
慣れる|なれる|nareru|Terbiasa|一段動詞|職場|新しい職場に慣れてきました。|Saya mulai terbiasa dengan tempat kerja baru。`;
const vocabularyN2 = `業務|ぎょうむ|gyoumu|Tugas operasional; pekerjaan|名詞|仕事|業務の内容を確認しました。|Saya memeriksa isi tugas pekerjaan.
責任|せきにん|sekinin|Tanggung jawab|名詞|仕事|自分の行動に責任を持ちます。|Saya bertanggung jawab atas tindakan sendiri.
評価|ひょうか|hyouka|Evaluasi; penilaian|名詞・する動詞|仕事|彼の努力は高く評価されています。|Usahanya sangat dihargai.
提案|ていあん|teian|Usulan|名詞・する動詞|仕事|新しい計画を提案しました。|Saya mengusulkan rencana baru.
承認|しょうにん|shounin|Persetujuan|名詞・する動詞|職場|上司の承認が必要です。|Persetujuan atasan diperlukan.
契約|けいやく|keiyaku|Kontrak; perjanjian|名詞・する動詞|仕事|契約の内容をよく読みます。|Saya membaca isi kontrak dengan saksama.
条件|じょうけん|jouken|Syarat; kondisi|名詞|仕事|応募の条件を確認してください。|Silakan periksa persyaratan melamar.
制度|せいど|seido|Sistem kelembagaan|名詞|職場|新しい研修制度が始まりました。|Sistem pelatihan baru telah dimulai.
資源|しげん|shigen|Sumber daya|名詞|日常生活|資源を大切に使いましょう。|Mari menggunakan sumber daya dengan bijaksana.
環境|かんきょう|kankyou|Lingkungan|名詞|日常生活|働きやすい環境を整えます。|Kami menyiapkan lingkungan yang nyaman untuk bekerja.
影響|えいきょう|eikyou|Pengaruh|名詞・する動詞|日常生活|天気は売り上げに影響します。|Cuaca memengaruhi penjualan.
課題|かだい|kadai|Persoalan yang perlu ditangani; tugas|名詞|仕事|今後の課題について話し合いました。|Kami mendiskusikan persoalan yang perlu ditangani ke depan.
対策|たいさく|taisaku|Langkah penanggulangan|名詞|仕事|事故を防ぐ対策を考えます。|Kami memikirkan langkah untuk mencegah kecelakaan.
効率|こうりつ|kouritsu|Efisiensi|名詞|仕事|作業の効率を上げたいです。|Saya ingin meningkatkan efisiensi pekerjaan.
貢献|こうけん|kouken|Kontribusi|名詞・する動詞|仕事|地域社会に貢献したいです。|Saya ingin berkontribusi kepada masyarakat setempat.
判断|はんだん|handan|Penilaian; keputusan|名詞・する動詞|仕事|状況を見て判断してください。|Silakan mengambil keputusan dengan melihat situasi.
維持|いじ|iji|Pemeliharaan; mempertahankan|名詞・する動詞|日常生活|健康を維持するために運動します。|Saya berolahraga untuk menjaga kesehatan.
改良|かいりょう|kairyou|Penyempurnaan produk atau metode|名詞・する動詞|仕事|製品を改良して使いやすくしました。|Kami menyempurnakan produk agar lebih mudah digunakan.
適切|てきせつ|tekisetsu|Tepat; sesuai|な形容詞|職場|適切な方法を選びましょう。|Mari memilih metode yang tepat.
柔軟|じゅうなん|juunan|Luwes; fleksibel|な形容詞|職場|柔軟な対応が求められます。|Diperlukan penanganan yang fleksibel。`;
// pattern | meaning | formation | explanation | example | translation
const grammarN3 = `〜ようにする|Berusaha membiasakan diri untuk…|Vる / Vない + ようにする|Menunjukkan upaya sadar untuk melakukan atau menghindari suatu tindakan secara rutin.|毎日、日本語を読むようにしています。|Saya berusaha membaca Bahasa Jepang setiap hari.
〜ようになる|Menjadi bisa; mulai…|Vる / Vない + ようになる|Menunjukkan perubahan kemampuan atau kebiasaan dari keadaan sebelumnya.|漢字が少し読めるようになりました。|Saya menjadi bisa membaca sedikit kanji.
〜ことにする|Memutuskan untuk…|Vる / Vない + ことにする|Digunakan ketika penutur membuat keputusan sendiri.|毎朝、歩くことにしました。|Saya memutuskan untuk berjalan setiap pagi.
〜ことになる|Diputuskan bahwa…|Vる / Vない + ことになる|Keputusan muncul dari keadaan atau keputusan pihak lain.|来月、大阪に転勤することになりました。|Sudah diputuskan bahwa bulan depan saya pindah tugas ke Osaka.
〜はずだ|Seharusnya; mestinya…|V普通形 / Aい / Aな + な / N + の + はずだ|Menyatakan dugaan kuat berdasarkan alasan atau informasi yang diketahui.|彼はもう家に着いているはずです。|Seharusnya dia sudah sampai di rumah.
〜わけではない|Bukan berarti…|V普通形 / Aい / Aな + な / N + な + わけではない|Menyangkal kesimpulan secara sebagian, bukan menolak seluruh kenyataan.|日本料理が全部好きなわけではありません。|Bukan berarti saya menyukai semua masakan Jepang.
〜たばかりだ|Baru saja…|Vた + ばかりだ|Menunjukkan tindakan yang terasa baru selesai dari sudut pandang penutur.|日本に来たばかりです。|Saya baru saja datang ke Jepang.
〜ところだ|Sedang pada tahap…|Vる / Vている / Vた + ところだ|Bentuk kata kerja membedakan akan mulai, sedang berlangsung, atau baru selesai.|今から昼ご飯を食べるところです。|Saya baru akan makan siang sekarang.
〜ようだ|Tampaknya; sepertinya…|V普通形 / Aい / Aな + な / N + の + ようだ|Dugaan berdasarkan pengamatan atau petunjuk yang dirasakan penutur.|誰かが部屋にいるようです。|Sepertinya ada seseorang di kamar.
〜みたいだ|Sepertinya; mirip…|V普通形 / Aい / Aな語幹 / N + みたいだ|Bentuk percakapan untuk dugaan atau kemiripan.|この店は今日は休みみたいです。|Sepertinya toko ini tutup hari ini.
〜らしい（伝聞）|Kabarnya…|普通形 + らしい|Menyampaikan informasi yang didengar secara tidak langsung; kata benda dan kata sifat na tidak memakai だ.|来週、新しい店が開くらしいです。|Kabarnya toko baru akan dibuka minggu depan.
〜そうだ（伝聞）|Menurut kabar…|普通形 + そうだ|Melaporkan informasi dari sumber lain; berbeda dengan そうだ yang menyatakan tampilan.|天気予報によると、明日は雨だそうです。|Menurut prakiraan cuaca, besok akan hujan.
〜そうだ（様態）|Kelihatannya…|Vます語幹 / Aい tanpa い / Aな語幹 + そうだ|Kesan dari penampilan atau tanda yang tampak; ada bentuk khusus seperti よさそう dan なさそう.|このケーキはおいしそうです。|Kue ini kelihatannya enak.
〜ために|Untuk; demi…|V辞書形 / N + の + ために|Menjelaskan tujuan; dengan kata kerja biasanya tujuan yang disengaja oleh pelaku.|日本で働くために勉強しています。|Saya belajar agar bisa bekerja di Jepang.
〜おかげで|Berkat…|V普通形 / Aい / Aな + な / N + の + おかげで|Menunjukkan penyebab yang membawa hasil baik atau rasa terima kasih.|先生のおかげで合格できました。|Berkat guru, saya berhasil lulus.
〜せいで|Gara-gara…|V普通形 / Aい / Aな + な / N + の + せいで|Menunjukkan penyebab hasil yang tidak diinginkan.|雨のせいで試合が中止になりました。|Pertandingan dibatalkan gara-gara hujan.
〜うちに|Selagi; sebelum keadaan berubah…|V辞書形 / Vない / Vている / Aい / Aな + な / N + の + うちに|Melakukan sesuatu selama kondisi tertentu masih berlangsung.|温かいうちに食べてください。|Silakan makan selagi masih hangat.
〜たびに|Setiap kali…|V辞書形 / N + の + たびに|Peristiwa kedua terjadi berulang setiap peristiwa pertama terjadi.|この歌を聞くたびに故郷を思い出します。|Setiap kali mendengar lagu ini, saya teringat kampung halaman.
〜ほど|Sampai taraf; begitu… hingga…|V普通形 / N + ほど|Menggambarkan tingkat atau derajat melalui pembanding atau keadaan.|声が出ないほど驚きました。|Saya begitu terkejut sampai tidak bisa bersuara.
〜ても|Meskipun; sekalipun…|Vて + も / Aくて + も / Aな・N + でも|Hasil tetap berlaku walaupun kondisi yang disebutkan terjadi.|雨が降っても、出かけます。|Meskipun hujan, saya akan pergi.`;
const grammarN2 = `〜にもかかわらず|Meskipun; terlepas dari…|V普通形 / Aい / Aな・N + である + にもかかわらず; N + にもかかわらず|Menyatakan hasil yang bertentangan dengan harapan; cenderung formal.|雨にもかかわらず、大勢の人が来ました。|Meskipun hujan, banyak orang datang.
〜わけにはいかない|Tidak bisa begitu saja…|V辞書形 + わけにはいかない|Tidak dapat melakukan tindakan karena tanggung jawab atau pertimbangan sosial, bukan ketidakmampuan fisik.|大事な会議なので、休むわけにはいきません。|Karena ini rapat penting, saya tidak bisa begitu saja absen.
〜ざるを得ない|Terpaksa; tidak punya pilihan selain…|Vない語幹 + ざるを得ない; する → せざるを得ない|Menunjukkan tindakan yang harus dilakukan meskipun tidak diinginkan.|電車が止まったので、タクシーを使わざるを得ませんでした。|Karena kereta berhenti beroperasi, saya terpaksa naik taksi.
〜に限らず|Tidak terbatas pada…|N + に限らず|Menunjukkan bahwa sesuatu juga berlaku di luar kelompok yang disebutkan.|この映画は子供に限らず、大人にも人気です。|Film ini populer bukan hanya di kalangan anak-anak, tetapi juga orang dewasa.
〜に応じて|Sesuai dengan…|N + に応じて|Penanganan atau hasil disesuaikan dengan keadaan, kebutuhan, atau tingkat.|能力に応じて仕事を分担します。|Kami membagi pekerjaan sesuai kemampuan.
〜に伴って|Seiring dengan…|N / V辞書形 + に伴って|Perubahan kedua berlangsung bersama perubahan pertama.|人口の増加に伴って、交通量も増えています。|Seiring bertambahnya penduduk, volume lalu lintas juga meningkat.
〜に違いない|Pasti; tentu…|V普通形 / Aい / Aな語幹 / N + に違いない|Dugaan sangat kuat dari penutur, bukan bukti bahwa sesuatu sudah pasti benar.|彼はこの知らせを聞いて喜ぶに違いありません。|Dia pasti akan senang mendengar kabar ini.
〜に過ぎない|Hanya; tidak lebih dari…|V普通形 / N + に過ぎない|Membatasi nilai atau tingkat sesuatu dan menekankan bahwa tidak lebih dari itu.|これは私の個人的な意見に過ぎません。|Ini hanyalah pendapat pribadi saya.
〜ものの|Meskipun… namun…|V普通形 / Aい / Aな + な / N + である + ものの|Mengakui fakta pertama, lalu menyatakan kenyataan yang tidak sesuai harapan.|本を買ったものの、まだ読んでいません。|Meskipun sudah membeli bukunya, saya belum membacanya.
〜次第|Segera setelah…|Vます語幹 + 次第|Menunjukkan tindakan yang akan dilakukan segera setelah suatu keadaan terjadi; sering dipakai dalam pengumuman.|準備ができ次第、出発します。|Kami akan berangkat segera setelah persiapannya selesai。`;

export const seedVocabulary: Vocabulary[] = [];
export const seedGrammar: Grammar[] = [];
export const seedExamples: ExampleSentence[] = [];
for (const [level, data, count] of [['N3', vocabularyN3, 50], ['N2', vocabularyN2, 20]] as const) {
  const lines = data.split('\n');
  if (lines.length !== count) throw new Error(`Invalid vocabulary seed count: ${level}`);
  lines.forEach((line, i) => {
    const [kanji, kana, romaji, meaning, partOfSpeech, category, japanese, translation] = line.split('|');
    if (line.split('|').length !== 8 || !categoryNames.includes(category)) throw new Error('Malformed vocabulary seed');
    const id = `seed-v-${level}-${String(i + 1).padStart(2, '0')}`;
    const source = { sourcePdfId: `seed-${level}-vocabulary`, sourcePage: i + 1 };
    seedVocabulary.push({ id, kanji, kana, romaji, meaning, partOfSpeech, jlptLevel: level, categoryIds: [categoryId(category)],
      difficulty: level === 'N3' ? 3 : 4, notes: 'Seed buatan untuk pengembangan; level merupakan pengelompokan belajar ilustratif.',
      isSeed: true, additionalSources: [], ...source, ...timestamps });
    seedExamples.push({ id: `example-${id}`, itemId: id, itemType: 'vocabulary', japanese, translation: translation.replace(/。$/, '.'), ...source, ...timestamps });
  });
}
for (const [level, data, count] of [['N3', grammarN3, 20], ['N2', grammarN2, 10]] as const) {
  const lines = data.split('\n');
  if (lines.length !== count) throw new Error(`Invalid grammar seed count: ${level}`);
  lines.forEach((line, i) => {
    const [pattern, meaning, formation, explanation, japanese, translation] = line.split('|');
    if (line.split('|').length !== 6) throw new Error('Malformed grammar seed');
    const id = `seed-g-${level}-${String(i + 1).padStart(2, '0')}`;
    const source = { sourcePdfId: `seed-${level}-grammar`, sourcePage: i + 1 };
    seedGrammar.push({ id, pattern, meaning, formation, explanation, commonMistakes: '', comparisonIds: [], jlptLevel: level,
      categoryIds: [categoryId('会話')], difficulty: level === 'N3' ? 3 : 4, notes: 'Seed buatan, bukan kutipan dari PDF.', isSeed: true,
      additionalSources: [], ...source, ...timestamps });
    seedExamples.push({ id: `example-${id}`, itemId: id, itemType: 'grammar', japanese, translation: translation.replace(/。$/, '.'), ...source, ...timestamps });
  });
}
