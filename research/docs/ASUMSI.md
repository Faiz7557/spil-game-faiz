# Asumsi Model dan Batasan Penelitian

Dokumen ini adalah sumber tunggal untuk sub-bab **Asumsi dan Batasan** di Bab 3.
Setiap asumsi ditulis dengan format yang sama: **pernyataan**, **alasan**, dan
**konsekuensi** — konsekuensi adalah bagian yang paling sering ditanyakan penguji,
jadi ditulis eksplisit, bukan disembunyikan.

Aturan main: kalau sebuah keputusan model tidak ada di sini, dia tidak boleh ada
di kode. Kalau kode berubah, dokumen ini berubah lebih dulu.

---

## A-1 · Ruang lingkup: satu operator, bukan empat pemain

**Pernyataan.** Lingkungan eksperimen (`research/src/circuit.mjs`) memodelkan
**satu** operator yang menjalankan kapal sepanjang rotasi 4 pelabuhan selama 8
minggu, dengan grid kapal miliknya sendiri. Ini berbeda dari game yang dikirim
(`server/server.js`), yang berupa kompetisi 4 pemain di atas satu grid bersama.

**Alasan.** Pada formulasi 4 pemain, `activePlayerIndex = currentPortIndex %
players.length` membuat seorang pemain hanya mengambil keputusan ketika kapal
sandar di cabangnya sendiri — 2 dari 8 minggu. Selain terlalu pendek untuk
disebut proses keputusan sekuensial, penalti restow tidak dapat diatribusikan ke
keputusan satu agen karena grid dipakai bersama, dan hasil setiap agen
bergantung pada perilaku tiga agen lain. Tiga hal itu masing-masing sudah cukup
untuk membatalkan perbandingan terkontrol.

**Konsekuensi.** Penelitian ini **tidak** mengevaluasi agen sebagai lawan bermain
di dalam game, dan **tidak** mengklaim apa pun tentang aspek edukatif game.
Game berperan sebagai **sumber domain dan parameter** — tarif, tabel penalti,
bay plan, aturan fisika — yang seluruhnya diimpor apa adanya dari
`server/utils/gameEngine.js` dan `shared/gameConstants.js`, bukan ditulis ulang.
Judul dan rumusan masalah harus mencerminkan hal ini.

---

## A-2 · Pendapatan diakui saat pembongkaran (*discharge*)

**Pernyataan.** Freight sebuah kontainer diakui ketika kontainer itu dibongkar di
pelabuhan tujuannya, bukan ketika dimuat.

**Alasan.** Game yang dikirim sempat memakai **dua konvensi berbeda**: jalur
multiplayer mengkredit saat pemuatan, jalur offline saat pembongkaran. Keduanya
kini memakai `calculateDischargeRevenue`. Konvensi *discharge* adalah yang
bermakna secara ekonomi: kargo yang tidak pernah sampai tidak menghasilkan.

**Konsekuensi.** Dengan adanya masa *drain* (A-3), total pendapatan satu episode
di bawah kedua konvensi menjadi **identik**; keduanya hanya berbeda dalam *kapan*
pendapatan dicatat. Tanpa *drain*, keduanya berbeda persis sebesar nilai kargo
yang masih di atas kapal saat horizon berakhir. Kolom `revenue_load` tetap
ditulis ke CSV supaya klaim ini bisa diperiksa, bukan dipercaya.

---

## A-3 · Masa *drain* 3 minggu setelah horizon keputusan

**Pernyataan.** Episode terdiri atas **8 minggu keputusan** ditambah **3 minggu
*drain***: kapal terus berlayar mengikuti rotasi, tetapi tidak ada order baru
yang ditawarkan maupun diterima. Semua kargo yang dimuat selama horizon
keputusan sampai ke tujuannya dan dikreditkan. Penalti restow tetap berlaku
selama *drain*.

**Alasan.** Ini menutup **distorsi ujung horizon**. Dengan pengakuan pendapatan
saat pembongkaran dan penghentian keras di minggu 8, kargo yang masih di atas
kapal tidak menghasilkan apa pun, sementara menolaknya (bila non-committed) tidak
dikenai penalti. Kebijakan optimal di minggu 8 karenanya adalah *menolak semua
order non-committed yang tujuannya bukan pelabuhan berikutnya* — celah yang pasti
ditemukan agen pembelajar (A5) dan mustahil ditemukan heuristik yang ditulis
tangan. Sebagian keunggulan A5 akan berasal dari artefak pemotongan horizon,
bukan dari kemampuan stowage. Itu persis klaim yang ingin diuji skripsi ini,
sehingga artefaknya harus dihilangkan, bukan sekadar dilaporkan.

3 minggu = *dwell* maksimum pada rotasi 4 pelabuhan, jadi panjangnya tepat cukup.

**Konsekuensi.** Besar distorsi ini terukur, bukan diasumsikan: pemeriksaan
**V6** di `run-pilot.mjs` menjalankan ulang seluruh lineup dengan
`CONFIG.drainWeeks = 0` dan melaporkan selisih kas mediannya. Pada pilot,
pemotongan di minggu 8 menghapus sekitar 100–200 jt per agen — besarnya berbeda
antar agen, yang justru membuktikan bahwa pemotongan itu **tidak netral** terhadap
perbandingan.

---

## A-4 · Restow ditagih ulang di setiap port-call

**Pernyataan.** Penalti restow dihitung ulang dan ditagih **setiap kali kapal
sandar**, sepanjang kontainer yang menghalangi masih berada di atas kontainer
yang harus dibongkar. Satu kontainer yang menghalangi selama dua port-call
berturut-turut dibayar dua kali. Satu kontainer restow = 2 pergerakan
(angkat + tempatkan kembali) × Rp 3.000.000 per pergerakan.

**Alasan.** Sesuai operasi nyata: setiap kali kapal berlabuh dan kotak yang
menghalangi harus digeser, biaya crane benar-benar dikeluarkan lagi. Aturan ini
berasal dari `calculateRestows` di engine game dan tidak diubah.

**Konsekuensi.** Bay plan yang buruk bersifat **akumulatif**, bukan sekali bayar.
Ini memperkuat insentif untuk perencanaan yang sadar-tujuan, dan menjelaskan
mengapa selisih restow antar agen berbanding lurus dengan selisih kas akhir.
Asumsi ini sebelumnya implisit di dalam kode; sekarang dinyatakan.

---

## A-5 · Fungsi objektif perencanaan ≠ fungsi penagihan

**Pernyataan.** Yang **ditagihkan** adalah aturan game: jumlah kontainer yang
menghalangi kargo *pelabuhan berikutnya* saja (`calculateRestows`, lookahead 1
pelabuhan). Yang **dioptimalkan** oleh A3 dan A4 adalah jumlah *pasangan overstow*
sepanjang rotasi — setiap pasangan (kotak bawah, kotak atas) di mana kotak bawah
turun lebih dulu (`stackOverstow` di `research/src/agents.mjs`).

**Alasan.** Kriteria satu langkah ke depan benar untuk **menagih** (Anda hanya
membayar pergerakan yang benar-benar dilakukan di dermaga ini) tetapi buta untuk
**merencanakan**: sebuah bay plan bisa bersih minggu ini dan bencana minggu
depan. Menghitung pasangan overstow sepanjang rotasi adalah kriteria baku di
literatur stowage.

**Konsekuensi.** A3 dan A4 mengoptimalkan **fungsi objektif yang sama**, sehingga
selisih di antara keduanya sepenuhnya dapat diatribusikan ke **daya optimasi**
(satu kali *pass* konstruktif vs pencarian), bukan ke perbedaan fungsi biaya.
A2 tetap memakai objektif game sendiri karena A2 **adalah** bot game — perbedaan
itu justru alasan A2 dimasukkan.

---

## A-6 · Konfigurasi kapal dan rotasi bersifat tetap

**Pernyataan.** Kapal berukuran 3 bay — bay 10 (REEFER, 4 baris × 3 tier = 12
slot) dan bay 06 + 02 (DRY, masing-masing 12 slot) — total **36 slot, 12 REEFER
dan 24 DRY**. Rotasi tetap SBY → MKS → JYP → MDN → SBY dan tidak pernah berubah.

**Alasan.** Ukuran ini adalah "Small Vessel" pada game dan cukup kecil untuk
membuat kapasitas menjadi kendala yang mengikat, sehingga keputusan agen benar-
benar berpengaruh.

**Konsekuensi.** Hasil berlaku untuk satu ukuran kapal dan satu pola rotasi.
Generalisasi ke kapal atau jaringan lain adalah pekerjaan lanjutan, dan harus
disebut di Saran. Konfigurasi kapal **tidak** termasuk faktor yang divariasikan
dalam eksperimen sensitivitas.

---

## A-7 · Permintaan i.i.d. per port-call

**Pernyataan.** Order di setiap port-call dibangkitkan independen: jumlah order
∼ Uniform{6..10} (diskala `intensity`), kuantitas ∼ Uniform{1,2,3}, jenis
pelanggan Bernoulli(κ), jenis kontainer Bernoulli(σ), tujuan seragam di antara
tiga pelabuhan lain. Tidak ada musiman, tren, korelasi antar minggu, maupun
korelasi antar order dalam satu port-call.

**Alasan.** Ini adalah perilaku `generateOrders` di game, dipertahankan apa
adanya. Menambahkan struktur temporal akan mengubah lingkungan menjadi sesuatu
yang bukan lagi turunan dari game.

**Konsekuensi.** Agen tidak bisa memperoleh keunggulan dari memprediksi
permintaan masa depan — hanya dari mengelola kapasitas dan susunan muatan.
Ini mempersempit apa yang bisa dipelajari A5, dan harus disebut sebagai batasan
saat menafsirkan seberapa besar keunggulan DRL.

---

## A-8 · Tarif deterministik dari tabel resmi

**Pernyataan.** Tarif ditentukan penuh oleh pasangan (asal, tujuan, jenis
kontainer) menurut *Informasi Tarif Muatan PT. SPIL* yang tertanam di
`TARIFF_TABLE`. Tidak ada negosiasi, diskon volume, kontrak jangka panjang,
maupun fluktuasi pasar.

**Konsekuensi.** Keputusan penerimaan murni soal alokasi kapasitas, bukan soal
penetapan harga. Ini adalah **penyederhanaan besar** terhadap praktik liner
nyata dan harus dinyatakan sebagai batasan, bukan dilewatkan.

---

## A-9 · Penerimaan bersifat *all-or-nothing* per order

**Pernyataan.** Sebuah order diterima seluruhnya atau ditolak seluruhnya. Bila
diterima tetapi tidak semua kontainernya termuat, sisanya kena *rolling penalty*.
Menolak order **Non-Committed** tidak dikenai biaya; mengabaikan order
**Committed** tetap kena penalti penuh.

**Konsekuensi.** Ini menjadi jebakan utama dalam permainan dan menjelaskan
mengapa bot GREEDY yang menerima 100% permintaan tidak lebih baik daripada hanya
mengangkut kargo Committed. A3 menghindarinya lewat anggaran kapasitas per jenis;
A4 lewat aturan "order diterima hanya bila seluruh kontainernya mendapat slot".

---

## A-10 · Kas = modal awal + pendapatan − penalti restow − penalti rolling

**Pernyataan.** Tidak ada biaya bahan bakar, biaya sandar, biaya sewa kapal,
biaya kru, maupun diskonto waktu. Modal awal Rp 150.000.000 identik untuk semua
agen.

**Konsekuensi.** Kas akhir adalah ukuran kinerja relatif, bukan proyeksi
profitabilitas. Rasio realisasi terhadap batas atas (lihat A-14) dihitung atas
**laba** (kas − modal awal), bukan atas kas, karena modal awal diberikan gratis
kepada semua agen dan akan menaikkan angka semua orang secara semu.

---

## A-11 · Stabilitas kapal dan regulasi muatan tidak dimodelkan

**Pernyataan.** Berat kontainer, distribusi beban, *trim*, *stress*, *lashing*,
serta pemisahan muatan berbahaya (IMDG) tidak dimodelkan. Kendala fisik yang
berlaku hanya tiga: kecocokan jenis slot, tier 84 memerlukan tier 82, dan tier 02
tidak terjangkau bila 82 atau 84 sudah terisi.

**Konsekuensi.** Ini pembeda utama dari literatur *master bay planning* yang
memodelkan stabilitas. Harus dinyatakan di Bab 1 sebagai batasan, dan di Bab 2
sebagai alasan mengapa hasil penelitian ini tidak dapat dibandingkan langsung
dengan hasil-hasil pada model MBPP penuh.

---

## A-12 · Determinisme dan pemisahan data

**Pernyataan.** Seluruh keacakan skenario berasal dari `rngForPortCall(seed,
week, port)` (FNV-1a → mulberry32). Keacakan agen memakai aliran terpisah
`rngForPortCall(seed, week, "namaAgen@port")`. Rentang seed dipisah secara
konstruksi: TRAIN `[0, 200.000)`, VAL `[200.000, 300.000)`, TEST `[300.000, …)`,
dengan eksperimen sensitivitas memakai `[310.000, …)` agar tidak beririsan dengan
eksperimen utama.

**Konsekuensi.** Dalam satu blok, setiap agen menghadapi permintaan yang
**identik bit demi bit** — inilah yang membuat desain *randomized complete block*
sah. Undian satu agen tidak dapat menggeser aliran agen lain. A5 tidak boleh
pernah dievaluasi pada seed yang pernah dilatihkan; karena pemisahannya
konstruktif (bukan acak), klaim ini dapat diperiksa, bukan sekadar dijanjikan.

---

## A-13 · Waktu komputasi dibandingkan dalam satu implementasi

**Pernyataan.** `decision_ms` mengukur **hanya** `select()` + `stow()`, satu
utas, mesin yang sama, di dalam runtime Node.js yang sama untuk A1–A4.

**Konsekuensi.** Angka A1–A4 sebanding satu sama lain. A5 akan berjalan di
Python, jadi waktu inferensinya **tidak** sebanding langsung; laporkan terpisah
dan bandingkan urutan besarannya saja. Untuk A4, yang menjadi variabel terkontrol
adalah **anggaran iterasi** (`hyperparameters.iterations`), dan anggaran itu
wajib dilaporkan bersama waktunya — bukan disembunyikan sebagai konstanta.

---

## A-14 · Batas atas bersifat relaksasi, bukan optimum

**Pernyataan.** `analysis/upper_bound.py` menyelesaikan MILP per-seed yang
melonggarkan empat hal: (R1) geometri penumpukan dihapus, slot sejenis menjadi
saling tertukar; (R2) biaya restow dinolkan; (R3) permintaan 8 minggu diketahui
di muka; (R4) penerimaan per kontainer, bukan per order.

**Alasan.** Keempatnya hanya bisa **membantu** solver, sehingga hasilnya
merupakan **batas atas sejati** atas kas yang mungkin dicapai — bukan heuristik
yang kebetulan bagus.

**Konsekuensi.** Batasnya **longgar**, dan itu harus dikatakan terus terang di
Bab 4. Rasio realisasi tidak boleh dibaca sebagai "agen kehilangan X% dari
optimum"; bacaannya adalah "agen mencapai sekurang-kurangnya X% dari plafon".
Nilainya tetap besar: tanpa angka ini, seluruh hasil hanya bersifat ordinal, dan
skenario di mana **semua** agen buruk tetap menghasilkan uji Friedman yang cantik
tanpa satu pun peringatan.

---

## A-15 · Agen stokastik dijalankan berulang; nilai sel adalah reratanya

**Pernyataan.** A1 (Random), A4 (Simulated Annealing), dan referensi BALANCED
menarik dari aliran acaknya sendiri. Ketiganya dijalankan **R = 5 kali** per seed
— permintaan identik, aliran acak agen berbeda — dan nilai yang masuk ke
rancangan blok adalah **rerata atas R** tersebut. Agen deterministik dijalankan
satu kali.

**Alasan.** Satu kali jalan per seed mencampuradukkan dua sumber variasi yang
berbeda: variasi **skenario** (antar-blok) dan variasi **algoritma** (dalam satu
blok). Untuk metaheuristik, mengabaikan yang kedua adalah kelalaian metodologis
yang lazim dikritik.

**Konsekuensi.** Sebaran dalam-seed dilaporkan terpisah sebagai `cash_sd_within`
/ kolom `sd(algo)`. Pada pilot, derau A4 sendiri ≈ Rp 42 jt sementara sebaran
antar-skenario ≈ Rp 187 jt — artinya sekitar seperempat sebaran A4 berasal dari
algoritmanya, bukan dari skenario. Angka itu sebelumnya tidak terlihat sama
sekali. Repetisi juga memperbaiki ekor bawah A4: p05-nya naik menyamai A3.

---

## A-16 · Anggaran iterasi A4 dipilih dari kurva, bukan ditetapkan sepihak

**Pernyataan.** Anggaran A4 adalah **800 iterasi**, dipilih dengan aturan
"anggaran terkecil yang berada dalam 1% dari median terbaik yang teramati" pada
sapuan 50 → 3.200 iterasi (`research/run-budget.mjs`).

**Alasan.** Bab 3 menjanjikan pengendalian ketidaksetaraan anggaran komputasi.
Sebuah konstanta di dalam kode bukan kendali; ia hanya angka. Kurva menjadikannya
variabel terkendali dengan aturan pemilihan yang dinyatakan di muka.

**Konsekuensi.** Kurvanya sendiri adalah temuan: di bawah 800 iterasi, A4
**lebih buruk** daripada A3 meski memakan 2–7 kali waktunya; A4 baru melampaui
A3 tepat pada 800 iterasi (≈ 15× waktu A3), dan menggandakannya lagi hanya
menambah sedikit. Laporkan kurva ini berdampingan dengan peringkat, karena kurva
inilah yang menjawab "apakah pencarian sepadan?" — pertanyaan yang tidak dijawab
oleh tabel peringkat mana pun.

---

## A-17 · Satu endpoint primer, sisanya keluarga sekunder

**Pernyataan.** **Pendapatan bersih (kas akhir)** adalah endpoint primer dan diuji
pada α = 0,05 tanpa koreksi. Jumlah restow, rolled container, dan utilisasi slot
membentuk keluarga sekunder; nilai p Friedman-nya dikoreksi **Holm-Bonferroni**.

**Alasan.** Menjalankan uji Friedman terpisah untuk enam variabel terikat tanpa
koreksi menaikkan peluang menemukan "sesuatu" di suatu tempat. Pembagian primer
/ sekunder harus dinyatakan **sebelum** hasil dilihat, bukan sesudahnya.

**Konsekuensi.** Waktu komputasi dan stabilitas dilaporkan sebagai statistik
deskriptif, tanpa uji hipotesis — keduanya adalah karakteristik algoritma, bukan
hasil yang perlu diuji signifikansinya. Selain itu, setiap pasangan agen
dilaporkan dengan **ukuran efek berpasangan**: median selisih per-blok beserta
selang kepercayaan bootstrap 95% dan proporsi blok yang dimenangkan. Signifikansi
menjawab "dapat dibedakan?"; ukuran efek menjawab "seberapa besar, dan seberapa
sering?" — dan keduanya berbeda. Contoh dari pilot: A4 mengungguli A3 dengan
median Rp 52,5 jt (SK 44,9–61,2) namun hanya memenangi **73%** blok.
