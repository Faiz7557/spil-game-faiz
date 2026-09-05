# Persamaan (3.1) – (3.7) Bab III

Ketujuh persamaan **sudah tertanam di dalam naskah** `164231059_Faiz Iqbal
I'tishom_Skripsi.docx`, masing-masing menggantikan paragraf nomor yang
sebelumnya kosong. Dokumen ini adalah catatan sumbernya: apa yang ditulis,
mengapa, dan apa yang masih terbuka.

## Cara merender

Persamaan tertulis sebagai teks LaTeX di antara `$$ … $$`, sesuai alur kerja
add-on **Auto-LaTeX Equations**.

1. Unggah `.docx` ke Google Drive, buka dengan Google Docs.
2. Extensions → Add-ons → Get add-ons → pasang **Auto-LaTeX Equations**.
3. Extensions → Auto-LaTeX Equations → **Render Equations**. Sekali jalan
   mengubah ketujuhnya menjadi gambar persamaan.
4. Ulangi setiap kali ada persamaan baru atau persamaan lama disunting.

Tiap paragraf persamaan sudah diberi dua tab stop — **rata tengah di 7,0 cm**
dan **rata kanan di 14,0 cm** (lebar area teks pada margin kiri 4 cm dan margin
kanan 3 cm). Susunannya: tab → LaTeX → tab → nomor. Setelah dirender, gambar
persamaan duduk di tengah dan nomornya menempel di margin kanan, tanpa perlu
penyetelan tambahan.

Kalau Anda mengubah delimiter di menu Settings add-on, sesuaikan pula `$$` di
naskah.

## Isi yang ditanamkan

| Nomor | Subbab | LaTeX |
|---|---|---|
| (3.1) | 3.3.2 | `$$M = \langle S, A, P, R, \gamma \rangle$$` |
| (3.2) | 3.3.3 | `$$r_t = \sum_{i \in L_t} \tau_i - c_r m_t - \sum_{j \in G_t} p_j$$` |
| (3.3) | 3.3.3 | `$$C_T = C_0 + \sum_{t=1}^{T} r_t$$` |
| (3.4) | 3.4.2 | `$$\rho = \frac{\lambda W}{N}$$` |
| (3.5) | 3.6.3 | `$$\chi_F^2 = \frac{12N}{k(k+1)} \left[ \sum_{j=1}^{k} \bar{R}_j^2 - \frac{k(k+1)^2}{4} \right]$$` |
| (3.6) | 3.6.3 | `$$W = \frac{\chi_F^2}{N(k-1)}$$` |
| (3.7) | 3.6.3 | `$$\mathrm{CD} = q_\alpha \sqrt{\frac{k(k+1)}{6N}}$$` |

Seluruhnya hanya memakai perintah LaTeX inti dan `amsmath`, tanpa paket
tambahan, sehingga aman bagi renderer add-on tersebut.

Notasi sengaja dibuat persis sama dengan paragraf keterangan yang sudah ada —
huruf tegak biasa untuk $M$, $S$, $A$, $P$, $R$, bukan `\mathcal` — supaya
persamaan dan kalimat penjelasnya tidak tampak berasal dari dua sumber berbeda.

## Perubahan yang menyertainya di naskah

**Keterangan Persamaan (3.2) dilengkapi.** Batas penjumlahan memerlukan nama
himpunan, sedangkan kalimat keterangan sebelumnya hanya menyebut “petikemas
ke-$i$ yang berhasil dimuat”. Kini didefinisikan $L_t$ sebagai himpunan
petikemas yang berhasil dimuat pada minggu ke-$t$ dan $G_t$ sebagai himpunan
petikemas yang gagal dimuat pada minggu ke-$t$. Huruf $G$ dipilih, bukan $R$,
karena $R$ sudah dipakai untuk fungsi imbalan pada Persamaan (3.1) dan
$\bar{R}_j$ untuk rerata peringkat pada Persamaan (3.5).

**Ukuran subskrip diperbaiki.** Sebelas run subskrip di Bab III
($r_t$, $\tau_i$, $c_r$, $m_t$, $p_j$, $\bar{R}_j$, $C_T$, $C_0$, $q_\alpha$)
membawa `w:sz` bernilai 66 setengah-poin, yaitu **33 pt**, sementara teks
tubuhnya 12 pt. Penetapan ukuran itu dihapus sehingga subskrip mewarisi ukuran
teks tubuh dan diperkecil otomatis oleh perender.

## Terbuka: tabrakan notasi pada huruf W

$W$ dipakai untuk **dua besaran berbeda**:

- Persamaan (3.4), Subbab 3.4.2 — rerata lama petikemas berada di atas kapal
  dalam satuan hop, yaitu suku $W$ pada hukum Little.
- Persamaan (3.6), Subbab 3.6.3 — koefisien konkordansi Kendall’s W.

Keduanya berjauhan letaknya sehingga tidak menimbulkan kerancuan saat dibaca
berurutan, tetapi seorang penguji yang memeriksa daftar notasi akan menandainya.
Perbaikan paling murah adalah mengganti suku hukum Little menjadi $\bar{W}$ atau
$D$ (*dwell*) di Persamaan (3.4) beserta kalimat keterangannya, dan membiarkan
$W$ khusus untuk Kendall’s W. Belum dilakukan karena mengubah notasi di dua
tempat sekaligus sebaiknya dikonfirmasi lebih dulu.

## Untuk nanti, saat Bab III disinkronkan dengan harness

Episode di harness berjalan 8 minggu keputusan ditambah 3 minggu *drain*, dan
pendapatan diakui saat pembongkaran (temuan K-01 dan K-02 pada audit). Begitu
kedua hal itu dinyatakan di naskah, Persamaan (3.3) menjadi:

```latex
$$C_T = C_0 + \sum_{t=1}^{T} r_t + \sum_{t=T+1}^{T+T_d} r_t$$
```

dengan $T_d = 3$, dan kalimat keterangannya perlu menyebut bahwa suku kedua
tidak memuat pendapatan dari kargo baru — hanya pengakuan pendapatan atas kargo
yang telah dimuat, dikurangi penalti restow yang tetap berlaku selama masa
*drain*.
