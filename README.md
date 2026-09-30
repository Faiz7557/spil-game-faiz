# 🚢 SPIL Game: 4 Jalur — Simulator Logistik & Stowage Kontainer

> **Game simulasi penataan kontainer (stowage bayplan) pelayaran domestik Indonesia** berbasis aturan industri nyata PT. SPIL (Salam Pacific Indonesia Lines). Optimalkan ruang kapal, terima pesanan kargo secara strategis, minimalkan denda restow & rolling, dan jadilah kapten logistik terbaik!

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

---

## 📑 Daftar Isi

- [Gambaran Umum](#-gambaran-umum)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Struktur Proyek](#-struktur-proyek)
- [Tech Stack](#-tech-stack)
- [Mekanisme Permainan (Game Mechanics)](#-mekanisme-permainan-game-mechanics)
  - [Sirkuit Pelayaran](#1-sirkuit-pelayaran)
  - [Bayplan Kapal & Koordinat ISO 9711](#2-bayplan-kapal--koordinat-iso-9711)
  - [Fase Bermain Setiap Minggu](#3-fase-bermain-setiap-minggu)
  - [Sistem Kargo & Sales Call](#4-sistem-kargo--sales-call)
  - [Sistem Penalti](#5-sistem-penalti)
  - [Sistem Pendapatan](#6-sistem-pendapatan)
  - [Sistem Rating Kapten](#7-sistem-rating-kapten)
  - [Vessel Upgrade](#8-vessel-upgrade)
- [Mode Permainan](#-mode-permainan)
  - [Mabar Offline (vs Bot AI)](#1-mabar-offline-vs-bot-ai)
  - [Mabar Online (Multiplayer Real-time)](#2-mabar-online-multiplayer-real-time)
- [Server (Backend)](#-server-backend)
  - [REST API Endpoints](#rest-api-endpoints)
  - [WebSocket Events](#websocket-events)
  - [Game Engine](#game-engine)
  - [Bot Engine (AI)](#bot-engine-ai)
  - [Autentikasi & Keamanan](#autentikasi--keamanan)
  - [Database Schema](#database-schema)
- [Client (Frontend)](#-client-frontend)
  - [Komponen Utama](#komponen-utama)
  - [Design System](#design-system)
  - [Interaksi Pengguna](#interaksi-pengguna)
- [Shared Module](#-shared-module)
- [Cara Instalasi & Menjalankan](#-cara-instalasi--menjalankan)
- [Konfigurasi Environment](#-konfigurasi-environment)
- [Roadmap & Rencana Pengerjaan Teknis (Technical Plan)](#-roadmap--rencana-pengerjaan-teknis-technical-plan)
- [Riwayat Update Terkini](#-riwayat-update-terkini)
- [Glosarium Istilah Industri](#-glosarium-istilah-industri)

---

## 🎯 Gambaran Umum

**SPIL Game: 4 Jalur** adalah sebuah *serious game* simulasi logistik yang memodelkan operasi penataan kontainer pada kapal petikemas di rute pelayaran domestik Indonesia. Game ini dibangun berdasarkan:

- **Aturan industri nyata** PT. SPIL (Salam Pacific Indonesia Lines)
- **Standar ISO 9711-1** untuk koordinat bayplan (Bay, Row, Tier)
- **Tabel tarif resmi** pelayaran domestik Indonesia
- **Mekanisme operasional** restow, rolling, discharge, dan load yang realistis

### Tujuan Permainan

Pemain berperan sebagai **Kapten Logistik** di salah satu cabang pelabuhan. Tugas utama adalah:

1. **Menerima/menolak** pesanan kargo (Sales Call) secara strategis
2. **Menempatkan kontainer** ke dalam bayplan kapal dengan penataan yang optimal
3. **Meminimalkan denda** (penalti restow & rolling) yang merugikan pendapatan
4. **Memaksimalkan pendapatan bersih** (Net Revenue) selama 8 minggu pelayaran

### Konteks Akademik

Proyek ini dikembangkan sebagai bagian dari **penelitian skripsi** (Thesis) oleh Faiz Iqbal I'tishom (NIM: 164231059) yang mengkaji efektivitas simulator berbasis aturan industri untuk pelatihan penatalaksanaan kontainer. Sistem ini juga dilengkapi *research harness* untuk eksperimen reinforcement learning dan validasi skenario.

---

## 🏗 Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────────┐
│                        SPIL Game: 4 Jalur                        │
│                     Monorepo Architecture                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    HTTP/REST     ┌───────────────────────┐     │
│  │              │ ◄──────────────► │                       │     │
│  │    CLIENT    │                  │       SERVER          │     │
│  │  (React 19)  │    WebSocket     │    (Express.js)       │     │
│  │  Vite + TW   │ ◄═════════════► │    Socket.IO          │     │
│  │  Port: 5190  │    (Socket.IO)   │    Port: 5050         │     │
│  │              │                  │                       │     │
│  └──────┬───────┘                  └──────────┬────────────┘     │
│         │                                     │                  │
│         │        ┌──────────────┐              │                  │
│         └───────►│    SHARED    │◄─────────────┘                  │
│                  │  Constants   │                                 │
│                  │ (Bay Config, │    ┌─────────────────────┐      │
│                  │  Tariffs,    │    │    PostgreSQL DB     │      │
│                  │  Glossary,   │    │  ┌───────────────┐  │      │
│                  │  Physics)    │    │  │    rooms       │  │      │
│                  └──────────────┘    │  │    sessions    │  │      │
│                                     │  │    users       │  │      │
│                                     │  │  leaderboard   │  │      │
│                                     │  │   _entries     │  │      │
│                                     │  └───────────────┘  │      │
│                                     └─────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### Prinsip Arsitektur

| Prinsip | Implementasi |
|---------|-------------|
| **Server-Authoritative** | Seluruh kalkulasi ekonomi (kas, penalti, pendapatan) dilakukan di server. Client hanya mengirim *intent* (niat aksi), server memvalidasi dan mengembalikan state terbaru. |
| **Single Source of Truth** | Konstanta game (layout kapal, tarif, fisika) terpusat di `shared/gameConstants.js`, diimpor oleh client dan server agar tidak pernah *drift*. |
| **Deterministic RNG** | Mode offline menggunakan Mulberry32 PRNG dengan seed FNV-1a, sehingga skenario dapat direproduksi untuk eksperimen riset. |
| **Stateless Persistence** | State multiplayer disimpan in-memory (`ROOMS{}`) namun di-flush asinkron ke PostgreSQL. Saat restart, room dan session di-*load* kembali dari DB. |
| **Reconnect-Safe Identity** | Player ID berbasis `localStorage` (bukan `socket.id`), sehingga refresh browser atau restart server tidak kehilangan identitas pemain. |

---

## 📁 Struktur Proyek

```
SPIL-GAME/
├── package.json                 # Monorepo root — scripts: install-all, dev, server, client
├── .gitignore                   # Mengabaikan node_modules, .env, dist, docx, research
│
├── shared/                      # 🔗 Shared Module (Single Source of Truth)
│   ├── package.json
│   └── gameConstants.js         # Layout kapal, tarif, glosarium, fisika validasi
│
├── server/                      # 🖥️ Backend (Express.js + Socket.IO)
│   ├── package.json
│   ├── .env.example             # Template konfigurasi environment
│   ├── server.js                # Entry point — REST API + WebSocket handlers (~1547 baris)
│   ├── verifyEngine.js          # Unit test internal game engine
│   ├── showDb.js                # Utility viewer database
│   └── utils/
│       ├── auth.js              # JWT + Bcrypt autentikasi
│       ├── botEngine.js         # AI bot (Smart, Greedy, Balanced)
│       ├── db.js                # PostgreSQL connection pool
│       ├── gameEngine.js        # Core rules engine (RNG, orders, restow, sailing)
│       └── initDb.js            # Schema creation + migrasi programatik
│
├── client/                      # 💻 Frontend (React 19 + Vite + Tailwind CSS)
│   ├── package.json
│   ├── index.html               # HTML entry point (lang="id")
│   ├── vite.config.js           # Vite config (port 5190, strict)
│   ├── tailwind.config.js       # Design tokens: port colors, status, animations
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   └── src/
│       ├── main.jsx             # Entry point + ErrorBoundary premium
│       ├── App.jsx              # Main controller & state container (~59KB)
│       ├── App.css              # Minimal app-specific styles
│       ├── index.css            # Global styles, glass panels, animations, a11y
│       ├── assets/
│       │   └── hero.png
│       ├── components/
│       │   ├── BayplanSimulator.jsx  # 🎮 Core game UI — grid, sidebar, cargo (~57KB)
│       │   ├── Dashboard.jsx         # Header bar, branding, scoreboard (~13KB)
│       │   ├── GameOverModal.jsx     # End-game summary & rating (~8KB)
│       │   ├── GlossaryModal.jsx     # Kamus istilah industri (~5KB)
│       │   ├── PerformanceModal.jsx  # Evaluasi mingguan post-departure (~16KB)
│       │   └── TariffModal.jsx       # Tabel tarif resmi interaktif (~12KB)
│       └── utils/
│           └── gameHelpers.js        # Re-export shared + format Rupiah, port helpers
│
└── research/                    # 📊 Research Harness (gitignored)
    └── run-pilot.mjs            # Runner eksperimen validasi & RL training
```

---

## 🛠 Tech Stack

### Backend

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Node.js** | 18+ | Runtime JavaScript server-side |
| **Express.js** | 4.19 | Framework HTTP REST API |
| **Socket.IO** | 4.8.3 | WebSocket real-time bidirectional |
| **PostgreSQL** | 15+ | Persistent database (rooms, sessions, users, leaderboard) |
| **pg** | 8.21 | PostgreSQL driver untuk Node.js |
| **jsonwebtoken** | 9.0.3 | JWT token untuk autentikasi |
| **bcryptjs** | 3.0.3 | Hashing password (salt round: 10) |
| **express-rate-limit** | 8.6.2 | Rate limiting endpoint autentikasi |
| **dotenv** | 17.4 | Environment variable management |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |
| **nodemon** | (dev) | Hot-reload server development |

### Frontend

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **React** | 19.2.6 | UI library (hooks-based, no class components) |
| **Vite** | 8.0 | Build tool & dev server (HMR, port 5190) |
| **Tailwind CSS** | 3.4 | Utility-first CSS framework |
| **Socket.IO Client** | 4.8.3 | WebSocket client untuk multiplayer |
| **Lucide React** | 1.17 | Icon library (Anchor, Ship, Package, PhoneCall, dll.) |
| **PostCSS** | 8.5 | CSS post-processor (autoprefixer) |

### Development

| Tool | Fungsi |
|------|--------|
| **concurrently** | Menjalankan server & client bersamaan (`npm run dev`) |
| **ESLint** | Linting JavaScript & React hooks |

---

## 🎮 Mekanisme Permainan (Game Mechanics)

### 1. Sirkuit Pelayaran

Kapal berlayar secara **siklis** menghubungkan pelabuhan-pelabuhan utama Indonesia:

```
🏭 SBY (01) ➔ 🏭 MKS (02) ➔ 🏭 JYP (03) ➔ 🏭 MDN (04) ➔ kembali ke SBY (01)
   Surabaya       Makassar       Jayapura        Medan
 Tanjung Perak  Soekarno-Hatta  Pel. Jayapura  Pel. Belawan
```

Sirkuit pelayaran distandarisasi secara penuh pada **4 pelabuhan resmi** sesuai Glosarium Operasional PT. SPIL, menjamin konsistensi 100% antara engine game, tabel tarif resmi, bayplan ISO 9711, dan environment riset DRL.

### 2. Bayplan Kapal & Koordinat ISO 9711

Layout kapal menggunakan **sistem koordinat ISO 9711-1**:

```
         HALUAN (BOW)                           BURITAN (STERN)
    ←───────────────────────────────────────────────────→

    Bay 26*  Bay 22*  Bay 18   Bay 14   Bay 10   Bay 06   Bay 02
    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
    │ DRY  │ │ DRY  │ │ DRY  │ │REEFER│ │REEFER│ │ DRY  │ │ DRY  │
    │4x3   │ │4x3   │ │3x2   │ │4x3   │ │4x3   │ │4x3   │ │4x3   │
    └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
    *Bay 26 & 22 hanya tersedia di Vessel Level 3
```

**Dimensi per Bay:**

| Bay | Tipe | Rows | Tiers | Total Slot |
|-----|------|------|-------|------------|
| 26, 22 | DRY | 4 (03, 01, 02, 04) | 3 (84, 82, 02) | 12 |
| 18 | DRY | 3 (01, 00, 02) | 2 (84, 82) | 6 |
| 14, 10 | REEFER | 4 (03, 01, 02, 04) | 3 (84, 82, 02) | 12 |
| 06, 02 | DRY | 4 (03, 01, 02, 04) | 3 (84, 82, 02) | 12 |

**Sistem Tier (Ketinggian):**
| Tier | Posisi | Keterangan |
|------|--------|------------|
| **02** | Underdeck (Palka) | Di bawah hatch cover, ideal untuk Later Port |
| **82** | On-Deck Lower | Di atas hatch cover, level dasar geladak |
| **84** | On-Deck Upper | Tumpukan teratas, ideal untuk Next Port |

**Sistem Row (Melintang, ISO 9711-1):**
- Nomor **ganjil** → sisi kanan kapal (Starboard)
- Nomor **genap** → sisi kiri kapal (Port)
- **00** → garis tengah kapal (Center, hanya Bay 18)

**Aturan Fisika Kapal:**
1. **Tier 84 membutuhkan Tier 82** — Kontainer tidak boleh "melayang" tanpa penyangga di bawahnya
2. **Tipe kontainer harus sesuai bay** — Bay REEFER hanya menerima REEFER, Bay DRY hanya menerima DRY
3. **Slide-Down Physics** — Saat Tier 82 dibongkar, kontainer di Tier 84 otomatis turun mengisi Tier 82
4. **Underdeck (02) independen** — Tidak terpengaruh oleh slot di atasnya karena dipisahkan hatch cover

### 3. Fase Bermain Setiap Minggu

Setiap minggu (port call) terdiri dari tiga fase utama:

```
┌─────────────────────┐     ┌────────────────────┐     ┌──────────────────────┐
│   FASE 1: KARGO     │────►│  FASE 2: STOWAGE   │────►│   FASE 3: EVALUASI   │
│   Sales Call        │     │  Penempatan Grid   │     │   & Keberangkatan    │
│   Accept / Decline  │     │  Drag & Drop       │     │   Weekly Performance │
└─────────────────────┘     └────────────────────┘     └──────────────────────┘
        │                           │                           │
  • Lihat pool kargo         • Tempatkan kontainer     • Hitung Restow Penalty
  • Terima committed         • Validasi fisika         • Hitung Rolling Penalty
  • Tolak/terima regular     • Buffer kargo sementara  • Hitung Discharge Revenue
  • Perhatikan tarif         • Cek restow blocker      • Net Revenue per minggu
                             • Optimasi Next/Later     • Slide-down physics
                                                       • Transisi ke port baru
```

### 4. Sistem Kargo & Sales Call

**Tipe Customer:**

| Tipe | Deskripsi | Konsekuensi Tidak Dimuat |
|------|-----------|-------------------------|
| **Committed** | Customer kontrak prioritas | Penalti berat OTOMATIS (wajib diambil) |
| **Non-Committed** | Customer biasa | Tanpa penalti jika ditolak; penalti jika diterima tapi gagal dimuat |

**Tipe Kontainer:**

| Tipe | Bay yang Tersedia | Ciri Khas |
|------|-------------------|-----------|
| **DRY** | 26, 22, 18, 06, 02 | Kontainer kargo kering standar |
| **REEFER** | 14, 10 | Kontainer berpendingin, dilengkapi plug listrik |

**Parameter Generator Pesanan (`generateOrders`):**

| Parameter | Default | Deskripsi |
|-----------|---------|-----------|
| `intensity` (λ) | 1.0 | Skala jumlah order per port-call (base: 6–10, mean 8) |
| `reeferShare` (σ) | 0.30 | Probabilitas kontainer berjenis REEFER |
| `committedShare` (κ) | 0.40 | Probabilitas customer berjenis Committed |

### 5. Sistem Penalti

#### Restow Penalty (Shifting)
- **Terjadi ketika:** Kontainer Later Port menghalangi kontainer Next Port di bawahnya dalam satu stack vertikal
- **Biaya:** Rp 3.000.000 per movement (1 kontainer restow = 2 movements = **Rp 6.000.000**)
- **Mekanisme:** Harus mengangkat kontainer penghalang, mengeluarkan kontainer tujuan, lalu mengembalikan penghalang

#### Rolling Penalty (Gagal Muat)

| Customer | Tipe Kontainer | Penalti per Unit |
|----------|---------------|-----------------|
| **Committed** | DRY | Rp 16.000.000 |
| **Committed** | REEFER | Rp 24.000.000 |
| **Non-Committed** (order sudah diterima) | DRY | Rp 8.000.000 |
| **Non-Committed** (order sudah diterima) | REEFER | Rp 16.000.000 |
| **Non-Committed** (order ditolak) | — | **Rp 0** (tanpa penalti) |

### 6. Sistem Pendapatan

**Pendapatan diakui berdasarkan *Discharge Recognition*:**
- Revenue **dicatat** saat kontainer **tiba di pelabuhan tujuan** (bukan saat dimuat)
- Kontainer yang masih di kapal saat game berakhir (Minggu 8) **tidak menghasilkan revenue**
- Ini memotivasi pemain untuk merencanakan rute multi-hop secara strategis

**Tabel Tarif Resmi (dalam Rupiah):**

| Asal → Tujuan | DRY | REEFER |
|---------------|-----|--------|
| SBY → MKS | 18.000.000 | 30.000.000 |
| SBY → JYP | 16.200.000 | 24.000.000 |
| SBY → MDN | 6.000.000 | 11.000.000 |
| MKS → SBY | 10.000.000 | 18.000.000 |
| MKS → JYP | 16.000.000 | 24.000.000 |
| MKS → MDN | 12.000.000 | 20.000.000 |
| JYP → SBY | 13.000.000 | 19.000.000 |
| JYP → MKS | 13.000.000 | 23.000.000 |
| JYP → MDN | 11.000.000 | 17.000.000 |
| MDN → SBY | 13.000.000 | 22.000.000 |
| MDN → MKS | 14.000.000 | 24.000.000 |
| MDN → JYP | 14.000.000 | 22.000.000 |

### 7. Sistem Rating Kapten

| Saldo Akhir | Rating |
|-------------|--------|
| ≥ Rp 300.000.000 | VP Operasi Logistik & Stowage |
| ≥ Rp 200.000.000 | Spesialis Stowage Pelabuhan Senior |
| ≥ Rp 100.000.000 | Koordinator Logistik Standar |
| > Rp 0 | Perwira Logistik Junior |
| < Rp 0 | Supervisor Terminal Bangkrut |

### 8. Vessel Upgrade

**Vessel Level (Mode Offline):**

| Level | Bay Tersedia | Total Slot DRY | Total Slot REEFER | Biaya Upgrade |
|-------|-------------|----------------|-------------------|---------------|
| 1 | 10, 06, 02 | 12 | 12 | — (default) |
| 2 | 18, 14, 10, 06, 02 | 18 | 12 | Rp 50.000.000 |
| 3 | 26, 22, 18, 14, 10, 06, 02 | 42 | 12 | Rp 100.000.000 |

---

## 🕹 Mode Permainan

### 1. Mabar Offline (vs Bot AI)

**Alur Permainan:**
1. Pemain memulai sesi baru → server membuat session dengan seed unik
2. Pemain bermain sebagai **Kapten #0** (port pertama dalam sirkuit)
3. Setelah pemain menekan **Berangkat**, server menjalankan giliran **3 Bot AI** secara berurutan
4. Bot memilih kargo dan menyusun kontainer sesuai kepribadian masing-masing
5. Evaluasi mingguan: restow, rolling, discharge dihitung per pemain
6. Transisi ke port berikutnya → ulangi sampai Minggu 8 atau bangkrut

**Profil Bot AI:**

| Bot | Kepribadian | Strategi Kargo | Strategi Stowage |
|-----|-------------|----------------|-----------------|
| 🤖 **Alpha** | SMART | Hanya terima tarif ≥ 11 Jt + semua committed | Later Port → Underdeck (02), Next Port → On-Deck (82/84) |
| ⚡ **Beta** | GREEDY | Terima semua order tanpa seleksi | Isi slot secara berurutan tanpa optimasi |
| ⚖️ **Gamma** | BALANCED | Terima ~60% order regular + semua committed | Isi slot secara berurutan |

**Fitur Khusus Mode Offline:**
- **Resumable Session** — Session disimpan di database, bisa dilanjutkan saat browser dibuka kembali
- **Deterministic RNG** — Skenario identik untuk seed yang sama (reproduksi eksperimen)
- **Vessel Upgrade** — Pemain bisa memperbesar kapal (Level 1→2→3) jika kas mencukupi

### 2. Mabar Online (Multiplayer Real-time)

**Alur Permainan:**
1. Host membuat room → mendapat kode 4 karakter (contoh: `A3B7`)
2. Pemain lain bergabung dengan kode tersebut
3. Semua pemain **berbagi satu kargo pool global** dan **satu grid kapal bersama**
4. Saat semua pemain menekan **Ready** atau **Turn Timer (60 detik)** habis, server menjalankan transisi berlayar
5. Evaluasi dihitung untuk setiap pemain berdasarkan kontribusi masing-masing

**Fitur Khusus Mode Online:**
- **Real-time Sync** — Setiap perubahan grid/kargo langsung ter-broadcast ke semua pemain
- **Room Persistence** — Room disimpan di database, bertahan saat server restart
- **Reconnect Safe** — Player ID persistent via `localStorage`, bukan `socket.id`
- **Shared Cargo Pool** — Kompetisi langsung memperebutkan pesanan kargo yang sama
- **Global Grid** — Satu kapal dioperasikan bersama, keputusan satu pemain memengaruhi semua
- **Turn Countdown Timer (60s)** — Timer sinkron server; auto-ready pemain saat timeout mencegah deadlock room

---

## 🖥 Server (Backend)

### REST API Endpoints

#### Autentikasi

| Method | Endpoint | Deskripsi | Rate Limit |
|--------|----------|-----------|------------|
| `POST` | `/api/auth/register` | Registrasi akun baru | 20 req / 15 menit |
| `POST` | `/api/auth/login` | Login & dapatkan JWT token | 20 req / 15 menit |

#### Leaderboard

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/leaderboard?limit=N` | Top kapten berdasarkan saldo akhir (max 100) |

#### Game Offline

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/game/offline/resume` | Cek & resume sesi yang sedang berjalan |
| `POST` | `/api/game/offline/start` | Mulai sesi baru (buat grid, spawn bot, generate orders) |
| `POST` | `/api/game/offline/claim-cargo` | Terima order kargo → unpack ke pending containers |
| `POST` | `/api/game/offline/decline-cargo` | Tolak order kargo (Non-Committed saja) |
| `POST` | `/api/game/offline/place-container` | Tempatkan kontainer ke slot grid (validasi fisika) |
| `POST` | `/api/game/offline/remove-container` | Kembalikan kontainer dari grid ke buffer |
| `POST` | `/api/game/offline/upgrade-vessel` | Upgrade vessel level (bayar dari kas) |
| `POST` | `/api/game/offline/depart` | Berangkat: jalankan bot AI, hitung penalti, transisi port |

#### Utility

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/health` | Health check server |

### WebSocket Events

#### Client → Server (Emit)

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `create_room` | `{ playerName, playerId, authToken }` | Buat room multiplayer baru |
| `join_room` | `{ roomCode, playerName, playerId, authToken }` | Gabung ke room yang ada |
| `claim_cargo` | `{ orderId }` | Klaim order dari pool global |
| `decline_cargo` | `{ orderId }` | Tolak order (Non-Committed) |
| `place_container` | `{ containerId, bay, row, tier }` | Tempatkan kontainer ke grid |
| `remove_container` | `{ bay, row, tier }` | Angkat kontainer dari grid |
| `player_ready` | — | Tandai pemain siap berangkat |
| `player_unready` | — | Batalkan status siap |
| `leave_room` | — | Keluar dari room |

#### Server → Client (Emit)

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `room_created` | `{ roomCode, state }` | Room berhasil dibuat |
| `room_joined` | `{ roomCode, state }` | Berhasil bergabung ke room |
| `room_state` | `{ ...roomState }` | Broadcast state terbaru ke semua pemain |
| `sailing_completed` | `{ ...roomState }` | Transisi berlayar selesai, evaluasi mingguan |
| `turn_timer_tick` | `{ remainingSeconds, totalSeconds }` | Broadcast sisa waktu giliran (60s) setiap detik |
| `error_message` | `string` | Pesan error (termasuk `auth_expired:...`) |

### Game Engine

File: `server/utils/gameEngine.js`

#### Fungsi Inti

| Fungsi | Parameter | Deskripsi |
|--------|-----------|-----------|
| `createRng(seed)` | `seed: number` | Mulberry32 PRNG — menghasilkan fungsi `() → [0, 1)` deterministik |
| `hashSeed(...parts)` | `...parts: string[]` | FNV-1a 32-bit hash — menghasilkan sub-seed stabil per port-call |
| `rngForPortCall(seed, week, port)` | — | Menggabungkan seed + week + port menjadi RNG khusus port-call |
| `generateOrders(port, week, activePorts, rng, scenario)` | — | Membangkitkan 6–10 order kargo per port-call |
| `calculateRestows(grid, currentPort, activePorts)` | — | Menghitung kontainer blocker dan movements restow |
| `calculateRollingPenalties(orders, grid, currentPort)` | — | Menghitung denda gagal muat berdasarkan tipe customer |
| `calculateGrossRevenue(grid, currentPort)` | — | Revenue berdasarkan *load recognition* (referensi riset) |
| `calculateDischargeRevenue(grid, nextPort)` | — | Revenue berdasarkan *discharge recognition* (yang dipakai) |
| `calculateDischargeCount(grid, nextPort)` | — | Jumlah kontainer yang dibongkar di next port |
| `processSailingTransition(grid, nextPort)` | — | Bongkar kontainer next port + slide-down physics |

#### Algoritma Restow Detection

```
Untuk setiap stack vertikal (bay × row):
  1. Traverse dari tier bawah (02) → tier atas (84)
  2. Jika ditemukan kontainer dengan destination = nextPort → set flag "nextPortFound"
  3. Jika di atasnya ada kontainer dengan destination ≠ nextPort DAN flag sudah aktif:
     → Kontainer itu adalah BLOCKER (restow container)
     → Tambahkan ke restowedList
  4. restowMovements = restowContainers × 2
```

#### Slide-Down Physics

```
Setelah kontainer nextPort dibongkar:
  Untuk setiap stack:
    Jika Tier 84 terisi DAN Tier 82 kosong:
      → Pindahkan Tier 84 ke Tier 82 (gravitasi)
    Catatan: Tier 02 (underdeck) tidak memengaruhi Tier 82 karena dipisahkan hatch cover
```

### Bot Engine (AI)

File: `server/utils/botEngine.js`

#### Algoritma Bot

**Fase 1 — Seleksi Kargo (`executeBotCargoSelection`):**

```
Untuk setiap order di cargoPool bot:
  JIKA order.customerType === 'Committed':
    → SELALU terima (mencegah penalti berat)
  JIKA TIDAK:
    → SMART: Terima jika tarif ≥ Rp 11.000.000
    → GREEDY: Terima semua
    → BALANCED: Terima dengan probabilitas 60% (via RNG)
  
  Jika diterima: unpack order → pendingContainers[]
```

**Fase 2 — Penempatan Stowage (`executeBotStowagePlacement`):**

```
SMART bot melakukan pra-sortir:
  → Later Port containers DULUAN (agar masuk underdeck)
  → Next Port containers TERAKHIR (agar di on-deck)

Untuk setiap pending container:
  Iterasi semua bay (descending by number):
    Jika containerType tidak cocok bay → skip
    
    SMART bot menentukan tier order:
      → Next Port: prefer [84, 82, 02] (atas dulu)
      → Later Port: prefer [02, 82, 84] (bawah dulu)
    
    Cari slot kosong yang memenuhi fisika:
      → Tier 84 butuh Tier 82 terisi
      → Tier 02 blocked jika Tier 82/84 sudah terisi
    
    Tempatkan kontainer di slot valid pertama
```

### Autentikasi & Keamanan

File: `server/utils/auth.js`

| Mekanisme | Detail |
|-----------|--------|
| **Password Hashing** | bcryptjs, salt round 10 |
| **JWT Token** | Expire 30 hari, payload: `{ userId, username }` |
| **Identity Resolution** | `resolveIdentity()` — JWT selalu menang atas client-claimed ID |
| **Namespace Protection** | ID dengan prefix `user_` hanya valid jika dikonfirmasi JWT |
| **Rate Limiting** | 20 request per 15 menit untuk register/login |
| **Token Rejection Detection** | `tokenWasRejected()` — membedakan "belum login" vs "token expired" |
| **Username Enumeration Prevention** | Pesan error login generik: tidak membedakan user tidak ada vs password salah |

### Database Schema

File: `server/utils/initDb.js` — PostgreSQL

#### Tabel `users`

```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(30) UNIQUE NOT NULL,
  password_hash   VARCHAR(100) NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabel `rooms` (Multiplayer)

```sql
CREATE TABLE rooms (
  room_code         VARCHAR(10) PRIMARY KEY,
  week              INT NOT NULL DEFAULT 1,
  current_port      VARCHAR(10) NOT NULL DEFAULT 'SBY',
  global_cargo_pool JSONB NOT NULL DEFAULT '[]',
  is_game_over      BOOLEAN NOT NULL DEFAULT FALSE,
  players           JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabel `sessions` (Offline)

```sql
CREATE TABLE sessions (
  session_id        VARCHAR(100) PRIMARY KEY,
  week              INT NOT NULL DEFAULT 1,
  current_port      VARCHAR(10) NOT NULL DEFAULT 'SBY',
  active_ports      JSONB NOT NULL DEFAULT '["SBY","MKS","JYP","MDN"]',
  vessel_level      INT NOT NULL DEFAULT 1,
  shared_grid       JSONB NOT NULL,
  global_cargo_pool JSONB NOT NULL DEFAULT '[]',
  players           JSONB NOT NULL DEFAULT '[]',
  is_game_over      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabel `leaderboard_entries`

```sql
CREATE TABLE leaderboard_entries (
  id                    SERIAL PRIMARY KEY,
  player_name           VARCHAR(100) NOT NULL,
  cash                  BIGINT NOT NULL,
  accumulated_penalties BIGINT NOT NULL DEFAULT 0,
  player_rating         VARCHAR(100),
  mode                  VARCHAR(10) NOT NULL,     -- 'OFFLINE' atau 'ONLINE'
  completed_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Migrasi Programatik

Server secara otomatis menjalankan migrasi untuk mendukung skema lama:
- Menambahkan kolom baru (`active_ports`, `vessel_level`, `shared_grid`, `global_cargo_pool`, `players`) jika belum ada
- Menghapus constraint `NOT NULL` dari kolom legacy (`cash`, `accumulated_penalties`, `grid`, `orders`, `performance_log`)
- Menggunakan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` dan pengecekan `information_schema` (idempotent, aman dijalankan berulang)

---

## 💻 Client (Frontend)

### Komponen Utama

#### `App.jsx` — Controller Utama

- **State Management:** Menggunakan `useState` dan `useRef` secara ekstensif (tanpa Redux/Zustand)
- **Mode Rendering:**
  - Landing Page (mode selection)
  - Auth Forms (Login/Register)
  - Leaderboard View
  - Offline Game Workspace
  - Online Room Workspace
- **Session Persistence:** `localStorage` keys: `spil_client_id`, `spil_auth`, `spil_room_code`
- **Komunikasi:** `fetch()` untuk REST API offline, Socket.IO untuk multiplayer real-time

#### `BayplanSimulator.jsx` — Core Game UI (~57KB)

Komponen utama yang menangani visualisasi dan interaksi permainan:

| Fitur | Deskripsi |
|-------|-----------|
| **Grid Rendering** | Merender layout kapal dinamis berdasarkan `getBayConfig()` — bay, row, tier |
| **Drag & Drop** | Kontainer pending bisa di-drag ke slot grid (HTML5 Drag API) |
| **Click Placement** | Alternatif mobile: klik kontainer → klik slot tujuan |
| **Cargo Sidebar** | Pool kargo, buffer pending, milestones rute, info kapten |
| **Restow Indicator** | Real-time visual: kontainer blocker ditandai animasi `border-pulse` |
| **Port Color Coding** | Warna destination unik per pelabuhan (Okabe-Ito color-blind safe) |
| **Container Type Patterns** | Stripe pattern berbeda untuk DRY vs REEFER |
| **Next/Later Port Badge** | Indikator visual rute target (Next Port atas, Later Port bawah) |

#### `Dashboard.jsx` — Header Bar

- Branding korporat PT. SPIL
- Indikator pelabuhan aktif & timeline pelayaran
- Minggu ke-N / Siklus
- Saldo kas & akumulasi penalti
- Leaderboard pemain aktif (multiplayer)

#### `PerformanceModal.jsx` — Evaluasi Mingguan

Ditampilkan setelah setiap keberangkatan:
- Discharge Revenue (pendapatan dari kontainer yang sampai tujuan)
- Terminal Crane Movements (Discharge, Load, Restow)
- Rolling Penalty breakdown (per order yang gagal)
- Restow Penalty breakdown (per blocker)
- Net Revenue minggu ini
- Saldo kas terkini

#### `GameOverModal.jsx` — Akhir Permainan

- Triggered saat Minggu 8 selesai atau saldo < 0 (bangkrut)
- Menampilkan: saldo akhir, rating kapten, riwayat performa 8 minggu
- Breakdown total penalti kumulatif

#### `TariffModal.jsx` — Tabel Tarif

- Tabel interaktif tarif resmi semua rute
- Filter berdasarkan asal/tujuan
- Menampilkan tarif DRY dan REEFER

#### `GlossaryModal.jsx` — Kamus Industri

- 5 seksi glosarium sesuai dokumen SPIL resmi
- Istilah: Bay Plan, Row, Tier, Restowage, Rolling, Sales Call, dll.
- Sumber: *GLOSSARIUM — SPIL GAME 4 JALUR.pdf*

### Design System

#### Token Warna

| Kategori | Token | Hex | Fungsi |
|----------|-------|-----|--------|
| **Brand** | `spil-red` | `#D21E20` | Aksen utama, penalti, warning |
| **Brand** | `spil-green` | `#2E7D4E` | Background utama, positif |
| **Port (Okabe-Ito)** | `port-sby` | `#0072B2` | Surabaya — biru tua |
| **Port** | `port-mks` | `#E69F00` | Makassar — kuning emas |
| **Port** | `port-jyp` | `#009E73` | Jayapura — hijau teal |
| **Port** | `port-mdn` | `#CC79A7` | Medan — pink mauve |
| **Port** | `port-bjm` | `#56B4E9` | Banjarmasin — biru muda |
| **Port** | `port-jkt` | `#D55E00` | Jakarta — oranye gelap |
| **Port** | `port-bli` | `#F0E442` | Bali — kuning cerah |
| **Status** | `status-danger` | `#B42318` | Error, penalti aktif |
| **Status** | `status-success` | `#067647` | Revenue, berhasil |
| **Ground** | `ground` | `#EEF2F3` | Background workspace |

> **Catatan Aksesibilitas:** Palet port menggunakan **Okabe-Ito** — dirancang agar tetap dapat dibedakan oleh penyandang *colour-vision deficiency* (buta warna).

#### Tipografi

| Font | Penggunaan |
|------|-----------|
| **Outfit** (400–900) | Heading, label, angka |
| **Inter** (400–800) | Body text, deskripsi |

#### Animasi & Efek

| Animasi | Penggunaan |
|---------|-----------|
| `shake` | Error feedback (0.5s ease-in-out) |
| `border-pulse` | Kontainer blocker restow (2s infinite) |
| `slide-up` | Modal/panel entrance (0.4s ease-out) |
| `bounce-horizontal` | Indikator arah/navigasi (1s infinite) |
| `spin-slow` | Loading indicator (8s linear) |

#### Aksesibilitas

- **`prefers-reduced-motion: reduce`** — Semua animasi direduksi ke 0.01ms (WCAG 2.3.3)
- **Mobile legibility floor** — Teks minimum 10.5px pada viewport ≤ 640px
- **Responsive Layout** — Grid bayplan menggunakan `overflow-x-auto` dengan `min-w-[720px]` untuk horizontal scroll di mobile

### Interaksi Pengguna

#### Drag & Drop (Desktop)

```
1. Drag kontainer dari sidebar "Buffer Kargo"
2. onDragStart → set containerId ke dataTransfer
3. Hover slot grid → visual feedback (highlight valid/invalid)
4. Drop ke slot → emit place_container ke server
5. Server validasi fisika → broadcast state baru
```

#### Click Placement (Mobile)

```
1. Klik kontainer di sidebar → selectedPendingId aktif
2. Klik slot grid kosong → emit place_container ke server
3. Klik slot grid terisi → emit remove_container → kontainer kembali ke buffer
```

---

## 🔗 Shared Module

File: `shared/gameConstants.js`

Modul ini adalah **Single Source of Truth** yang diimpor oleh:
- `server/utils/gameEngine.js` (re-export)
- `client/src/utils/gameHelpers.js` (re-export)
- Research harness (direct import)

**Berisi:**

| Eksport | Deskripsi |
|---------|-----------|
| `PORTS` | Array sirkuit pelabuhan: `['SBY', 'MKS', 'JYP', 'MDN']` |
| `PORT_CODES_INFO` | Metadata pelabuhan (kode, nomor, nama lengkap) |
| `TARIFF_TABLE` | Tabel tarif 12 rute × 2 tipe kontainer |
| `GLOSSARY_SECTIONS` | 5 seksi glosarium industri untuk modal edukasi |
| `BAYS` | Bay level 2: `['18', '14', '10', '06', '02']` |
| `ALL_BAYS` | Semua bay level 3: `['26', '22', '18', '14', '10', '06', '02']` |
| `OFFLINE_BAYS_BY_LEVEL` | Mapping level vessel → bay yang tersedia |
| `REEFER_BAYS` | Bay dengan plug pendingin: `['14', '10']` |
| `getBayConfig(bay)` | Konfigurasi rows, tiers, containerType per bay |
| `createEmptyGrid(bays)` | Membuat grid kapal kosong (nested object) |
| `validateGridPhysics(grid)` | Validasi aturan fisika (tipe slot & stacking) |

**Keuntungan Single Source of Truth:**
- Menghilangkan *drift* antara client dan server (bug Bay 22 REEFER yang pernah terjadi)
- Dependency-free — tidak menggunakan API Node atau DOM, berjalan di browser, server, dan harness
- Perubahan layout kapal cukup di satu file

---

## 🚀 Cara Instalasi & Menjalankan

### Prasyarat

- **Node.js** v18 atau lebih baru
- **PostgreSQL** v15 atau lebih baru (running & accessible)
- **npm** (bundled dengan Node.js)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone <repository-url>
cd SPIL-GAME

# 2. Install semua dependencies (root + server + client)
npm run install-all

# 3. Konfigurasi environment server
cp server/.env.example server/.env
# Edit server/.env sesuai kebutuhan (lihat bagian Konfigurasi Environment)

# 4. Pastikan PostgreSQL berjalan dan database tersedia
# Database akan otomatis membuat tabel saat server pertama kali dijalankan
```

### Menjalankan Development

```bash
# Jalankan server DAN client secara bersamaan (recommended)
npm run dev

# ATAU jalankan terpisah:
npm run server    # Backend di http://localhost:5050
npm run client    # Frontend di http://localhost:5190
```

### Menjalankan Terpisah

```bash
# Server saja (dengan hot-reload via nodemon)
cd server
npm run dev

# Client saja (dengan HMR via Vite)
cd client
npm run dev
```

### Build Produksi (Client)

```bash
cd client
npm run build     # Output ke client/dist/
npm run preview   # Preview build produksi
```

### Utility Scripts

```bash
# Lihat isi database (debug)
node server/showDb.js

# Jalankan unit test internal game engine
node server/verifyEngine.js

# Jalankan eksperimen riset (jika folder research tersedia)
npm run pilot
```

---

## ⚙ Konfigurasi Environment

File: `server/.env` (salin dari `server/.env.example`)

```env
# Port server backend
PORT=5050

# URL koneksi PostgreSQL
# Format: postgresql://[user]:[password]@[host]:[port]/[database_name]
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spil_game

# SSL untuk koneksi database (true untuk hosting cloud: Heroku, Render, dll.)
DATABASE_SSL=false

# Secret JWT — WAJIB diganti ke nilai random panjang di produksi!
JWT_SECRET=change-this-to-a-long-random-secret-in-production
```

| Variable | Wajib | Default | Deskripsi |
|----------|-------|---------|-----------|
| `PORT` | Tidak | `5050` | Port HTTP server |
| `DATABASE_URL` | **Ya** | — | Connection string PostgreSQL |
| `DATABASE_SSL` | Tidak | `false` | Aktifkan SSL untuk cloud hosting |
| `JWT_SECRET` | **Ya** | (insecure fallback + warning) | Secret key untuk signing JWT |

> ⚠️ **Peringatan Keamanan:** Jangan pernah gunakan `JWT_SECRET` default di production. Generate nilai random minimal 32 karakter.

---

## 🚀 Roadmap & Rencana Pengerjaan Teknis (Technical Plan)

> **Target Milestone Utama Proyek:**
> - **Fitur Lengkap (Feature Complete v1.0.0):** Selesai pada **Minggu ke-3 Oktober 2026** (~21 Oktober 2026).
> - **Fokus DRL (Sept 30 – 7 Okt):** 100% Finalisasi pemodelan, evaluasi empiris, dan pembungkusan inference service.
> - **Fase Trial & Revisi (22 Okt dst):** Uji coba pengguna riil (*playtesting*), evaluasi usabilitas SUS, bugfix, dan rilis stabil.

```
                    TIMELINE ROADMAP PENGEMBANGAN SPIL-GAME
┌─────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
│  MINGGU 1 (30 Sep - 7 Okt)│  MINGGU 2 (8 - 14 Okt)  │  MINGGU 3 (15 - 21 Okt) │   MINGGU 4+ (22 Okt+)   │
├─────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ DRL 100% FINAL & FREEZE │ ENGINE & INTEGRASI GAME │ POLISH UI, SFX & PACK   │ TRIAL USER & REVISI     │
│ • Selesaikan DQN S2     │ • DRL Inference Service │ • Audio/SFX Engine      │ • Sesi Playtest 3 Mode  │
│ • Paired Selection DQN  │ • Bot DRL di Game Engine│ • Animasi Crane/Stowage │ • Kuesioner SUS         │
│ • Evaluasi TEST & SENS  │ • Standardisasi Rute    │ • Visual Feedback Overst│ • Logging Telemetri     │
│ • Solver Batas Atas MILP│ • Turn Timer & Reconnect│ • One-Click Launcher    │ • Balancing & Bugfix    │
│ • DRL Microservice API  │ • Parity & Load Testing │ • Freeze Fitur v1.0.0   │ • Rilis Final v1.0.0    │
└─────────────────────────┴─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### 1. Status Komponen Saat Ini (Baseline 30 September 2026)

| Komponen | Status | Progres | Keterangan Teknis |
|----------|:------:|:-------:|-------------------|
| **DRL Environment & Reward Gate** | Selesai | 100% | Gymnasium env (`env.py`, `portcall.py`), action masking 37-bit, reward parity $\Delta \text{Rp } 0$ pada 2.160 episode. |
| **Pelatihan DRL Stage 2** | Berjalan | 89% | PPO dan A2C tuntas 3 seed. DQN menyisakan 2 arm (`cmp_dqn_s2_t32_constant_seed2` & `cmp_dqn_s2_t32_plateau`). |
| **Evaluasi Algoritma & Tabel Statistik** | Setengah Jadi | 70% | PPO & A2C selesai diuji di TEST 300 & SENS 150 seed. DQN masih model lama. Tabel `results/tables/` perlu regenerasi. |
| **DRL Game Inference Bridge** | Belum Ada | 0% | Model DRL masih berupa `.zip` PyTorch/SB3; belum ada service inference untuk game. |
| **Game Backend & Bot Engine** | Sebagian | 80% | Engine fisika kapal, aturan restow/rolling, dan bot heuristik aktif. Belum ada Bot DRL dan turn timer. |
| **Sinkronisasi Rute Tambahan (BJM, JKT, BLI)** | Setengah Jadi | 50% | Rute terbuka saat capaian kas terpenuhi, tetapi tarif masih menggunakan fallback acak. |
| **Game Frontend & UI/UX** | Sebagian | 75% | Simulator ISO 9711 dan dashboard lengkap. Belum ada audio (SFX), animasi crane, dan delay giliran bot. |
| **Automasi & One-Click Runner** | Belum Ada | 0% | Belum ada script orkestrasi satu-klik untuk menjalankan Postgres, API DRL, Backend, dan Frontend. |
| **Instrumen Trial Pengguna** | Belum Ada | 0% | Belum ada formulir evaluasi kegunaan sistem (SUS) dan skema pencatatan log telemetri pengguna. |

---

### 2. Rincian Teknis Mingguan (Sprint Breakdown)

#### 📅 MINGGU 1 (30 September – 7 Oktober 2026): FOKUS PEMODELAN DRL 100% RAMPUNG
* **Fokus Utama**: Menuntaskan pelatihan komparator DQN, menyeleksi model juara, mengeksekusi evaluasi empiris lengkap (TEST, SENS, MILP Upper Bound), dan membangun microservice inferensi DRL.
* **Tugas Harian & Implementasi Teknis**:
  - **Hari 1–2 (30 Sep – 1 Okt) — Penuntasan Komputasi DQN Stage 2**:
    - Eksekusi pelatihan lanjutan via `research/rl/train_resumable.py` untuk `cmp_dqn_s2_t32_constant` (seed 2) dan `cmp_dqn_s2_t32_plateau` (seed 0, 1, 2) dengan anggaran 1,5 juta langkah dan toleransi plateau 6 evaluasi.
    - Verifikasi integritas checkpoint `run.json` dan `best_model.zip`.
  - **Hari 3 (2 Okt) — Seleksi Berpasangan (Paired Selection)**:
    - Jalankan `python -m research.rl.select_arm --root research/results/rl_stage2 --seeds 20` untuk menghasilkan `selection_dqn.csv` dan `selection_dqn.png`.
    - Kunci **Trio Model Juara**:
      - `A5 (PPO)`: `s2_ppo_t26_cosine` (net-arch `[128, 128]`, $\text{lr}_0 = 3 \times 10^{-4}$).
      - `P1 (A2C)`: `cmp_a2c_s2_t31_constant` (net-arch `[64, 64]`, $\text{lr}_0 = 2 \times 10^{-3}$).
      - `P2 (DQN)`: Pemenang seleksi Stage 2.
  - **Hari 4 (3 Okt) — Evaluasi Akhir TEST, SENS, dan Batas Atas MILP**:
    - Evaluasi DQN pemenang pada 300 seed TEST nominal dan 150 seed $\times$ 24 strata SENS via `research/rl/evaluate.py`.
    - Jalankan `research/dump-scenarios.mjs` dan `research/analysis/upper_bound.py` untuk menghitung batas atas kas relaksasi integer programming (MILP) per seed.
  - **Hari 5–6 (4 – 5 Okt) — Regenerasi Tabel Statistik & Analisis Perilaku**:
    - Jalankan `python research/analysis/stats.py` untuk memperbarui seluruh tabel: `deskriptif_pendapatan_bersih.csv`, `uji_friedman.csv`, `perbandingan_berpasangan.csv` (Kendall's $W$, uji Nemenyi CD, Holm $p$-values, effect size Vargha-Delaney $A$), `konsistensi_strata.csv`, dan `komputasi.csv`.
    - Jalankan `python research/analysis/behavior.py` dan `plot_utilization.py` untuk memetakan utilisasi colokan REEFER, rasio penolakan kargo, dan pola pencegahan overstow.
  - **Hari 7 (6 – 7 Okt) — Pembuatan DRL Game Inference Service**:
    - Bangun berkas `research/rl/serve_policy.py` menggunakan FastAPI pada port `5055`.
    - Endpoint POST `/predict`: Menerima JSON state kargo & grid kapal, mengubah ke vektor 87-dimensi + action mask 37-bit, dan mengembalikan aksi terpilih (waktu inferensi < 25 ms).
    - **Definition of Done (DoD) Minggu 1**: Semua model DRL selesai dievaluasi, seluruh artefak data terkunci, dan service `/predict` siap diakses via HTTP.

---

#### 📅 MINGGU 2 (8 – 14 Oktober 2026): INTEGRASI GAME ENGINE & BACKEND
* **Fokus Utama**: Menghubungkan model DRL ke dalam permainan SPIL-GAME sebagai lawan tanding aktif, menstandardisasi rute & tarif pelayaran, dan menjamin ketahanan multiplayer.
* **Tugas Harian & Implementasi Teknis**:
  - **Hari 8–9 (8 – 9 Okt) — Integrasi Bot DRL ke Game Server**:
    - Tambahkan profil bot baru di `server/utils/botEngine.js`: `Bot DRL - Kapten AI SPIL (Deep RL PPO)`.
    - Buat modul jembatan `server/utils/drlClient.js` yang mengirimkan request ke `http://localhost:5055/predict` dengan timeout 300 ms.
    - Implementasikan **Circuit Breaker**: Jika service DRL mati atau lambat, otomatis *fallback* ke algoritma heuristik `SMART` tanpa menghentikan permainan.
    - Modifikasi fungsi giliran bot di `server/server.js` agar mendukung eksekusi DRL secara mulus.
  - **Hari 10–11 (10 – 11 Okt) — Standardisasi Rute Tambahan (BJM, JKT, BLI) & Tarif**:
    - Lengkapi matriks tarif di `shared/gameConstants.js` untuk pelabuhan Banjarmasin (BJM), Jakarta (JKT), dan Bali (BLI) untuk tipe kargo DRY dan REEFER berdasarkan proporsi jarak dan tabel tarif resmi SPIL.
    - Perbarui metadata `PORT_CODES_INFO` untuk rute 7 pelabuhan.
    - Hapus logika acak *dummy fallback* di `server/utils/gameEngine.js:121` agar simulasi 100% deterministik.
  - **Hari 12–14 (12 – 14 Okt) — Turn Timer & Ketahanan Multiplayer**:
    - Pasang turn countdown timer di server (60 detik per fase) dengan broadcast WebSocket `turn_timer_tick` ke ruang bermain.
    - Tangani *auto-submit* saat batas waktu habis untuk mencegah room menggantung jika ada pemain AFK.
    - Uji coba ketahanan pemulihan sesi (*reconnect* browser) menggunakan client UUID di `localStorage`.
    - Jalankan validasi konsistensi fisika kapal: `node server/verifyEngine.js` (24/24 lulus).
    - **Definition of Done (DoD) Minggu 2**: Bot DRL dapat dimainkan langsung di game, tarif 7 pelabuhan baku, dan sesi multiplayer stabil.

---

#### 📅 MINGGU 3 (15 – 21 Oktober 2026): POLISH UI, AUDIO, & PACKAGING (FEATURE COMPLETE)
* **Fokus Utama**: Mengintegrasikan efek suara (SFX), animasi visual pergerakan crane dan denda overstow, mempercantik antarmuka, serta membuat runner instalasi satu-perintah.
* **Tugas Harian & Implementasi Teknis**:
  - **Hari 15–17 (15 – 17 Okt) — Integrasi Audio & Sound Effects (SFX)**:
    - Siapkan aset audio ringan format MP3 di `client/public/sounds/`:
      - `container_drop.mp3`: Suara benturan logam saat kontainer ditempatkan ke slot.
      - `restow_alarm.mp3`: Suara peringatan jika penempatan menyebabkan overstow/blocker.
      - `ship_horn.mp3`: Peluit kapal saat tombol "Berangkat Berlayar" ditekan.
      - `coins.mp3`: Efek kas saat menerima pembayaran kargo di pelabuhan tujuan.
    - Buat utility `client/src/utils/soundEffects.js` dengan dukungan pengaturan volume dan tombol Mute di header `Dashboard.jsx`.
  - **Hari 18–19 (18 – 19 Okt) — Visual Polish, Highlight Blocker, & Animasi Transisi**:
    - Di `client/src/components/BayplanSimulator.jsx`, tambahkan *pulsing red highlight* dan badge denda `"Restow! -Rp 6 Jt"` pada kontainer yang memblokir kargo pelabuhan saat ini.
    - Tambahkan jeda visual (*simulated thinking*) 1 detik saat bot berpikir di mode offline agar pemain dapat mengamati pergerakan AI.
    - Tambahkan tab statistik komparasi di `GameOverModal.jsx`: Menampilkan grafik radar performa pemain vs Kapten DRL.
  - **Hari 20–21 (20 – 21 Okt) — One-Click Launcher & Script Packaging**:
    - Buat script orkestrasi `start-spil-game.bat` dan `start-spil-game.ps1` di root proyek yang otomatis menjalankan PostgreSQL healthcheck, DRL Inference Service (Port 5055), Backend Server (Port 5050), Client Vite (Port 5190), dan membuka browser secara otomatis.
    - Tulis berkas panduan ringkas: `PANDUAN-MENJALANKAN-GAME.md`.
    - **Definition of Done (DoD) Minggu 3**: **SPIL-GAME v1.0.0 FEATURE COMPLETE & LOCKED**.

---

#### 📅 MINGGU 4+ (22 Oktober 2026 dst): FASE TRIAL PENGGUNA & REVISI
* **Fokus Utama**: Menguji game kepada pemain nyata, mengumpulkan umpan balik usabilitas, menyelesaikan perbaikan bug (*bugfixing*), dan merilis versi final stabil.
* **Tugas & Implementasi Teknis**:
  - **22 – 28 Oktober 2026 — Sesi Playtesting & Pengambilan Data**:
    - Uji coba pada 3 skenario:
      1. *Skenario A (Single Player vs Bot Heuristik)*: Menguji kejelasan aturan ISO 9711 dan navigasi antarmuka.
      2. *Skenario B (Tantangan Kapten DRL)*: Menguji daya saing agen AI dan kepuasan pemain.
      3. *Skenario C (Multiplayer 4 Pemain)*: Menguji kehandalan sinkronisasi Socket.IO dan persaingan perebutan pesanan kargo.
    - Pengisian Kuesioner SUS (*System Usability Scale*) dengan target skor rata-rata $\ge 70$ (*Good/Acceptable*).
    - Pencatatan telemetri sesi ke tabel PostgreSQL `trial_analytics` (waktu bermain, total restow, total rolling, laba bersih akhir).
  - **29 Oktober – 5 November 2026 — Pengerjaan Revisi & Rilis Stabil**:
    - Perbaikan bug dan *edge case* berdasarkan hasil trial.
    - Penyesuaian keseimbangan ekonomi (*game balancing*) jika denda dirasa terlalu memberatkan pemula.
    - Penguncian tag rilis final: `git tag -a v1.0.0 -m "Release v1.0.0: SPIL-GAME Full Edition with DRL Captain"`.

---

## 📋 Riwayat Update Terkini

Berdasarkan riwayat commit terakhir (terbaru ke terlama):

### September 2026

| Tanggal | Perubahan |
|---------|-----------|
| **30 Sep** | **Roadmap Teknis End-to-End:** Rencana pengerjaan komprehensif 4 sprint (finalisasi DRL Stage 2 & freeze, integrasi Kapten AI DRL ke backend, audio SFX & visual polish, serta protokol trial user SUS) |
| **22 Sep** | Test build & stabilisasi |
| **15 Sep** | **Fondasi Redesain UI:** Orientasi bay/row sesuai ISO 9711-1, token warna port berbasis Okabe-Ito (aksesibilitas buta warna), semantic status colors, reduced motion support (WCAG 2.3.3) |
| **14 Sep** | **Pemisahan kuota slot DRY vs REEFER**, label orientasi kapal ISO 9711, badge target rute Next/Later Port, audit pergerakan crane terminal, cleanup `.gitignore` (untrack research/Info/.claude) |
| **9 Sep** | Research: runner training resumable dan pipeline finalisasi |
| **7–8 Sep** | Update script training model RL (reinforcement learning) |
| **5 Sep** | Research: implementasi Python harness parity & modul RL (environment, training, evaluation) |

### Agustus 2026

| Tanggal | Perubahan |
|---------|-----------|
| **28 Agt** | Research: harness eksperimen skripsi — protokol validasi V1-V6, agen A3/A4, dataset skenario |
| **22 Agt** | **Major Update:** Server otoritatif penuh (semua kalkulasi di server), sistem akun & leaderboard, optimasi mobile |

### Juli 2026

| Tanggal | Perubahan |
|---------|-----------|
| **23 Jul** | Update umum bulan Juli |

### Juni 2026

| Tanggal | Perubahan |
|---------|-----------|
| **17 Jun** | Perombakan mekanisme game: antrian kargo satu-persatu, mekanisme buffer, fitur sidebar |
| **17 Jun** | Commit pertama codebase terstruktur |
| **12 Jun** | Update fungsi perhitungan, implementasi rancangan gameplay, arsitektur awal multiplayer |
| **10 Jun** | **Inisialisasi proyek SPIL Game** |

### Highlight Perubahan Terpenting

1. **Server-Authoritative Architecture** (22 Agt) — Memindahkan SEMUA logika ekonomi dari client ke server, menghilangkan kemungkinan manipulasi saldo/penalti dari sisi browser
2. **Single Source of Truth** (14 Sep) — Menyatukan `gameConstants.js` di folder `shared/`, menghapus duplikasi yang menyebabkan bug REEFER_BAYS drift
3. **Deterministic RNG** (5 Sep) — Mulberry32 + FNV-1a seed hashing untuk reproduksi skenario eksperimen riset
4. **ISO 9711 Compliance** (14–15 Sep) — Orientasi bayplan sesuai standar internasional, row numbering ganjil/genap sesuai sisi kapal
5. **Okabe-Ito Color Palette** (15 Sep) — Palet warna aksesibel untuk penyandang buta warna
6. **Reduced Motion Support** (15 Sep) — Mendukung pengaturan OS `prefers-reduced-motion` sesuai WCAG 2.3.3

---

## 📖 Glosarium Istilah Industri

| Istilah | Definisi |
|---------|---------|
| **Bay Plan** | Gambaran perencanaan muatan kapal petikemas berdasarkan jenis, tujuan, dan volume |
| **Bay** | Posisi membujur dari haluan (bow) ke buritan (stern) |
| **Row** | Posisi melintang dari sumbu tengah kapal (ganjil = starboard, genap = port) |
| **Tier** | Tingkat ketinggian tumpukan (02 = underdeck, 82/84 = on-deck) |
| **Stowage** | Proses penataan dan penempatan kontainer di kapal |
| **Restowage / Shifting** | Penyusunan ulang kontainer: menurunkan kontainer penghalang, mengambil kontainer tujuan, menaikkan kembali |
| **Rolling** | Kegagalan memuat kontainer yang seharusnya dimuat (penalti finansial) |
| **Discharge** | Proses pembongkaran kontainer dari kapal di pelabuhan tujuan |
| **Load** | Proses pemuatan kontainer ke atas kapal di pelabuhan asal |
| **Next Port** | Pelabuhan tujuan berikutnya — kontainer idealnya di on-deck atas |
| **Later Port** | Pelabuhan tujuan kedua/ketiga — kontainer idealnya di underdeck |
| **Committed Customer** | Customer kontrak — wajib dimuat, penalti berat jika gagal |
| **Non-Committed Customer** | Customer biasa — tanpa penalti jika ditolak |
| **DRY Container** | Kontainer kargo kering standar |
| **REEFER Container** | Kontainer berpendingin untuk kargo yang memerlukan suhu terkontrol |
| **Hatch Cover** | Penutup palka yang memisahkan underdeck (02) dari on-deck (82) |
| **Crane Movement** | Satu pergerakan crane untuk mengangkat/menurunkan satu kontainer |
| **Net Revenue** | Pendapatan bersih = Gross Revenue − Restow Penalty − Rolling Penalty |

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan akademik (skripsi) dan magang di PT. SPIL.

---

*Dokumentasi ini diperbarui pada 23 September 2026. Untuk pertanyaan teknis, hubungi pengembang.*
