# Tabel Provenance Parameter (V1)

> Berkas ini **dibangkitkan** oleh `node research/verify-provenance.mjs --write`.
> Jangan disunting manual — ubah registri di skrip tersebut, lalu bangkitkan ulang.
> Skrip yang sama memverifikasi bahwa nilai di kode masih sama dengan tabel ini,
> sehingga tabel tidak dapat basi tanpa ketahuan.

## Status

| Status | Arti |
|---|---|
| **TERJUSTIFIKASI** | Dokumen sumber ada di repositori dan menyatakannya |
| **TAK-TERARSIP** | Dokumen sumber nyata dan dikutip, tetapi **belum diarsipkan** di repositori |
| **ASUMSI** | Tidak ada sumber empiris; keputusan rancangan, dijawab oleh analisis sensitivitas V5 |

Pemisahan TAK-TERARSIP dari TERJUSTIFIKASI disengaja. Glosarium di `Info/`
memuat terminologi tetapi **tidak memuat satu pun nilai uang**; lembar tarif dan
dokumen aturan yang menetapkannya dikutip di kode permainan dan di naskah, namun
tidak ada di repositori. Melaporkannya sebagai "terjustifikasi" akan melebih-lebihkan
apa yang benar-benar dapat diperiksa.

## Tabel

| Kode | Parameter | Nilai | Sumber | Status |
|---|---|---|---|---|
| P-01 | Sirkuit pelabuhan | SBY - MKS - JYP - MDN | Info/GLOSSARIUM - SPIL GAME 4 JALUR.pdf, hal. 2-3 (PORT CODE, PORT ROUTE) | TERJUSTIFIKASI |
| P-02 | Definisi Next Port / Later Port | Next = pelabuhan berikutnya; Later = kedua & ketiga sesudahnya | Info/GLOSSARIUM - SPIL GAME 4 JALUR.pdf, hal. 7 | TERJUSTIFIKASI |
| P-03 | Definisi restowage move | 1 kontainer restow = 2 pergerakan (turun + naik kembali) | Info/GLOSSARIUM - SPIL GAME 4 JALUR.pdf, hal. 5 (Restowage Move) dan hal. 10 | TERJUSTIFIKASI |
| P-04 | Definisi Committed / Non-Committed customer | Committed kena penalti walau order ditolak; Non-Committed hanya bila gagal muat setelah diterima | Info/GLOSSARIUM - SPIL GAME 4 JALUR.pdf, hal. 8 | TERJUSTIFIKASI |
| P-05 | Definisi rolled container | Kontainer yang gagal muat / tertinggal | Info/GLOSSARIUM - SPIL GAME 4 JALUR.pdf, hal. 10 | TERJUSTIFIKASI |
| P-06 | Tabel tarif muatan (4 x 4 pelabuhan, DRY & REEFER) | 24 pasangan asal-tujuan; contoh SBY->MKS DRY Rp 18 jt, REEFER Rp 30 jt | Informasi Tarif Muatan PT. SPIL | TAK-TERARSIP |
| P-07 | Biaya restow per pergerakan | Rp 3.000.000 | Aturan permainan SPIL 4 Jalur | TAK-TERARSIP |
| P-08 | Denda gagal muat - pelanggan Committed | DRY Rp 16.000.000; REEFER Rp 24.000.000 per petikemas | Aturan permainan SPIL 4 Jalur | TAK-TERARSIP |
| P-09 | Denda gagal muat - pelanggan Non-Committed | DRY Rp 8.000.000; REEFER Rp 16.000.000 per petikemas, hanya bila order sudah diterima | Aturan permainan SPIL 4 Jalur | TAK-TERARSIP |
| P-10 | Kas awal | Rp 150.000.000 | Aturan permainan SPIL 4 Jalur | TAK-TERARSIP |
| P-11 | Konsep bay plan (jenis slot & tujuan menentukan peletakan) | DRY dan REEFER terpisah; peletakan mengikuti pelabuhan tujuan | Info/GLOSSARIUM - SPIL GAME 4 JALUR.pdf, hal. 4-5 | TERJUSTIFIKASI |
| P-12 | Konfigurasi kapal eksperimen | 3 bay (10, 06, 02); 36 slot = 12 REEFER + 24 DRY | Implementasi permainan (shared/gameConstants.js), varian Small Vessel | TERJUSTIFIKASI |
| P-13 | Aturan fisika penumpukan | tier 84 menuntut 82 terisi; tier 02 tak terjangkau bila 82 atau 84 terisi | Implementasi permainan (shared/gameConstants.js, validateGridPhysics) | TERJUSTIFIKASI |
| P-14 | Horizon keputusan | 8 minggu | Keputusan rancangan - 2 putaran penuh sirkuit 4 pelabuhan | ASUMSI |
| P-15 | Masa drain | 3 minggu | Turunan: sama dengan dwell maksimum (P-1 hop). Lihat ASUMSI.md A-3 | ASUMSI |
| P-16 | Jumlah order per kunjungan | Uniform{6..10}, rerata 8, diskala oleh intensity | ASUMSI - tak ada data pemesanan operasional. Dijawab oleh V5 (faktor rho) | ASUMSI |
| P-17 | Kuantitas per order | Uniform{1,2,3}, rerata 2 | ASUMSI - tak ada data operasional. Dijawab oleh V5 (faktor rho) | ASUMSI |
| P-18 | Pangsa REEFER (sigma) | 0,30 nominal | ASUMSI - diturunkan agar rho_REEFER layak (0,80). Dijawab oleh V5 (faktor sigma) | ASUMSI |
| P-19 | Proporsi Committed (kappa) | 0,40 nominal | ASUMSI - nilai bawaan permainan. Dijawab oleh V5 (faktor kappa) | ASUMSI |
| P-20 | Tujuan kargo | Seragam atas tiga pelabuhan selain pelabuhan asal | ASUMSI - menghasilkan dwell rerata P/2 = 2 hop | ASUMSI |

## Ringkasan

- Terjustifikasi: **8**
- Tak-terarsip: **5**
- Asumsi: **7**

## Tindakan terbuka

1. Arsipkan **Informasi Tarif Muatan PT. SPIL** dan **Aturan permainan SPIL 4 Jalur** ke `Info/`.
   Sampai itu dilakukan, seluruh nilai uang berstatus TAK-TERARSIP dan V1 belum tertutup penuh.
2. Setiap parameter berstatus ASUMSI wajib muncul sebagai faktor pada V5 atau
   dinyatakan sebagai batasan di Bab 1. Saat ini rho, sigma, dan kappa terpenuhi;
   horizon dan konfigurasi kapal dinyatakan sebagai batasan (lihat ASUMSI.md A-6).
