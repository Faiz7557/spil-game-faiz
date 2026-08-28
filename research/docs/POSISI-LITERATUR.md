# Posisi Penelitian terhadap Literatur (bahan Bab 1 dan Bab 2)

Dokumen ini merumuskan **celah penelitian** dan **klaim kebaruan** dalam bentuk
yang bisa dipertahankan, lalu memetakan klaim itu ke klaster referensi yang sudah
terverifikasi di `research/analysis/verify_refs.py`.

> **Catatan kejujuran.** Argumen celah di bawah diturunkan dari **struktur masalah**
> yang benar-benar dimodelkan di harness ini, bukan dari pembacaan isi setiap
> makalah. Kalimat yang ditandai **[VERIFIKASI]** adalah klaim tentang isi
> literatur dan wajib Anda cek langsung ke makalahnya sebelum masuk naskah.
> Jangan pernah menulis "belum ada penelitian yang…" tanpa membaca klasternya.

---

## 1. Rumusan celah dalam satu kalimat

> Literatur perencanaan muatan kapal petikemas memperlakukan **penerimaan kargo**
> dan **penyusunan muatan** sebagai dua masalah terpisah yang diselesaikan
> berurutan; penelitian ini membandingkan agen-agen otonom pada formulasi di mana
> keduanya adalah **satu keputusan sekuensial di bawah ketidakpastian permintaan**,
> pada lingkungan yang parameter ekonominya diambil dari operasi liner nyata.

Tiga unsur pembeda, masing-masing bisa dipertahankan dari kode:

**(a) Keputusan gabungan, bukan berurutan.**
Pada setiap port-call agen memutuskan *order mana yang diterima* **dan** *slot mana
untuk setiap kontainer*, dan kedua keputusan itu saling mengunci: menerima kargo
jarak jauh menghabiskan slot selama tiga port-call sekaligus menciptakan risiko
overstow. Formulasi klasik memisahkan keduanya — penerimaan adalah masalah
*revenue management*, penyusunan adalah masalah *stowage planning*.
**[VERIFIKASI]** pada klaster K1 dan K2.

**(b) Sekuensial dan daring, bukan sekali rencana.**
Permintaan baru muncul di setiap port-call dan tidak diketahui sebelumnya (A-7).
Agen tidak menyusun satu rencana muatan optimal untuk pelayaran yang sudah
diketahui; ia mengambil 8 keputusan berturut-turut yang konsekuensinya menumpuk —
penalti restow ditagih ulang setiap sandar (A-4). Ini yang menjadikan masalahnya
MDP, bukan program matematis satu tembakan.

**(c) Parameter ekonomi dari operasi nyata.**
Tarif berasal dari *Informasi Tarif Muatan PT. SPIL* dan tabel penalti dari
dokumen aturan permainan yang sama; keduanya diimpor apa adanya dari engine, tidak
ditulis ulang atau dikira-kira. Angka biaya restow, penalti *rolling* untuk
pelanggan *Committed* vs *Non-Committed*, dan struktur tarif antar-pelabuhan
adalah data domain, bukan parameter sintetis.

**Yang BUKAN klaim kebaruan** — dan lebih baik Anda sebut lebih dulu daripada
ditemukan penguji:

- Bukan algoritma baru. A3 dan A4 adalah heuristik dan metaheuristik standar.
- Bukan model stowage yang lebih lengkap. Stabilitas, berat, dan IMDG tidak
  dimodelkan (A-11), jadi model ini **lebih sederhana**, bukan lebih kaya,
  dibanding *master bay planning problem* penuh.
- Bukan penelitian tentang efektivitas game edukasi. Game adalah sumber domain
  dan parameter (A-1).

Kebaruannya ada pada **formulasi masalah + perbandingan terkontrol**, bukan pada
komponen-komponennya.

---

## 2. Peta klaster referensi

Kode klaster mengikuti `verify_refs.py` (19 DOI, seluruhnya sudah dicocokkan ke
Crossref dan OpenAlex). Kolom terakhir menyatakan **untuk apa** klaster itu dipakai
— setiap referensi harus punya pekerjaan, bukan sekadar memenuhi daftar pustaka.

| Klaster | Isi | Peran di naskah |
|---|---|---|
| **K1** (4 ref) | Perencanaan muatan / *stowage* & optimasi kombinatorial | Bab 2: definisi masalah, kompleksitas, kriteria overstow. Sumber pembenaran A-5. |
| **K2** (2 ref) | Metaheuristik untuk perencanaan muatan | Bab 2 & Bab 3: dasar rancangan A4 (skema pendinginan, operator tetangga, anggaran iterasi). |
| **K3** (10 ref) | *Deep reinforcement learning* untuk logistik/stowage/penjadwalan | Klaster terbesar dan inti Bab 2. Sumber rancangan A5: ruang observasi, *action masking*, bentuk *reward*, *domain randomization*. |
| **K5** (2 ref) | Simulasi & pembangkitan skenario | Bab 3: pembenaran desain faktorial, karakterisasi permintaan (V3), hukum Little. |
| **TPL** (1 ref) | Metodologi/kerangka pembanding | Bab 3: kerangka pelaporan perbandingan. |

**Yang hilang dan perlu diisi:**

1. **Tidak ada klaster K4.** Penomorannya melompat dari K3 ke K5. Entah ada
   klaster yang direncanakan lalu ditinggalkan, entah salah penomoran — rapikan
   sebelum daftar pustaka dibekukan.
2. **Tidak ada rujukan metode statistik.** Seluruh pipeline (`stats.py`) memakai
   Friedman → Kendall's W → post-hoc Nemenyi mengikuti **Demšar (2006),
   *Journal of Machine Learning Research* 7:1–30**. Rujukan ini disebut di komentar
   kode tetapi belum masuk `verify_refs.py`. Wajib ditambahkan — inilah satu-satunya
   dasar formal desain *randomized complete block* Anda.
3. **Tidak ada rujukan *revenue management* / *cargo acceptance*.** Klaim pembeda
   (a) di atas berdiri atau jatuh pada klaster ini. Tanpa 2–3 referensi yang
   menunjukkan bahwa penerimaan kargo memang dibahas terpisah dari penyusunan
   muatan, klaim "keduanya selalu dipisah" tidak punya dasar. Ini prioritas
   pencarian literatur berikutnya.

---

## 3. Cara menulis sub-bab celah (kerangka paragraf)

Urutan yang paling sulit dibantah, dan bisa langsung dipakai sebagai kerangka:

1. **Masalahnya nyata dan mahal.** Restow adalah biaya operasional yang berulang
   setiap sandar (A-4), bukan sekali bayar. → K1.
2. **Pendekatan yang ada memecah masalah.** Penerimaan diselesaikan sebagai
   *revenue management*; penyusunan sebagai *stowage planning* dengan permintaan
   yang sudah pasti. → K1, K2, + klaster *revenue management* yang belum ada.
3. **Pemecahan itu punya harga.** Menerima kargo tanpa memperhitungkan akibat
   susunannya menghasilkan rencana yang mahal — dan hal ini **terukur** di sini,
   bukan sekadar didalilkan: bot GREEDY menerima 100% permintaan namun tidak
   terpisah secara statistik dari strategi yang hanya mengangkut kargo Committed.
4. **DRL menjanjikan penanganan keputusan sekuensial**, tetapi penerapannya pada
   stowage masih terbatas pada sub-masalah tertentu. → K3. **[VERIFIKASI]**
5. **Karena itu diperlukan perbandingan terkontrol** antara agen non-pembelajar dan
   pembelajar pada satu formulasi gabungan yang sama, dengan skenario identik,
   pemisahan data yang konstruktif, dan batas atas yang terbukti sebagai acuan.
   → celah penelitian.

---

## 4. Klaim yang boleh Anda tulis, dan buktinya di repositori

Setiap klaim di bawah bisa Anda pertahankan sambil menunjuk file — ini yang
membedakan proposal yang kuat dari proposal yang berjanji.

| Klaim | Bukti |
|---|---|
| Lingkungan tidak menyimpang dari game | Harness mengimpor `gameEngine.js` dan `botEngine.js`; tidak ada logika ekonomi yang ditulis ulang |
| Skenario reproducible dan terpisah secara konstruksi | `rngForPortCall`, rentang seed TRAIN/VAL/TEST (A-12) |
| Skenario mampu memisahkan agen | Pemeriksaan V4, `run-pilot.mjs` |
| Permintaan sesuai model analitik | Pemeriksaan V3: ρ terukur vs ρ hukum Little |
| Hasil tidak bergantung pada satu titik operasi | V5, faktorial 4×2×3 pada `run-sensitivity.mjs` |
| Hasil tidak berasal dari artefak ujung horizon | V6 + masa *drain* (A-3) |
| Peringkat bukan sekadar ordinal | Rasio realisasi terhadap batas atas MILP (A-14) |
| Biaya komputasi dilaporkan, bukan disembunyikan | Kolom `decision_ms`, anggaran iterasi A4 (A-13) |
| Fisika kapal tidak pernah dilanggar | Penghitung `physicsViolations`, nol pada seluruh port-call |

---

## 5. Temuan awal yang layak masuk Bab 1 sebagai motivasi

Ketiganya sudah terukur pada pilot dan bisa dipakai untuk menunjukkan bahwa
masalahnya nyata — bukan sekadar diasumsikan menarik:

1. **"Terima semua" adalah jebakan.** Bot GREEDY menerima 100% permintaan namun
   tidak terpisah secara statistik dari strategi yang hanya mengangkut kargo
   Committed. Penerimaan tanpa anggaran kapasitas tidak menghasilkan apa-apa.

2. **Heuristik "sadar-restow" yang dikirim justru salah arah.** Bot SMART memuat
   kargo pelabuhan berikutnya **lebih dulu** ke tier atas, sehingga menyegel tier 02
   di bawah tutup palka dan memaksa kargo pelabuhan jauh yang datang kemudian
   bertengger tepat di atas kargo yang harus dibongkar duluan. Membalik urutan
   pemuatan (A3) memangkas restow sekitar 60% pada pilot. Mekanismenya bisa
   ditunjuk baris demi baris di `botEngine.js`, bukan sekadar diduga.

3. **Metaheuristik belum tentu sepadan.** Pada titik operasi nominal, A4 (simulated
   annealing, 800 iterasi) **tidak terpisah secara statistik** dari A3 (satu kali
   *pass* konstruktif) sementara memakan waktu keputusan sekitar 20 kali lipat.
   Keunggulannya baru muncul pada rezim beban rendah. Ini justru pembuka yang bagus
   untuk pertanyaan penelitian A5: kalau pencarian yang lebih kuat pada objektif
   satu-port-call tidak membantu, apakah kebijakan yang belajar melihat lebih jauh
   ke depan membantu?
