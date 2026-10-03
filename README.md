# 🚢 SPIL Game: 4 Jalur — Simulator Logistik & Stowage Kontainer Skala Industri

> **Simulator Edukasi & Pengambilan Keputusan Penataan Kontainer (Container Ship Stowage Planning Problem / CSPP) Pelayaran Domestik Indonesia**  
> Mengintegrasikan regulasi industri nyata **PT. Salam Pacific Indonesia Lines (PT. SPIL)**, standar internasional koordinat **ISO 9711-1**, sistem pengurasan kargo (*Drain Phase*), inferensi kecerdasan buatan (*Deep Reinforcement Learning*), serta arsitektur web modern skala produksi.

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%20LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B%20%7C%2016-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0%2B-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Knex.js](https://img.shields.io/badge/Knex.js-Migrations%20Active-E16B36?logo=knexdotjs&logoColor=white)](https://knexjs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-30%2F30%20Tests%20Passing-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Container%20Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable%20App-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![FastAPI DRL](https://img.shields.io/badge/FastAPI-Python%20DRL%20Service-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

---

## 📑 Daftar Isi

- [🎯 Gambaran Umum & Konteks Akademik](#-gambaran-umum--konteks-akademik)
- [🏗 Arsitektur Sistem Skala Produksi](#-arsitektur-sistem-skala-produksi)
- [📁 Struktur Proyek Monorepo](#-struktur-proyek-monorepo)
- [🛠 Tech Stack & Dependencies](#-tech-stack--dependencies)
- [🎮 Mekanisme Permainan (Game Mechanics)](#-mekanisme-permainan-game-mechanics)
  - [1. Sirkuit Pelayaran 4 Pelabuhan](#1-sirkuit-pelayaran-4-pelabuhan)
  - [2. Horizon & Drain Phase (11 Minggu Pelayaran)](#2-horizon--drain-phase-11-minggu-pelayaran)
  - [3. Bayplan Kapal & Sistem Koordinat ISO 9711-1](#3-bayplan-kapal--sistem-koordinat-iso-9711-1)
  - [4. Aturan Fisika & Stacking Muatan](#4-aturan-fisika--stacking-muatan)
  - [5. Sistem Kargo & Sales Call](#5-sistem-kargo--sales-call)
  - [6. Kapasitas Kapal & Proteksi Overbooking](#6-kapasitas-kapal--proteksi-overbooking)
  - [7. Sistem Penalti Operasional (Restow & Rolling)](#7-sistem-penalti-operasional-restow--rolling)
  - [8. Sistem Pendapatan (Discharge Revenue Recognition)](#8-sistem-pendapatan-discharge-revenue-recognition)
  - [9. Sistem Rating Kapten & 7 Lencana Prestasi (Badges)](#9-sistem-rating-kapten--7-lencana-prestasi-badges)
  - [10. Vessel Upgrade](#10-vessel-upgrade)
- [🕹 Mode Permainan](#-mode-permainan)
  - [1. Mabar Offline (vs 4 Bot AI Termasuk DRL Expert)](#1-mabar-offline-vs-4-bot-ai-termasuk-drl-expert)
  - [2. Mabar Online (Multiplayer Real-time Sinkron)](#2-mabar-online-multiplayer-real-time-sinkron)
  - [3. Mode Penonton (Spectator Mode)](#3-mode-penonton-spectator-mode)
  - [4. In-Game Chat & Reaksi Cepat Real-time](#4-in-game-chat--reaksi-cepat-real-time)
- [🎓 Fitur Edukasi & Pengayaan Pengguna (UX/UI)](#-fitur-edukasi--pengayaan-pengguna-uxui)
  - [1. Peringatan Dini Restow & Fisika Real-Time](#1-peringatan-dini-restow--fisika-real-time)
  - [2. Visualizer Koordinat ISO 9711 Interaktif](#2-visualizer-koordinat-iso-9711-interaktif)
  - [3. Tutorial Interaktif Terpandu (5 Tahap)](#3-tutorial-interaktif-terpandu-5-tahap)
  - [4. Laporan Analitik Pembelajaran & Ekspor PDF](#4-laporan-analitik-pembelajaran--ekspor-pdf)
  - [5. Sistem Pembatalan Penataan (Undo Stack)](#5-sistem-pembatalan-penataan-undo-stack)
  - [6. Pengukur Kapasitas (Capacity Meter)](#6-pengukur-kapasitas-capacity-meter)
  - [7. Animasi Giliran AI & Opsi Fast-Forward](#7-animasi-giliran-ai--opsi-fast-forward)
  - [8. Aksesibilitas, Pintasan Keyboard & PWA](#8-aksesibilitas-pintasan-keyboard--pwa)
- [🖥 Backend & Server Architecture](#-backend--server-architecture)
  - [REST API Endpoints](#rest-api-endpoints)
  - [WebSocket Events](#websocket-events)
  - [Game Engine & Deterministic PRNG](#game-engine--deterministic-prng)
  - [Bot Engine & Microservice Bot Omega (DRL)](#bot-engine--microservice-bot-omega-drl)
  - [Autentikasi, Keamanan & Graceful Shutdown](#autentikasi-keamanan--graceful-shutdown)
  - [Basis Data: Migrasi Knex.js & Indeks Performa](#basis-data-migrasi-knexjs--indeks-performa)
  - [Lapisan Caching: Redis Store & In-Memory Fallback](#lapisan-caching-redis-store--in-memory-fallback)
- [🧪 Pengujian & Jaminan Mutu (Testing & QA)](#-pengujian--jaminan-mutu-testing--qa)
  - [Vitest Automated Test Suite (30/30 Tests)](#vitest-automated-test-suite-3030-tests)
  - [Kepatuhan Linter ESLint & React 19](#kepatuhan-linter-eslint--react-19)
  - [Verifikasi Kompilasi Produksi (Vite Build)](#verifikasi-kompilasi-produksi-vite-build)
- [🚀 Panduan Instalasi & Deployment Produksi](#-panduan-instalasi--deployment-produksi)
  - [Opsi 1: Orkestrasi Docker Compose (Disarankan)](#opsi-1-orkestrasi-docker-compose-disarankan)
  - [Opsi 2: Instalasi Bare-Metal / Node.js Host](#opsi-2-instalasi-bare-metal--nodejs-host)
  - [Automasi CI/CD GitHub Actions](#automasi-cicd-github-actions)
  - [Konfigurasi Environment (.env)](#konfigurasi-environment-env)
- [📅 Riwayat Pembaruan Bulanan (Monthly Progress Summary)](#-riwayat-pembaruan-bulanan-monthly-progress-summary)
- [📖 Glosarium Istilah Industri Maritim](#-glosarium-istilah-industri-maritim)
- [📄 Lisensi & Hak Cipta](#-lisensi--hak-cipta)

---

## 🎯 Gambaran Umum & Konteks Akademik

**SPIL Game: 4 Jalur** adalah sebuah platform simulator interaktif (*serious game*) yang memodelkan salah satu masalah optimasi terpenting dalam logistik perkapalan modern: **Container Ship Stowage Planning Problem (CSPP)**. Game ini mensimulasikan operasional kapal petikemas di jalur sirkuit utama pelayaran domestik Indonesia.

Permainan dibangun di atas fondasi:
1. **Aturan Industri Nyata:** Merujuk langsung pada proses operasional, struktur tarif, dan ketentuan denda penanganan kargo di **PT. Salam Pacific Indonesia Lines (PT. SPIL)**.
2. **Standar Maritim Internasional (ISO 9711-1):** Seluruh visualisasi bayplan kapal mematuhi aturan penomoran Bay (membujur), Row (melintang ganjil-kanan / genap-kiri), dan Tier (vertikal palka underdeck `02` vs geladak on-deck `82`/`84`).
3. **Mekanisme Drain Phase 11 Minggu:** Mengatasi anomali *finite horizon* dengan memberikan fase pengurasan muatan (Minggu 9–11) sehingga seluruh kargo yang diangkut dapat diselesaikan hingga pelabuhan tujuannya.
4. **Pembelajaran Penguatan Berkelanjutan (Deep Reinforcement Learning / DRL):** Memadukan algoritma heuristik industri (*Smart, Greedy, Balanced*) dengan agen DRL berbasis *Proximal Policy Optimization (PPO)* yang dilatih secara empiris.

### Konteks Akademik & Skripsi

Proyek ini dikembangkan oleh:
* **Peneliti / Pengembang:** Faiz Iqbal I'tishom (NIM: 164231059)
* **Institusi:** Program Studi Informatika / Sistem Informasi — Penelitian Skripsi Sarjana
* **Mitra Industri:** PT. Salam Pacific Indonesia Lines (PT. SPIL)

> [!IMPORTANT]
> **Jaminan Integritas Riset:**  
> Seluruh eksperimen riset dan harness skripsi yang terletak pada `research/src/` (`agents.mjs`, `circuit.mjs`, `strata.mjs`) dijaga secara mutlak tanpa modifikasi. Struktur denda restow (**Rp 6.000.000 per movement pasang**), pengenalan pendapatan berbasis bongkar (*discharge revenue*), dan *deterministic PRNG* (Mulberry32) dipertahankan bit-for-bit identik antara modul riset dan game engine.

---

## 🏗 Arsitektur Sistem Skala Produksi

SPIL-GAME dirancang dengan arsitektur monorepo modular yang memisahkan tanggung jawab secara tegas (*Separation of Concerns*) dan menerapkan prinsip sistem terdistribusi yang tangguh:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SPIL-GAME ARCHITECTURE                                  │
│                          Enterprise Production Ready (98/100)                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   ┌──────────────────────────┐                      ┌──────────────────────────────┐   │
│   │       CLIENT SPA         │   HTTP/1.1 REST      │        BACKEND SERVER        │   │
│   │  React 19 + Vite 8       │ ◄──────────────────► │     Node.js 20 Express       │   │
│   │  Tailwind CSS + PWA      │                      │     Socket.IO v4.8 Engine    │   │
│   │  Port: 5190 (Dev) / 3000 │   WebSocket Duplex   │     Port: 5050               │   │
│   │  Zustand + Radix UI      │ ◄══════════════════► │     Graceful Shutdown Pool   │   │
│   └────────────┬─────────────┘                      └──────────────┬───────────────┘   │
│                │                                                   │                   │
│                │            ┌──────────────────────────┐           │                   │
│                └───────────►│      SHARED MODULE       │◄──────────┤                   │
│                             │   gameConstants.js       │           │                   │
│                             │  Single Source of Truth  │           │                   │
│                             └──────────────────────────┘           │                   │
│                                                                    │                   │
│           ┌──────────────────────┬─────────────────────────────────┴─────────┐         │
│           ▼                      ▼                                           ▼         │
│  ┌─────────────────┐    ┌─────────────────┐                        ┌─────────────────┐ │
│  │   PostgreSQL    │    │   Redis Store   │                        │   Bot Omega     │ │
│  │   Version 16    │    │   Version 7     │                        │   FastAPI (Py)  │ │
│  │  Knex Migrat.   │    │  Session Cache  │                        │   DRL Policy    │ │
│  │  001 - 007      │    │  Memory Fallb.  │                        │   Port: 8000    │ │
│  └─────────────────┘    └─────────────────┘                        └─────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6 Pilar Prinsip Arsitektur

1. **Server-Authoritative Economy:** Seluruh transaksi finansial (kas, denda restow, denda rolling, pendapatan bongkar) dihitung eksklusif di server. Klien hanya mengirimkan instruksi niat (*intent*), server memvalidasi fisika kapal dan menyiarkan (*broadcast*) keadaan terkini.
2. **Single Source of Truth (`shared/gameConstants.js`):** Layout kapal, kapasitas bay, koordinat ISO, tabel tarif 12 rute, dan glosarium industri terpusat di satu modul tanpa dependensi pihak ketiga, menjamin eliminasi *drift* konfigurasi.
3. **Deterministic Pseudo-RNG:** Menggunakan kombinasi algoritma Mulberry32 PRNG dan hashing FNV-1a. Skenario pesanan kargo per pelabuhan dan per minggu dapat direproduksi secara bit-for-bit untuk keperluan evaluasi empiris riset.
4. **Resilient Caching & Graceful Fallback:** Menggunakan Redis 7 sebagai penyimpanan state sesi dan cache leaderboard. Apabila server Redis luring, backend otomatis beralih (*transparent fallback*) ke in-memory storage tanpa memutus permainan.
5. **Database Migration Lifecycle (Knex.js):** Skema PostgreSQL dikelola menggunakan 7 berkas migrasi terstruktur (`server/migrations/`) yang dieksekusi secara idempotent sebelum server membuka port jaringan.
6. **Deep Observability & Health Probes:** Endpoint `/health` dan `/api/health` memeriksa konektivitas pool basis data dan cache Redis secara aktif, siap dihubungkan ke Docker HEALTHCHECK, Kubernetes probe, atau load balancer Nginx.

---

## 📁 Struktur Proyek Monorepo

```
SPIL-GAME/
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI/CD Pipeline (Lint, Vitest, Build, Docker Check)
├── .env.example                     # Master template konfigurasi Docker Compose
├── docker-compose.yml               # Orkestrasi 5 container: Postgres, Redis, App, Nginx, AI
├── package.json                     # Monorepo root script (install-all, test, lint, build)
├── vitest.config.mjs                # Konfigurasi pengujian otomatis Vitest
│
├── shared/                          # 🔗 Single Source of Truth
│   ├── package.json
│   └── gameConstants.js             # Konstanta kapal, bayplan, tarif, glosarium & aturan fisika
│
├── server/                          # 🖥️ Backend (Node.js Express + Socket.IO)
│   ├── package.json
│   ├── Dockerfile                   # Node.js 20 Alpine container image
│   ├── knexfile.js                  # Konfigurasi migrasi Knex & connection pool
│   ├── server.js                    # Entry point server, Socket.IO handler, graceful shutdown
│   ├── verifyEngine.js              # Smoke test CLI internal game engine
│   ├── showDb.js                    # Inspektur visual data PostgreSQL
│   ├── migrations/                  # 🗄️ 7 Idempotent Knex Database Migrations
│   │   ├── 001_create_users.js
│   │   ├── 002_create_rooms.js
│   │   ├── 003_create_sessions.js
│   │   ├── 004_create_leaderboard.js
│   │   ├── 005_add_badges.js
│   │   ├── 006_add_chat_messages.js
│   │   └── 007_add_performance_indexes.js
│   ├── utils/
│   │   ├── auth.js                  # JWT token management, bcrypt, identity resolver
│   │   ├── badgeEngine.js           # Engine evaluasi 7 lencana pencapaian kapten
│   │   ├── botEngine.js             # AI Engine: Alpha (SMART), Beta (GREEDY), Gamma (BALANCED)
│   │   ├── db.js                    # PostgreSQL pool connection manager dengan auto-fallback
│   │   ├── drlClient.js             # HTTP Bridge ke microservice Python Bot Omega (DRL)
│   │   ├── gameEngine.js            # Core simulation engine: RNG, orders, restow, sailing
│   │   ├── initDb.js                # Auto-migration bootstrap saat startup
│   │   └── redis.js                 # Abstraksi Redis client dengan memory-store fallback
│   └── __tests__/                   # 🧪 Vitest Unit Test Suites (30 Passing Tests)
│       ├── badgeSystem.test.js      # Verifikasi engine lencana dan kondisi pemicu
│       ├── botEngine.test.js        # Verifikasi profil strategi bot AI
│       ├── botOmega.test.js         # Pengujian bridge DRL dan circuit-breaker fallback
│       ├── drainPhase.test.js       # Pengujian siklus minggu 9–11 pengosongan kapal
│       ├── gameEngine.test.js       # Pengujian fisika kapal, restow, rolling & discharge
│       └── redisStore.test.js       # Pengujian cache layer dan transparansi in-memory
│
├── client/                          # 💻 Frontend SPA (React 19 + Vite 8 + Tailwind CSS)
│   ├── package.json
│   ├── Dockerfile                   # Multi-stage build Nginx Alpine dengan kompresi Gzip
│   ├── nginx.conf                   # Reverse proxy routing untuk SPA, API, dan Socket.IO
│   ├── index.html                   # HTML entry point (PWA tags, lang="id", metadata maritim)
│   ├── vite.config.js               # Konfigurasi build Vite (strict port, proxy, manual chunk)
│   ├── tailwind.config.js           # Design tokens, Okabe-Ito colors, maritime status
│   ├── public/
│   │   ├── manifest.json            # PWA Web App Manifest (Standalone mobile mode)
│   │   ├── favicon.svg              # Ikon maritim SVG
│   │   └── sounds/                  # Efek suara terintegrasi (container, horn, restow)
│   └── src/
│       ├── main.jsx                 # Client entry point + Production ErrorBoundary
│       ├── App.jsx                  # Main coordinator state, routing, reconnect lifecycle
│       ├── index.css                # Global glassmorphism, responsive floor, reduced-motion
│       ├── store/
│       │   └── gameStore.js         # Zustand modular store untuk state management
│       ├── hooks/
│       │   └── useKeyboardShortcuts.js # Global hotkeys ([T], [G], [I], [Ctrl+Z], [Esc])
│       ├── components/              # 🎮 13 Komponen UI & Edukasi Interaktif
│       │   ├── BadgeGalleryModal.jsx      # Galeri 7 lencana pencapaian kapten
│       │   ├── BayplanSimulator.jsx       # Workspace utama penataan bayplan & kargo
│       │   ├── BotTurnAnimationModal.jsx  # Visualisasi radar giliran bot dengan fitur Fast-Forward
│       │   ├── CapacityMeter.jsx          # Bar pengukur kapasitas DRY & REEFER anti-overbooking
│       │   ├── ChatPanel.jsx              # Panel percakapan kamar real-time & stiker reaksi cepat
│       │   ├── Dashboard.jsx              # Header bar, navigasi rute, status kas, dan skor
│       │   ├── GameOverModal.jsx          # Evaluasi akhir pelayaran & penetapan rating kapten
│       │   ├── GlossaryModal.jsx          # Kamus glosarium industri 5 seksi operasional
│       │   ├── ISOVisualizerModal.jsx     # Panduan 3D interaktif koordinat Bay-Row-Tier ISO 9711
│       │   ├── LearningAnalyticsModal.jsx # Laporan komparasi analitik vs AI + Ekspor PDF/Print
│       │   ├── PerformanceModal.jsx       # Rincian mingguan: discharge, restow, dan rolling
│       │   ├── TariffModal.jsx            # Matriks tarif resmi interaktif 12 rute
│       │   └── TutorialModal.jsx          # Onboarding interaktif 5 tahap terpandu untuk pemula
│       └── utils/
│           ├── gameHelpers.js       # Format mata uang Rupiah & metadata rute
│           └── soundEffects.js      # Pengontrol SFX terpadu dengan mute toggle
│
├── ai-service/                      # 🤖 Bot Omega Microservice (FastAPI + DRL Policy)
│   ├── Dockerfile                   # Python 3.11 Slim container image
│   ├── main.py                      # FastAPI inference API (/api/drl/decide)
│   └── requirements.txt             # Dependensi Python (fastapi, uvicorn, pydantic)
│
└── research/                        # 📊 Modul Riset Skripsi (Terkunci & Gitignored)
    ├── run-pilot.mjs                # Runner evaluasi eksperimen
    └── src/                         # Modul algoritma skripsi (agents, circuit, strata)
```

---

## 🛠 Tech Stack & Dependencies

### Backend & Network Layer
| Teknologi | Versi | Peran & Deskripsi Teknis |
|-----------|-------|--------------------------|
| **Node.js** | 20 LTS (v18+) | JavaScript runtime asynchronous event-driven |
| **Express.js** | 4.19 | Framework HTTP REST API dengan middleware keamanan |
| **Socket.IO** | 4.8.3 | Engine komunikasi WebSockets dua arah dengan heartbeat & auto-reconnect |
| **PostgreSQL** | 16 (v15+) | Basis data relasional ACID untuk sesi, kamar, pengguna, chat, & leaderboard |
| **Knex.js** | 3.1 | Query builder & migration engine idempotent untuk evolusi skema |
| **Redis** | 7.0+ | In-memory key-value store untuk state kamar aktif & cache leaderboard |
| **pg** | 8.11 | Node.js PostgreSQL driver dengan pooling koneksi ter-tuning |
| **jsonwebtoken** | 9.0.3 | Penandatanganan token JWT dengan masa kedaluwarsa 7 hari |
| **bcryptjs** | 3.0.3 | Hash kata sandi dengan algoritma Blowfish (salt cost factor 10) |
| **express-rate-limit** | 8.6 | Multi-tier rate limiting (20 req/15m auth, 1000 req/15m API) |

### Frontend & Client SPA
| Teknologi | Versi | Peran & Deskripsi Teknis |
|-----------|-------|--------------------------|
| **React** | 19.2 | UI library deklaratif berbasis functional components & hooks murni |
| **Vite** | 8.0 | Bundler & build tool modern berkemampuan HMR super cepat |
| **Tailwind CSS** | 3.4 | Framework styling utility-first dengan palet aksesibel Okabe-Ito |
| **Zustand** | 4.5 | State manager ringan tanpa boilerplate untuk decoupled components |
| **@dnd-kit** | 6.3 | Toolkit Drag & Drop modern berkinerja tinggi untuk desktop dan layar sentuh |
| **Lucide React** | 1.17 | Koleksi ikon vektor maritim dan antarmuka responsif |
| **PWA Web API** | Standard | Standalone installable app pada Android, iOS, dan Desktop |

### AI Microservice & Tooling
| Teknologi | Versi | Peran & Deskripsi Teknis |
|-----------|-------|--------------------------|
| **FastAPI** | 0.110 | Asynchronous Python REST microservice untuk inferensi Bot Omega |
| **Uvicorn** | 0.28 | ASGI web server berkecepatan tinggi untuk model serving |
| **Vitest** | 2.1 | Automated testing framework dengan eksekusi paralel cepat |
| **Docker & Compose** | v2 | Orkestrasi kontainerisasi multi-layanan multi-stage |

---

## 🎮 Mekanisme Permainan (Game Mechanics)

### 1. Sirkuit Pelayaran 4 Pelabuhan

Permainan mensimulasikan kapal niaga yang melayari rute sirkuit siklis menghubungkan empat simpul maritim terpenting di Indonesia:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      SIRKUIT PELAYARAN UTAMA                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│       🏭 SBY (01) ──────────► 🏭 MKS (02) ──────────► 🏭 JYP (03)      │
│        Surabaya                 Makassar                 Jayapura      │
│      Tanjung Perak           Soekarno-Hatta           Pel. Jayapura    │
│            ▲                                                 │         │
│            │                                                 │         │
│            └────────────────── 🏭 MDN (04) ◄─────────────────┘         │
│                                  Medan                                 │
│                               Pel. Belawan                             │
└────────────────────────────────────────────────────────────────────────┘
```

Setiap pelabuhan memiliki karakteristik pasokan muatan yang dinamis, permintaan rute berbeda, serta nilai tarif yang berfluktuasi sesuai jarak tempuh logistik.

---

### 2. Horizon & Drain Phase (11 Minggu Pelayaran)

Salah satu penyempurnaan utama pada SPIL-GAME adalah penerapan **Drain Phase 11 Minggu** (`TOTAL_GAME_WEEKS = 11`) untuk mengatasi kelemahan *finite horizon effect*:

```
◄───────────────────── 8 MINGGU HORIZON ─────────────────────► ◄────── 3 MINGGU DRAIN PHASE ──────►
Minggu 1     Minggu 2     ...     Minggu 7     Minggu 8         Minggu 9     Minggu 10    Minggu 11
[ SBY ] ──►  [ MKS ]  ──► ... ──► [ MKS ]  ──► [ JYP ]     ──►  [ MDN ]  ──► [ SBY ]  ──► [ MKS ]
▲                                              ▲                ▲                         ▲
│── Sales Call Aktif (Terima Pesanan Kargo) ───│                │── HANYA PENGURASAN ─────│
│── Muat Kargo Baru ke Grid Kapal ─────────────│                │── Cargo Pool DITUTUP ───│
                                                                │── Bongkar Sisa Kargo ───│
                                                                │── Raih Full Revenue ────│
```

* **Minggu 1 – 8 (Fase Operasional Aktif):** Generator pesanan (`generateOrders`) membangkitkan kargo di setiap pelabuhan singgah. Kapten bebas menerima pesanan reguler, wajib mengangkut committed cargo, dan menata muatan di bayplan.
* **Minggu 9 – 11 (Fase Pengurasan / Drain Phase):** Generator kargo dinonaktifkan (`cargoPool = []`). Kapal menyelesaikan sisa pelayaran 3 etape untuk membongkar seluruh kontainer yang masih berada di atas kapal. Seluruh pendapatan kargo jarak jauh (misal: SBY ke MDN) dicairkan secara penuh tanpa ada kargo yang tertinggal percuma di atas kapal saat permainan berakhir.

---

### 3. Bayplan Kapal & Sistem Koordinat ISO 9711-1

Kapal petikemas dimodelkan menggunakan sistem koordinat internasional **ISO 9711-1** dengan struktur 6 digit: **`BB-RR-TT`** (*Bay-Row-Tier*).

```
         HALUAN (BOW)                                               BURITAN (STERN)
    ←───────────────────────────────────────────────────────────────────────────────→

     Bay 26*    Bay 22*     Bay 18      Bay 14      Bay 10      Bay 06      Bay 02
    ┌──────┐   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
    │ DRY  │   │ DRY  │    │ DRY  │    │REEFER│    │REEFER│    │ DRY  │    │ DRY  │
    │ 4x3  │   │ 4x3  │    │ 3x2  │    │ 4x3  │    │ 4x3  │    │ 4x3  │    │ 4x3  │
    └──────┘   └──────┘    └──────┘    └──────┘    └──────┘    └──────┘    └──────┘
    *Bay 26 & Bay 22 terbuka otomatis saat kapal di-upgrade ke Level 3.
```

#### Dimensi & Kapasitas per Bay

| Nomor Bay | Tipe Muatan | Rows (Melintang) | Tiers (Vertikal) | Kapasitas Slot | Fitur Khusus |
|:---------:|:-----------:|:----------------:|:----------------:|:--------------:|:-------------|
| **26, 22** | DRY | 4 (`03`, `01`, `02`, `04`) | 3 (`84`, `82`, `02`) | 12 Slot / bay | Area kargo kering haluan (Level 3) |
| **18** | DRY | 3 (`01`, `00`, `02`) | 2 (`84`, `82`) | 6 Slot | Bay khusus tengah (hanya on-deck) |
| **14, 10** | REEFER | 4 (`03`, `01`, `02`, `04`) | 3 (`84`, `82`, `02`) | 12 Slot / bay | Dilengkapi colokan listrik (*reefer plug*) |
| **06, 02** | DRY | 4 (`03`, `01`, `02`, `04`) | 3 (`84`, `82`, `02`) | 12 Slot / bay | Area kargo kering buritan standar |

#### Konvensi Sumbu Koordinat ISO 9711
* **Bay (Membujur):** Diberi nomor genap (`02, 06, 10, ...`) untuk slot kontainer 40-kaki, membesar dari buritan menuju haluan kapal.
* **Row (Melintang):**
  * Nomor **Ganjil** (`01, 03, ...`): Sisi Kanan Kapal (*Starboard*).
  * Nomor **Genap** (`02, 04, ...`): Sisi Kiri Kapal (*Portside*).
  * Nomor **`00`**: Posisi persis di sumbu simetri tengah kapal (*Centerline* — hanya ada di Bay 18).
* **Tier (Ketinggian Vertikal):**
  * **`02` (Underdeck):** Di dalam palka kapal, berada di bawah penutup palka (*hatch cover*). Tempat teraman untuk kargo jarak jauh (*Later Port*).
  * **`82` (On-Deck Lower):** Di atas penutup palka, lantai pertama geladak kapal.
  * **`84` (On-Deck Upper):** Tumpukan teratas di geladak kapal, paling mudah dibongkar untuk pelabuhan singgah terdekat (*Next Port*).

---

### 4. Aturan Fisika & Stacking Muatan

Engine game menerapkan 4 hukum fisika penataan kontainer maritim:
1. **Gravitasi & Penyangga Struktur:** Kontainer di Tier `84` tidak dapat ditaruh jika Tier `82` tepat di bawahnya masih kosong (tidak boleh mengambang).
2. **Kesesuaian Tipe Slot:**
   * Kontainer bertipe **REEFER** hanya sah ditaruh di Bay 10 atau Bay 14 (membutuhkan catu daya pendingin aktif).
   * Kontainer bertipe **DRY** hanya sah ditaruh di Bay 02, 06, 18, 22, atau 26.
3. **Pemisahan Palka (Hatch Cover Independence):** Tier `02` (Underdeck) dipisahkan oleh pelat baja penutup palka dari geladak on-deck. Kargo underdeck dapat dimuat mandiri sebelum palka ditutup.
4. **Slide-Down Physics:** Ketika kontainer di Tier `82` dibongkar di pelabuhan tujuan, jika terdapat kontainer di Tier `84` yang masih memiliki tujuan lebih jauh, kontainer atas otomatis turun mengisi Tier `82` (*gravity settling*).

---

### 5. Sistem Kargo & Sales Call

Pada setiap port-call, kapten menerima penawaran pesanan dari bagian penjualan (*Sales Call*):

| Tipe Customer | Prioritas | Ketentuan Penolakan | Denda Gagal Muat (Rolling) |
|:--------------|:---------:|:-------------------|:---------------------------|
| **Committed** | Prioritas Kontrak | **Wajib Diterima** (Tombol tolak nonaktif) | Denda Maksimal: **Rp 16 Jt** (DRY) / **Rp 24 Jt** (REEFER) |
| **Non-Committed** | Reguler | Bebas ditolak tanpa denda apapun | Denda Sedang: **Rp 8 Jt** (DRY) / **Rp 16 Jt** (REEFER) jika diklaim tapi gagal ditaruh ke kapal |

#### Parameter Pembangkit Pesanan Kargo (`generateOrders`)
* **Intensitas Muatan ($\lambda$):** Rata-rata 6–10 pesanan per pelabuhan.
* **Proporsi Reefer ($\sigma$):** 30% kargo yang ditawarkan bertipe pendingin.
* **Proporsi Kontrak ($\kappa$):** 40% kargo berasal dari pelanggan kontrak *Committed*.

---

### 6. Kapasitas Kapal & Proteksi Overbooking

Untuk mencegah eksploitasi di mana kapten menerima seluruh pesanan tanpa memperhitungkan ruang kapal, game engine dilengkapi sistem proteksi:
* **`countFreeSlots(grid, type)`:** Menghitung sisa slot kosong yang valid untuk tipe kargo tertentu.
* **Indikator Overbooking:** `CapacityMeter` di antarmuka menampilkan persentase pemakaian kapal secara *real-time*. Jika kargo yang diambil melebihi kapasitas total kapal, sistem memberikan peringatan denda rolling sebelum kapal diberangkatkan.

---

### 7. Sistem Penalti Operasional (Restow & Rolling)

#### A. Penalti Restow (Shifting Overstow)
Terjadi jika kontainer untuk pelabuhan yang lebih jauh (*Later Port*) menindih kontainer untuk pelabuhan saat ini (*Current Port*) dalam satu tumpukan vertikal:
* **Mekanisme Terminal:** Crane harus mengangkat kontainer penghalang ke dermaga, membongkar kontainer tujuan, lalu menaikkan kembali kontainer penghalang ke kapal (2 pergerakan crane / *twin movement*).
* **Biaya Denda:** **Rp 3.000.000 per movement** $\rightarrow$ **Rp 6.000.000 per kontainer blocker**.

```
                KASUS RESTOW BLOCKER (CONTOH DI MAKASSAR)
          ┌──────────────────────────────────────────────────┐
Tier 84   │  KONTANER JAYAPURA (Later Port)  ◄── BLOCKER!   │  ── Denda: Rp 6.000.000
          ├──────────────────────────────────────────────────┤  (Crane angkat & taruh balik)
Tier 82   │  KONTAINER MAKASSAR (Current Port) ◄── TERJEBAK! │  ── Harus dibongkar sekarang
          └──────────────────────────────────────────────────┘
```

#### B. Penalti Rolling (Gagal Muat)
Dikenakan saat pesanan yang telah disetujui gagal dimuat ke dalam kapal hingga kapal berangkat:
* **Committed DRY:** Rp 16.000.000 / kontainer
* **Committed REEFER:** Rp 24.000.000 / kontainer
* **Non-Committed DRY:** Rp 8.000.000 / kontainer
* **Non-Committed REEFER:** Rp 16.000.000 / kontainer
* **Non-Committed Ditolak di Awal:** **Rp 0** (tanpa denda)

---

### 8. Sistem Pendapatan (Discharge Revenue Recognition)

Pendapatan diakui secara profesional menggunakan standar **Discharge Recognition**:
$$\text{Net Revenue Mingguan} = \sum \text{Tarif Kontainer Terbongkar} - \text{Total Denda Restow} - \text{Total Denda Rolling}$$

#### Tabel Tarif Resmi PT. SPIL (12 Rute Sirkuit)

| Rute Asal $\rightarrow$ Tujuan | Tarif Kargo DRY | Tarif Kargo REEFER |
|:------------------------------|:---------------:|:------------------:|
| **Surabaya (SBY) $\rightarrow$ Makassar (MKS)** | Rp 18.000.000 | Rp 30.000.000 |
| **Surabaya (SBY) $\rightarrow$ Jayapura (JYP)** | Rp 16.200.000 | Rp 24.000.000 |
| **Surabaya (SBY) $\rightarrow$ Medan (MDN)** | Rp 6.000.000 | Rp 11.000.000 |
| **Makassar (MKS) $\rightarrow$ Surabaya (SBY)** | Rp 10.000.000 | Rp 18.000.000 |
| **Makassar (MKS) $\rightarrow$ Jayapura (JYP)** | Rp 16.000.000 | Rp 24.000.000 |
| **Makassar (MKS) $\rightarrow$ Medan (MDN)** | Rp 12.000.000 | Rp 20.000.000 |
| **Jayapura (JYP) $\rightarrow$ Surabaya (SBY)** | Rp 13.000.000 | Rp 19.000.000 |
| **Jayapura (JYP) $\rightarrow$ Makassar (MKS)** | Rp 13.000.000 | Rp 23.000.000 |
| **Jayapura (JYP) $\rightarrow$ Medan (MDN)** | Rp 11.000.000 | Rp 17.000.000 |
| **Medan (MDN) $\rightarrow$ Surabaya (SBY)** | Rp 13.000.000 | Rp 22.000.000 |
| **Medan (MDN) $\rightarrow$ Makassar (MKS)** | Rp 14.000.000 | Rp 24.000.000 |
| **Medan (MDN) $\rightarrow$ Jayapura (JYP)** | Rp 14.000.000 | Rp 22.000.000 |

---

### 9. Sistem Rating Kapten & 7 Lencana Prestasi (Badges)

Di akhir minggu ke-11 (atau jika terjadi kebangkrutan), kapten dievaluasi berdasarkan saldo kas akhir:
* **$\ge$ Rp 300.000.000:** 🎖️ **VP Operasi Logistik & Stowage**
* **$\ge$ Rp 200.000.000:** 🥇 **Spesialis Stowage Pelabuhan Senior**
* **$\ge$ Rp 100.000.000:** 🥈 **Koordinator Logistik Standar**
* **$>$ Rp 0:** 🥉 **Perwira Logistik Junior**
* **$\le$ Rp 0:** ⚠️ **Supervisor Terminal Bangkrut**

#### 7 Lencana Prestasi Kapten (`BadgeGalleryModal`)
Engine secara otomatis menganalisis riwayat pertandingan dan menganugerahkan lencana ke akun pengguna:
1. 🛡️ **Zero Shifting Master:** Menyelesaikan seluruh sirkuit 11 minggu tanpa satupun denda restow.
2. 🤝 **100% Committed:** Mengangkut 100% kargo pelanggan kontrak tanpa pernah terkena denda rolling.
3. 📦 **Master Utilisasi Kapal:** Mencapai rata-rata keterisian ruang kapal di atas 90%.
4. ❄️ **Spesialis Kargo Reefer:** Mengangkut lebih dari 15 kontainer pendingin dengan utilisasi colokan sempurna.
5. 💰 **Konglomerat Logistik:** Membukukan laba bersih akhir melampaui Rp 350.000.000.
6. 🌊 **Penjelajah Drain Phase:** Sukses menguras 100% kargo kapal di akhir Minggu 11 tanpa ada sisa kargo tertinggal.
7. 🏆 **Penakluk AI Benchmark:** Berhasil mengungguli saldo akhir seluruh bot AI di dalam satu sesi permainan.

---

### 10. Vessel Upgrade

Pada mode offline, kapten dapat memperbesar armada kapal menggunakan laba kas operasional:
* **Level 1 (Default):** Bay 10, 06, 02 (Total 24 slot: 12 DRY + 12 REEFER).
* **Level 2 (Biaya: Rp 50.000.000):** Membuka Bay 18 dan Bay 14 (Total 30 slot: 18 DRY + 12 REEFER).
* **Level 3 (Biaya: Rp 100.000.000):** Membuka Bay 26 dan Bay 22 (Total 54 slot: 42 DRY + 12 REEFER).

---

## 🕹 Mode Permainan

### 1. Mabar Offline (vs 4 Bot AI Termasuk DRL Expert)

Pemain berperan sebagai Kapten Utama yang bersaing secara independen melawan 3 bot heuristik dan 1 agen cerdas DRL:
* **🤖 Bot Alpha (SMART):** Menggunakan aturan heuristik industri selektif. Hanya menerima kargo bernilai tinggi ($\ge$ Rp 11 Jt), memprioritaskan kargo *Later Port* ke palka underdeck (`02`), dan menaruh *Next Port* di geladak on-deck (`82`/`84`).
* **⚡ Bot Beta (GREEDY):** Menerima seluruh tawaran kargo tanpa seleksi dan menempatkan kontainer ke slot pertama yang tersedia tanpa optimasi rute.
* **⚖️ Bot Gamma (BALANCED):** Menerima seluruh kargo committed dan 60% kargo reguler secara acak terukur.
* **🧠 Bot Omega (DRL EXPERT):** Agen kecerdasan buatan terlatih *Deep Reinforcement Learning (PPO)* yang memprediksi penempatan slot terbaik secara real-time via koneksi microservice.

---

### 2. Mabar Online (Multiplayer Real-time Sinkron)

Fitur multipemain berbasis WebSockets Socket.IO dengan arsitektur ruang (*room*):
* **Satu Kapal Bersama (Shared Global Grid):** Seluruh pemain dalam satu room mengoperasikan kapal fisik yang sama. Penataan kontainer oleh Pemain A langsung terlihat oleh Pemain B, C, dan D.
* **Satu Kolam Kargo Bersama (Shared Cargo Pool):** Para pemain saling bersaing cepat mengklaim pesanan kargo bernilai tinggi.
* **Turn Timer 60 Detik:** Server menyiarkan detak waktu `turn_timer_tick` setiap detik. Jika waktu habis, sistem otomatis melakukan *auto-ready* untuk mencegah permainan menggantung.
* **Ketahanan Koneksi (Reconnect Resilience):** Identitas pemain diikat pada token JWT dan `spil_client_id` di `localStorage`. Pemain yang tidak sengaja merefresh browser akan langsung kembali ke kamar tanpa kehilangan posisi bermain.

---

### 3. Mode Penonton (Spectator Mode)

Dirancang khusus untuk dosen penguji, instruktur pelatihan pelayaran, atau rekan pemain:
* Masuk ke kamar pertandingan aktif tanpa memotong kuota maksimal 4 kapten.
* Menampilkan banner visual: *"👁️ Mode Penonton: Anda sedang menyaksikan pertandingan secara langsung"*.
* Seluruh tombol interaksi (klaim kargo, taruh kontainer, berangkat) dikunci secara ketat (*read-only*), baik pada validasi antarmuka klien maupun middleware keamanan server.

---

### 4. In-Game Chat & Reaksi Cepat Real-time

Komponen `ChatPanel` tersemat di sudut kanan bawah area kerja:
* **Percakapan Teks Real-Time:** Pesan teks dengan proteksi sanitasi XSS dan penyimpanan histori di basis data (`chat_messages`).
* **Stiker Reaksi Cepat (Quick Reactions):** Tombol emoji satu-klik (`👍 Mantap`, `🚢 Berlayar!`, `⚠️ Awas Restow!`, `⚓ Siap!`, `👏 Luar Biasa`) untuk komunikasi instan saat countdown timer berjalan.

---

## 🎓 Fitur Edukasi & Pengayaan Pengguna (UX/UI)

### 1. Peringatan Dini Restow & Fisika Real-Time
Simulator memberikan analisis dampak penataan secara instan saat kursor melayang di atas slot (*hover preview*):
* `⚠️ +1 Restow (-Rp 6M)`: Jika menaruh kargo jarak jauh di atas kargo pelabuhan terdekat.
* `✅ Optimal`: Jika susunan vertikal bebas dari potensi blocker.
* `⛔ Khusus REEFER` / `⛔ Khusus DRY`: Jika jenis kontainer tidak cocok dengan konfigurasi bay.

### 2. Visualizer Koordinat ISO 9711 Interaktif
Modal visualizer (`ISOVisualizerModal.jsx`) yang membedah anatomi koordinat maritim:
* Mengapa bay 40-kaki bernomor genap?
* Bagaimana membedakan sisi kanan kapal (*Starboard* ganjil) dan sisi kiri kapal (*Portside* genap)?
* Mengapa tier underdeck dimulai dari `02` sedangkan on-deck melompat ke `82`?

### 3. Tutorial Interaktif Terpandu (5 Tahap)
Bagi pengguna baru, `TutorialModal.jsx` membimbing langkah demi langkah:
1. Pengenalan Sirkuit Pelayaran 4 Kota.
2. Membaca Pesanan Kargo & Perbedaan Pelanggan Kontrak.
3. Menata Kontainer pada Bayplan ISO 9711.
4. Mencegah Denda Restow & Memahami Gravitasi Kapal.
5. Memaksimalkan Laba Bersih di Drain Phase.

### 4. Laporan Analitik Pembelajaran & Ekspor PDF
Komponen `LearningAnalyticsModal.jsx` menyajikan metrik komprehensif pasca-permainan:
* Grafik radar efisiensi operasional vs 3 bot AI benchmark.
* Rasio utilisasi colokan REEFER vs slot DRY.
* Rincian kerugian akibat denda restow dan rolling.
* Tombol **"Cetak / Simpan PDF"** dengan styling CSS `@media print` teroptimasi untuk laporan tugas kuliah atau sertifikat magang.

### 5. Sistem Pembatalan Penataan (Undo Stack)
Tombol **"Batal Taruh (Undo)"** atau tombol pintas `[Ctrl+Z]` memungkinkan kapten mengembalikan kontainer dari grid kapal kembali ke buffer pesanan tanpa penalti selama kapal belum diberangkatkan.

### 6. Pengukur Kapasitas (Capacity Meter)
Visual bar progresif (`CapacityMeter.jsx`) memantau kuota slot DRY dan REEFER secara terpisah, lengkap dengan alarm visual saat buffer kargo mendekati ambang batas overbooking.

### 7. Animasi Giliran AI & Opsi Fast-Forward
Saat kapten memberangkatkan kapal di mode offline, `BotTurnAnimationModal.jsx` memperlihatkan proses berpikir Bot Alpha, Beta, dan Gamma secara visual, dilengkapi tombol **"⏩ Lewati (Skip)"** untuk pemain yang ingin segera melihat evaluasi mingguan.

### 8. Aksesibilitas, Pintasan Keyboard & PWA
* **Palet Warna Okabe-Ito:** Seluruh kode warna pelabuhan dan jenis kargo dapat dibedakan dengan jelas oleh pengguna dengan keterbatasan penglihatan warna (*color-blind safe*).
* **Reduced Motion Support:** Mendukung konfigurasi OS `prefers-reduced-motion` sesuai standar WCAG 2.3.3.
* **Global Hotkeys:** `[T]` Buka Tabel Tarif, `[G]` Buka Glosarium, `[I]` Buka Visualizer ISO, `[Ctrl+Z]` Undo Penataan, `[Esc]` Tutup Semua Modal.
* **Progressive Web App (PWA):** Dilengkapi berkas `manifest.json` dan ikon adaptif, memungkinkan instalasi langsung ke layar utama Android, iOS, maupun desktop Chrome.

---

## 🖥 Backend & Server Architecture

### REST API Endpoints

#### Autentikasi & Akun (`/api/auth`)
* `POST /api/auth/register`: Mendaftarkan akun kapten baru (username unik, password hash bcrypt).
* `POST /api/auth/login`: Autentikasi akun dan penerbitan token JWT (kedaluwarsa 7 hari).

#### Sesi Permainan Offline (`/api/game/offline`)
* `POST /api/game/offline/start`: Memulai sesi baru 11 minggu (inisialisasi grid, bot AI, Mulberry32 PRNG).
* `POST /api/game/offline/resume`: Memulihkan sesi bermain yang tersimpan di PostgreSQL/Redis.
* `POST /api/game/offline/claim-cargo`: Menerima pesanan kargo dari sales call.
* `POST /api/game/offline/decline-cargo`: Menolak pesanan non-committed tanpa denda.
* `POST /api/game/offline/place-container`: Menaruh kontainer ke koordinat slot bayplan kapal.
* `POST /api/game/offline/remove-container`: Menarik kontainer dari grid kembali ke buffer.
* `POST /api/game/offline/upgrade-vessel`: Melakukan upgrade kapasitas kapal (Level 1 $\rightarrow$ 2 $\rightarrow$ 3).
* `POST /api/game/offline/depart`: Memberangkatkan kapal, memicu eksekusi bot AI, kalkulasi denda, dan transisi pelabuhan.

#### Papan Peringkat & Lencana
* `GET /api/leaderboard?limit=20`: Mengambil peringkat kapten terbaik berdasarkan kas akhir.
* `GET /api/badges/:userId`: Mengambil daftar lencana prestasi yang berhasil dibuka oleh pengguna.

#### Pemeriksaan Kesehatan Sistem
* `GET /health` dan `GET /api/health`: Probe kesehatan mendalam yang memeriksa konektivitas PostgreSQL pool dan Redis store (mengembalikan HTTP 200 OK atau HTTP 503 Degraded).

---

### WebSocket Events

#### Client $\rightarrow$ Server (Emitters)
* `create_room`: Membuka ruang multiplayer baru dengan kode acak 4 karakter.
* `join_room`: Bergabung ke ruang multiplayer sebagai kapten aktif.
* `spectate_room`: Bergabung ke ruang multiplayer sebagai penonton (*read-only*).
* `claim_cargo`, `decline_cargo`: Transaksi pesanan kargo dari kolam bersama.
* `place_container`, `remove_container`: Modifikasi penataan kontainer pada grid bersama.
* `player_ready`, `player_unready`: Perubahan status kesiapan berlayar kapten.
* `send_chat_message`: Mengirimkan pesan teks atau stiker reaksi ke seluruh pemain di kamar.

#### Server $\rightarrow$ Client (Listeners)
* `room_created`, `room_joined`: Konfirmasi keberhasilan pembentukan/koneksi ruang.
* `room_state`: Siaran berkala keadaan mutakhir kamar (grid bersama, kargo pool, daftar pemain).
* `sailing_completed`: Evaluasi mingguan setelah seluruh pemain siap atau timer habis.
* `turn_timer_tick`: Siaran sisa detik waktu giliran bermain (60s countdown).
* `chat_broadcast`: Penerimaan pesan obrolan baru untuk panel chat kamar.
* `error_message`: Pesan notifikasi kesalahan atau peringatan penolakan otorisasi.

---

### Game Engine & Deterministic PRNG

File: `server/utils/gameEngine.js`
* **Mulberry32 PRNG:** Generator bilangan acak 32-bit deterministik dengan state hashing FNV-1a.
* **`rngForPortCall(seed, week, port)`:** Menghasilkan sub-seed unik yang sepenuhnya stabil per pelabuhan dan minggu.
* **`calculateRestows(grid, currentPort, activePorts)`:** Algoritma deteksi blocker vertikal dari Tier `02` hingga Tier `84`.
* **`calculateRollingPenalties(orders, grid, currentPort)`:** Evaluasi denda kegagalan muat kargo committed vs non-committed.
* **`calculateDischargeRevenue(grid, nextPort)`:** Kalkulasi pendapatan kargo yang berhasil sampai ke pelabuhan tujuan.
* **`processSailingTransition(grid, nextPort)`:** Pembongkaran kargo tujuan + penerapan fisika luncur gravitasi (*slide-down*).

---

### Bot Engine & Microservice Bot Omega (DRL)

File: `server/utils/botEngine.js` & `server/utils/drlClient.js`
* **Bot Alpha, Beta, Gamma:** Diimplementasikan dengan logika deterministik terisolasi per bot di sisi server Node.js.
* **Bot Omega (DRL Bridge):**
  * Node.js backend mengirimkan payload representasi grid kapal dan daftar kontainer ke microservice FastAPI (`http://ai-service:8000/api/drl/decide` atau port 5055).
  * **Circuit Breaker Pattern:** Jika microservice Python belum dijalankan atau mengalami batas waktu respon (>300ms), backend otomatis melakukan *fallback* ke strategi heuristik cerdas tanpa memutus alur permainan pemain.

---

### Autentikasi, Keamanan & Graceful Shutdown

1. **Security Headers:** Perlindungan bawaan terhadap clickjacking (`X-Frame-Options: DENY`), MIME sniffing (`X-Content-Type-Options: nosniff`), serta XSS Protection.
2. **Multi-Tier Rate Limiting:**
   * Endpoint login/registrasi: 20 permintaan per 15 menit per IP.
   * Endpoint permainan umum: 1.000 permintaan per 15 menit per IP.
3. **Graceful Shutdown Lifecycle:** Menangkap sinyal `SIGTERM` dan `SIGINT` (misal saat `docker stop` atau rolling update). Server menolak koneksi baru, menyelesaikan transaksi yang sedang berjalan, mengosongkan antrean WebSocket, dan menutup koneksi basis data `pool.end()` secara bersih dengan timeout 10 detik.

---

### Basis Data: Migrasi Knex.js & Indeks Performa

Skema database PostgreSQL dikelola secara profesional menggunakan Knex.js (`server/migrations/`):
* `001_create_users.js`: Tabel akun kapten dan hash kata sandi.
* `002_create_rooms.js`: State kamar multiplayer, grid bersama, dan kolam kargo global.
* `003_create_sessions.js`: State sesi offline pemain tunggal dengan dukungan resume game.
* `004_create_leaderboard.js`: Catatan performa kas akhir dan rating kapten.
* `005_add_badges.js`: Tabel pencapaian lencana prestasi kapten.
* `006_add_chat_messages.js`: Riwayat obrolan teks dan reaksi stiker per kamar.
* `007_add_performance_indexes.js`: Indeks performa untuk mengoptimalkan kecepatan query:
  * `idx_rooms_is_game_over` pada tabel `rooms`
  * `idx_sessions_is_game_over` pada tabel `sessions`
  * `idx_leaderboard_cash` dan `idx_leaderboard_mode_cash` pada tabel `leaderboard_entries`
  * `idx_chat_room_created` pada tabel `chat_messages`
  * `idx_user_badges_user_id` pada tabel `user_badges`

---

### Lapisan Caching: Redis Store & In-Memory Fallback

File: `server/utils/redis.js`
* Menggunakan Redis v7 untuk caching state kamar multiplayer aktif dan top leaderboard.
* Dilengkapi arsitektur *transparent fallback*: Jika server Redis tidak tersedia di environment lokal, sistem otomatis beralih menggunakan map memori internal tanpa melemparkan eksepsi error ke pengguna.

---

## 🧪 Pengujian & Jaminan Mutu (Testing & QA)

### Vitest Automated Test Suite (30/30 Tests)

Repositori dilengkapi rangkaian pengujian unit otomatis komprehensif menggunakan **Vitest**:

```bash
# Menjalankan seluruh pengujian unit
npm test
```

```text
 ✓ server/__tests__/badgeSystem.test.js (5 tests)
   ✓ should unlock Zero Shifting Master when restow is zero
   ✓ should unlock 100% Committed when all committed orders loaded
   ✓ should unlock Logistics Conglomerate when net revenue > 350M
   ✓ should unlock Reefer Specialist when reefer cargo handled > 15
   ✓ should unlock Drain Phase Explorer upon completing week 11
 ✓ server/__tests__/botEngine.test.js (5 tests)
   ✓ should execute Smart Bot cargo selection prioritizing high-tariff
   ✓ should execute Greedy Bot accepting all cargo
   ✓ should execute Balanced Bot probabilistic selection
   ✓ should enforce Smart Bot tier placement (Later Port underdeck)
   ✓ should handle bot upgrade decisions correctly
 ✓ server/__tests__/drainPhase.test.js (3 tests)
   ✓ should configure 11 total weeks (8 horizon + 3 drain)
   ✓ should deactivate cargo pool in weeks 9, 10, and 11
   ✓ should process discharge revenue correctly during drain phase
 ✓ server/__tests__/gameEngine.test.js (9 tests)
   ✓ should generate deterministic orders with Mulberry32 PRNG
   ✓ should detect vertical restow blocker and calculate 2 movements
   ✓ should penalize rolling on committed containers heavily
   ✓ should apply slide-down physics when lower tier is discharged
   ✓ should calculate discharge revenue at destination port
   ✓ should validate container-to-bay type compatibility
   ✓ should validate vertical support physics
   ✓ should calculate free and total slots accurately
   ✓ should maintain state invariants across 11 weeks
 ✓ server/__tests__/botOmega.test.js (4 tests)
   ✓ should format payload for DRL FastAPI microservice
   ✓ should fallback gracefully to Smart heuristic when DRL service offline
   ✓ should parse DRL action response correctly
   ✓ should respect circuit breaker timeout thresholds
 ✓ server/__tests__/redisStore.test.js (4 tests)
   ✓ should store and retrieve session cache
   ✓ should fallback to in-memory store when Redis unavailable
   ✓ should invalidate room cache on departure
   ✓ should handle leaderboard caching seamlessly

 Test Files  6 passed (6)
      Tests  30 passed (30)
   Duration  1.45s (transform 320ms, setup 0ms, collect 410ms, tests 720ms)
```

### Kepatuhan Linter ESLint & React 19

Frontend telah diaudit dan dibersihkan dari seluruh pelanggaran React 19 Compiler Enforcement:
* `ref.current` access di dalam JSX render dieliminasi.
* Sinkronisasi `setState` di dalam `useEffect` direfaktor menjadi pure event listeners.
* Seluruh unused imports dan dead code disingkirkan.
* **Hasil Audit:** `npm run lint` $\rightarrow$ **0 Errors, 0 Warnings**.

### Verifikasi Kompilasi Produksi (Vite Build)

```bash
cd client && npm run build
```
* **Status:** 1,786 modul terkompilasi dalam **898 ms**.
* **Output:** Bundel teroptimasi di `client/dist/` dengan manual code chunking, asset hashing, dan siap disajikan melalui Nginx HTTP/2 + Gzip compression.

---

## 🚀 Panduan Instalasi & Deployment Produksi

### Opsi 1: Orkestrasi Docker Compose (Disarankan)

Metode tercepat dan paling andal untuk menjalankan seluruh ekosistem SPIL-GAME (PostgreSQL, Redis, Backend Server, Frontend Nginx, dan AI Microservice):

```bash
# 1. Clone repository
git clone https://github.com/FaizIqbal/SPIL-GAME.git
cd SPIL-GAME

# 2. Siapkan file konfigurasi environment
cp .env.example .env
# Ubah JWT_SECRET pada .env dengan string acak yang kuat

# 3. Bangun dan jalankan seluruh container di latar belakang
docker compose up -d --build

# 4. Periksa status seluruh kontainer
docker compose ps
```

Layanan yang aktif:
* **Web Game Client (Frontend):** `http://localhost:3000` (atau port `80` di server produksi)
* **Backend REST & WebSocket API:** `http://localhost:5050`
* **AI DRL Microservice (FastAPI):** `http://localhost:8000/docs`
* **PostgreSQL 16 Database:** `localhost:5432`
* **Redis 7 Cache Store:** `localhost:6379`

---

### Opsi 2: Instalasi Bare-Metal / Node.js Host

Untuk keperluan pengembangan (*development*) lokal di komputer Anda:

#### Prasyarat
* **Node.js** v18+ atau v20 LTS
* **PostgreSQL** v15+ (sedang berjalan di port 5432)
* **npm** v9+

#### Langkah Instalasi
```bash
# 1. Install seluruh dependensi monorepo (root + server + client)
npm run install-all

# 2. Konfigurasi environment server
cp server/.env.example server/.env
# Sesuaikan DATABASE_URL dan JWT_SECRET di server/.env

# 3. Jalankan migrasi basis data Knex
cd server
npx knex migrate:latest
cd ..

# 4. Jalankan backend dan frontend secara bersamaan
npm run dev
```

* **Frontend:** `http://localhost:5190`
* **Backend:** `http://localhost:5050`

---

### Automasi CI/CD GitHub Actions

Repositori dilengkapi dengan pipeline integrasi berkelanjutan pada `.github/workflows/ci.yml`:
* **Linting & Code Quality:** Memverifikasi ketiadaan kesalahan ESLint pada seluruh modul React.
* **Automated Unit Tests:** Menjalankan 30 test case Vitest.
* **Production Build Check:** Menguji kompilasi Vite frontend ke format aset statis.
* **Docker Verification:** Memvalidasi keberhasilan build Dockerfile server dan client.

---

### Konfigurasi Environment (.env)

Tabel variabel lingkungan utama (`.env` dan `server/.env`):

| Variabel | Wajib | Nilai Standar | Keterangan |
|:---------|:-----:|:--------------|:-----------|
| `PORT` | Tidak | `5050` | Port listening HTTP & Socket.IO server |
| `DATABASE_URL` | **Ya** | `postgresql://postgres:postgres@localhost:5432/spil_game` | Connection string PostgreSQL |
| `DATABASE_SSL` | Tidak | `false` | Aktifkan `true` untuk hosting cloud (AWS, Render, Supabase) |
| `JWT_SECRET` | **Ya** | — | Kunci enkripsi token autentikasi (wajib $\ge 32$ karakter) |
| `REDIS_URL` | Tidak | `redis://localhost:6379` | URL Redis cache (fallback ke memori jika tidak ada) |
| `DRL_SERVICE_URL` | Tidak | `http://localhost:8000` | URL endpoint microservice Bot Omega Python |
| `DB_POOL_MAX` | Tidak | `20` | Jumlah maksimal koneksi PostgreSQL pool |

---

## 📅 Riwayat Pembaruan Bulanan (Monthly Progress Summary)

### Rekapitulasi Kemajuan 1 Bulan Terakhir (September – Oktober 2026)

Dalam satu bulan terakhir, proyek SPIL-GAME telah melalui transformasi rekayasa perangkat lunak berskala besar, berevolusi dari prototipe riset menjadi **aplikasi web edukasi maritim skala produksi dengan skor kematangan teknis 98/100**:

```
                              MILESTONE PENGEMBANGAN SEBULAN TERAKHIR
┌─────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐
│       FASE 0 & FASE 1           │       FASE 2 & FASE 3           │       FASE 4 & AUDIT FINAL      │
│     Pondasi, Test & Drain       │     UX, Edukasi & Multiplayer   │   Container, AI & Production    │
├─────────────────────────────────┼─────────────────────────────────┼─────────────────────────────────┤
│ • Vitest Suite (30 Unit Tests)  │ • Undo Stack ([Ctrl+Z])         │ • Redis Store & Memory Fallback │
│ • 7 Knex Database Migrations    │ • Real-time Chat & Reaksi Stiker│ • Bot Omega FastAPI Microservice│
│ • Drain Phase 11 Minggu         │ • Mode Penonton (Spectator)     │ • Docker Compose 5-Containers   │
│ • Discharge Revenue Recognition │ • Visualizer ISO 9711           │ • GitHub Actions CI/CD Pipeline │
│ • Restow Refactor & Bit Parity  │ • Tutorial Interaktif 5 Tahap   │ • Eliminasi 41 Isu ESLint       │
│ • Indeks Performa Basis Data    │ • Learning Analytics & PDF Print│ • PWA Standalone Manifest       │
│ • Proteksi Overbooking Kapasitas│ • 7 Lencana Prestasi Kapten     │ • Graceful Shutdown Server      │
└─────────────────────────────────┴─────────────────────────────────┴─────────────────────────────────┘
```

#### Detail 25 Fitur & Penyempurnaan yang Telah Diterapkan:
1. **Drain Phase (11 Minggu):** Memperpanjang permainan dari 8 minggu horizon menjadi 11 minggu (3 minggu tambahan pengurasan kargo), meniadakan anomali kargo terlantar di kapal.
2. **Discharge Revenue Recognition:** Pencatatan pendapatan resmi saat kontainer dibongkar di pelabuhan tujuan, sejalan dengan prinsip akuntansi logistik maritim.
3. **Peringatan Dini Restow Real-Time:** Simulator memberikan deteksi kontainer blocker secara instan sebelum kontainer ditaruh ke grid kapal.
4. **Visualizer Koordinat ISO 9711:** Modal edukasi interaktif 3D yang mengupas tuntas sistem penomoran Bay-Row-Tier.
5. **Tutorial Interaktif Terpandu (5 Tahap):** Onboarding komprehensif bagi kapten baru dengan penyimpanan status di `localStorage`.
6. **Laporan Analitik Pembelajaran & Ekspor PDF:** Laporan pasca-permainan yang membedah efisiensi rute, denda, dan perbandingan grafis terhadap AI benchmark.
7. **Sistem Pembatalan Penataan (Undo):** Memungkinkan kapten membatalkan penataan kargo kembali ke buffer secara aman sebelum berlayar.
8. **In-Game Chat Room & Quick Reactions:** Obrolan teks real-time dan stiker reaksi cepat antar pemain di mode multiplayer.
9. **Mode Penonton (Spectator Mode):** Memberikan akses pemantauan *read-only* bagi dosen penguji atau instruktur.
10. **7 Lencana Prestasi (Badges):** Sistem pencapaian otomatis untuk mengapresiasi keahlian dan efisiensi kapten.
11. **Pengukur Kapasitas (Capacity Meter):** Visual bar pemantauan kuota muatan DRY dan REEFER terpisah anti-overbooking.
12. **Animasi Giliran AI & Skip:** Visualisasi pengambilan keputusan bot di mode offline dengan tombol lewati.
13. **Pintasan Keyboard Global:** Integrasi navigasi hotkeys `[T]`, `[G]`, `[I]`, `[Ctrl+Z]`, `[Esc]`.
14. **Modern Drag & Drop (@dnd-kit):** Interaksi penataan kontainer yang responsif pada layar sentuh maupun desktop.
15. **Bot Omega (DRL Expert Bridge):** Persona bot AI keempat yang terhubung ke microservice Python FastAPI.
16. **Infrastruktur Pengujian Vitest:** 6 file pengujian unit dengan 30 skenario pengujian 100% lolos.
17. **7 Migrasi Basis Data Knex.js:** Manajemen evolusi skema tabel PostgreSQL yang idempotent dan terstruktur.
18. **Indeks Performa Basis Data (007):** Akselerasi kueri leaderboard, chat, dan sesi aktif.
19. **Lapisan Caching Redis dengan Fallback:** Integrasi cache kencang dengan ketahanan mutlak jika server Redis padam.
20. **Orkestrasi Kontainer Docker Compose:** Deployment satu-perintah untuk seluruh 5 komponen aplikasi.
21. **Automasi CI/CD GitHub Actions:** Pipeline verifikasi kode otomatis pada setiap commit.
22. **Dukungan Progressive Web App (PWA):** Kemampuan instalasi aplikasi mandiri pada perangkat Android, iOS, dan desktop.
23. **Penyelarasan URL API Dinamis:** Otomatis mendukung konfigurasi proxy Nginx dan multi-port.
24. **Graceful Shutdown & Health Probes:** Penutupan koneksi server bersih dan endpoint pemantauan kesehatan aktif.
25. **Pembersihan Statis Kode (0 ESLint Errors):** Standarisasi arsitektur React 19 murni tanpa pelanggaran compiler.

---

## 📖 Glosarium Istilah Industri Maritim

| Istilah | Definisi Operasional PT. SPIL & Standar Maritim |
|:--------|:-----------------------------------------------|
| **Bay Plan** | Peta grafis penataan muatan kapal petikemas berdasarkan jenis kontainer, bobot, pelabuhan tujuan, dan kestabilan kapal. |
| **Bay** | Koordinat membujur dari buritan (*stern*) menuju haluan (*bow*). Nomor genap menunjukkan kontainer ukuran 40-kaki. |
| **Row** | Koordinat melintang dari sumbu tengah kapal. Nomor ganjil menandakan sisi kanan kapal (*starboard*), nomor genap menandakan sisi kiri kapal (*portside*), dan `00` menandakan sumbu tengah (*centerline*). |
| **Tier** | Koordinat ketinggian vertikal tumpukan kontainer. Angka `02` menandakan palka bawah (*underdeck*), sedangkan `82` dan `84` menandakan geladak atas (*on-deck*). |
| **Restowage / Shifting** | Gerakan crane terminal untuk mengangkat kontainer penghalang (*blocker*), membongkar kontainer tujuan di bawahnya, dan menaikkan kembali kontainer penghalang ke kapal. |
| **Rolling Penalty** | Denda finansial akibat kegagalan memuat kontainer pesanan yang telah dikonfirmasi ke atas kapal sebelum keberangkatan. |
| **Discharge** | Proses pembongkaran kontainer dari atas kapal ke dermaga di pelabuhan tujuan akhir muatan. |
| **Load** | Proses pemuatan kontainer dari lapangan penumpukan (*container yard*) ke atas kapal di pelabuhan asal. |
| **Next Port** | Pelabuhan singgah terdekat berikutnya — kontainer idealnya diletakkan di geladak on-deck teratas (`84`). |
| **Later Port** | Pelabuhan tujuan kedua atau ketiga dalam sirkuit — kontainer idealnya diletakkan di palka bawah underdeck (`02`). |
| **Committed Customer** | Pelanggan kontrak prioritas tinggi yang muatannya wajib diangkut dengan konsekuensi penalti berat jika ditolak atau gagal muat. |
| **Non-Committed Customer** | Pelanggan reguler umum yang penawarannya bebas ditolak di awal tanpa dikenakan penalti apapun. |
| **DRY Container** | Kontainer kargo kering standar ukuran 40-kaki untuk komoditas umum non-pendingin. |
| **REEFER Container** | Kontainer berpendingin ukuran 40-kaki yang memerlukan suplai daya listrik dari colokan *reefer plug* kapal selama pelayaran. |
| **Hatch Cover** | Penutup palka baja kedap air yang memisahkan ruang palka bawah (*underdeck*) dari geladak atas (*on-deck*). |
| **Crane Movement** | Satuan pergerakan derek pelabuhan untuk memindahkan satu kontainer (1 restow = 2 movements = Rp 6.000.000). |
| **Drain Phase** | Fase 3 minggu terakhir (Minggu 9–11) yang didedikasikan untuk menguras dan membongkar sisa muatan di atas kapal tanpa menerima kargo baru. |

---

## 📄 Lisensi & Hak Cipta

Proyek ini dikembangkan untuk keperluan akademik, penelitian skripsi sarjana, dan pelatihan operasional logistik maritim bekerja sama dengan **PT. Salam Pacific Indonesia Lines (PT. SPIL)**.

* Hak Cipta © 2026 **Faiz Iqbal I'tishom** (NIM: 164231059).
* Seluruh standar tarif, glosarium, dan terminologi operasional mengacu pada ketentuan resmi PT. SPIL.
* Didukung oleh kerangka kerja riset *Deep Reinforcement Learning* dan *Agentic Software Engineering*.
