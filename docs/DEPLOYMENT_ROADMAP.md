# Roadmap Deployment SPIL-GAME

Tanggal analisis: 7 Oktober 2026 · Branch: `redesign/game-page` (commit `e63d91c`)

Tujuan: game bisa diakses online lewat satu URL HTTPS dan stabil dimainkan di **mode solo** (vs bot) maupun **multiplayer** (room Socket.IO, maksimal 8 pemain).

---

## 1. Hasil analisis prototype

### 1.1 Arsitektur yang sebenarnya berjalan

| Komponen | Teknologi | Peran saat runtime | Perlu di-deploy? |
|---|---|---|---|
| `client/` | React 19, Vite 8, Tailwind 3, three.js, socket.io-client | SPA. `ShipScene` (three.js) sudah di-*lazy load* | Ya (sebagai file statis) |
| `server/` | Node 20, Express 4, Socket.IO 4, Knex, pg, JWT | Satu proses, otoritatif atas seluruh state game | Ya |
| PostgreSQL | 7 migrasi Knex (users, rooms, sessions, leaderboard, badges, chat, index) | Persistensi room/sesi/akun/leaderboard | Ya |
| Redis (`server/utils/redis.js`) | ioredis + fallback memori | **Tidak di-import oleh `server.js`**, hanya dipakai di test | Tidak |
| `ai-service/` | FastAPI | `queryDrlService` **tidak dipanggil di runtime**, hanya di test. Isinya juga heuristik, belum model DRL | Tidak |
| `shared/` | Konstanta game & definisi badge | Di-import client dan server | Ikut di-build |

Implikasinya, deployment minimal hanya butuh **satu web service Node + satu database Postgres**. Redis dan AI service bisa ditunda sampai benar-benar dipakai.

### 1.2 Alur dua mode

- **Solo (offline vs bot):** REST `POST /api/game/offline/{resume,start,claim-cargo,decline-cargo,place-container,remove-container,upgrade-vessel,depart}`. State di `OFFLINE_SESSIONS` (memori), kunci = `CLIENT_ID` dari localStorage atau `user_<id>` bila login. Disimpan ke tabel `sessions` setiap aksi.
- **Multiplayer:** Socket.IO event `create_room`, `join_room`, `claim_cargo`, `decline_cargo`, `place_container`, `remove_container`, `player_ready/unready`, `chat_message`, `spectate_room`, `leave_room`. State di `ROOMS` (memori) + timer giliran 60 detik di `ROOM_TIMERS`. Disimpan ke tabel `rooms` setiap broadcast. Reconnect memakai `playerId` persisten, bukan `socket.id`.

### 1.3 Kondisi kualitas saat ini

- `npm test`: 6 file, **30 test lulus**.
- `npm run lint` (client): bersih.
- `npm run build` (client): sukses. Bundle `index` 484 KB dan `ShipScene` 548 KB (sudah terpisah, aman).
- CI GitHub Actions sudah ada (lint, test, build, build image Docker), tetapi belum ada tahap deploy.

### 1.4 Temuan yang memengaruhi stabilitas

Prioritas: **P0** = wajib sebelum online, **P1** = sebaiknya sebelum dipakai banyak orang, **P2** = nanti.

| # | Prio | Temuan | Lokasi | Dampak |
|---|---|---|---|---|
| 1 | P0 | **Satu event Socket.IO tanpa payload membuat seluruh server crash.** Sudah diverifikasi: `socket.emit('claim_cargo')` menghasilkan `TypeError: Cannot destructure property 'orderId' of 'undefined'` dan proses Node mati. Berlaku untuk semua handler yang men-*destructure* argumen. | `server/server.js:544` dst. | Satu klien iseng atau versi klien lama bisa menjatuhkan semua room dan sesi solo |
| 2 | P0 | Tidak ada `app.set('trust proxy', …)`. Di belakang proxy (Railway, Render, Nginx, Caddy) semua pengguna terbaca dengan IP proxy yang sama | `server/server.js:49`, `:335` | Batas login 20 kali per 15 menit berlaku untuk **semua pengguna sekaligus**. Satu kelas yang login bersamaan langsung terblokir |
| 3 | P0 | Kegagalan migrasi ditelan (`catch` hanya `console.error`), server tetap jalan dengan skema rusak | `server/utils/initDb.js:19` | Error baru muncul saat pemain beraksi, sulit dilacak |
| 4 | P0 | `knexfile.js` tidak membaca `DATABASE_SSL`, padahal `db.js` membacanya | `server/knexfile.js:11` | Migrasi gagal di Postgres terkelola yang mewajibkan SSL (Neon, Supabase, Render) |
| 5 | P0 | Nilai default rahasia di `docker-compose.yml` (`JWT_SECRET`, password Postgres) dan port 5432/6379/8000 dibuka ke publik | `docker-compose.yml` | Di VPS, database bisa diakses dari internet dengan password yang ada di repo |
| 6 | P0 | `CORS_ORIGIN=*` untuk REST dan Socket.IO | `.env.example`, `server.js:44` | Situs lain bisa memanggil API atas nama pemain |
| 7 | P1 | Setelah restart, room dan sesi yang dimuat dari DB tidak punya `lastActiveAt`, jadi pembersihan TTL pertama (30 menit setelah boot) langsung membuangnya dari memori | `server.js:113`, `:139`, `:187` | Pemain yang kembali setelah restart mendapati progres "hilang" walaupun datanya masih ada di DB |
| 8 | P1 | Timer giliran 60 detik tidak dijalankan ulang untuk room yang dimuat setelah restart | `server.js:102` | Room bisa macet menunggu pemain yang AFK |
| 9 | P1 | `seed` sesi solo tidak disimpan ke DB (`seed: null` saat dimuat) | `server.js:148`, `:276` | Setelah restart, order kargo sesi ber-*seed* berubah. Ini mengganggu reprodusibilitas pilot penelitian |
| 10 | P1 | State hanya ada di memori satu proses | `ROOMS`, `OFFLINE_SESSIONS`, `ROOM_TIMERS` | **Wajib satu instance.** Jangan aktifkan autoscaling/replika >1 |
| 11 | P1 | Event Socket.IO tidak dibatasi laju (rate limit) dan tipe argumennya tidak divalidasi | `server.js:415–843` | Spam `chat_message`/`place_container` membebani server dan DB |
| 12 | P1 | Limiter umum 1.000 permintaan per 15 menit per IP. Mode solo mengirim satu request per aksi | `server.js:49` | Banyak siswa di balik satu NAT kampus bisa terkena limit |
| 13 | P1 | `node_modules/` di root ter-*track* git (9.595 file) walau ada di `.gitignore` | root repo | Repo berat, build platform lebih lambat |
| 14 | P2 | Setiap aksi menulis JSON penuh room/sesi ke DB | `upsertRoomToDb`, `persistOfflineSession` | Aman untuk puluhan pemain. Perlu *debounce* bila ratusan |
| 15 | P2 | `room_state` mengirim grid semua pemain ke semua klien | `broadcastRoomState` | Pemain bisa mengintip grid lawan lewat devtools. Bandwidth ikut naik |
| 16 | P2 | `httpServer.close` menunggu socket aktif, jadi shutdown selalu kena paksa 10 detik | `server.js:1748` | Deploy ulang sedikit lebih lama. State tetap aman karena sudah tersimpan per aksi |

---

## 2. Arsitektur target

```
Browser ──HTTPS/WSS──▶ [ 1 container Node: Express + Socket.IO + file statis client/dist ]
                                   │
                                   ▼
                          [ PostgreSQL terkelola ]
```

Alasan:
- **Satu origin** untuk SPA, REST, dan WebSocket. Tidak perlu CORS, tidak perlu `VITE_API_URL`, dan proxy WebSocket tidak bisa salah konfigurasi. Kode client sudah mendukungnya: `API_BASE_URL` jatuh ke `''` (same-origin) di luar localhost.
- **Satu instance** sesuai temuan #10. Untuk skala skripsi/kelas (puluhan pemain bersamaan) satu proses Node sudah cukup.
- Redis dan AI service tidak ikut sampai benar-benar dipakai (lihat Fase 7).

### Pilihan hosting

| Opsi | Cocok untuk | Catatan |
|---|---|---|
| **A. Railway** (disarankan) | Pilot/kelas, ingin cepat | Deploy dari Dockerfile, Postgres satu klik, WebSocket didukung, *always-on*. Berbayar (paket Hobby). Cek harga terbaru |
| B. VPS + Docker Compose + Caddy | Kontrol penuh, kredit pelajar (GitHub Student Pack, Azure for Students) | Memakai compose yang sudah ada. Anda sendiri yang mengurus update OS, backup, firewall |
| C. Render Free + Neon Free | Demo singkat saja | Service tidur setelah ±15 menit idle. Saat tidur, room dan timer multiplayer hilang dari memori dan *cold start* ±1 menit. **Tidak cocok untuk sesi multiplayer sungguhan** |

Hindari opsi serverless (Vercel/Netlify Functions) untuk server: Socket.IO dan state di memori butuh proses yang hidup terus.

---

## 3. Roadmap

Estimasi total: **±4–6 hari kerja** sampai stabil untuk pilot.

### Fase 0: Rapikan repo (±½ hari)

1. Hapus `node_modules` dari indeks git (file lokal tidak terhapus):
   ```bash
   git rm -r --cached node_modules
   git commit -m "chore: untrack root node_modules"
   ```
2. Gabungkan `redesign/game-page` ke `main` lewat PR, dan pastikan CI hijau. Deploy hanya dari `main`.
3. Buat rahasia produksi (jangan di-commit):
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

### Fase 1: Hardening wajib (P0) (±1–2 hari)

**1a. Server tidak boleh crash karena payload socket (temuan #1).** Bungkus semua handler di `io.on('connection')`:

```js
io.on('connection', (socket) => {
  // Payload dari klien tidak bisa dipercaya: bisa kosong, null, atau bukan objek.
  // Exception di listener Socket.IO berjalan di nextTick dan mematikan proses.
  const on = (event, handler) => socket.on(event, (...args) => {
    const ack = typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
    const payload = args[0] && typeof args[0] === 'object' ? args[0] : {};
    try {
      handler(payload, ack);
    } catch (err) {
      console.error(`[Socket] ${event} gagal:`, err);
      socket.emit('error_message', 'Terjadi kesalahan server.');
    }
  });

  on('claim_cargo', ({ orderId }) => { /* isi lama */ });
  on('leave_room', (_payload, ack) => { /* isi lama, pakai ack */ });
  // ...ganti semua socket.on(...) menjadi on(...)
});
```

Tambahkan juga jaring pengaman terakhir supaya crash tercatat jelas, lalu biarkan platform me-restart:
```js
process.on('uncaughtException', (err) => { console.error('[Fatal]', err); gracefulShutdown('uncaughtException'); });
process.on('unhandledRejection', (err) => console.error('[UnhandledRejection]', err));
```
Tambahkan satu test yang memancarkan `claim_cargo` tanpa argumen dan memastikan server tetap hidup.

**1b. Proxy & CORS (temuan #2, #6).**
```js
app.set('trust proxy', 1); // tepat satu hop proxy (Railway/Render/Caddy)
```
Set `CORS_ORIGIN=https://domain-anda` di produksi. Bila memakai arsitektur satu origin, CORS bahkan bisa dimatikan.

**1c. Migrasi gagal = server berhenti (temuan #3, #4).**
- `initDb.js`: di blok `catch`, lempar ulang error (`throw err`) supaya `startServer` keluar dengan kode 1 dan platform menandai deploy gagal.
- `knexfile.js`: samakan dengan `db.js`:
  ```js
  connection: process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false }
    : { /* host/port/... seperti sekarang */ },
  ```
- Hapus `npm run migrate &&` dari `CMD` Dockerfile, karena `initializeDatabase()` sudah menjalankan migrasi saat boot. Cukup satu jalur.

**1d. Rahasia & port (temuan #5).** Di `docker-compose.yml`, ganti `${JWT_SECRET:-...}` dan `${POSTGRES_PASSWORD:-...}` menjadi `${JWT_SECRET:?wajib diisi}`. Hapus pemetaan `ports` untuk postgres, redis, dan ai-service (cukup jaringan internal compose).

### Fase 2: Kemasan produksi satu container (±½–1 hari)

**2a. Express menyajikan build client.** Tambahkan setelah semua route `/api` di `server.js`:
```js
import path from 'path';
import { fileURLToPath } from 'url';

const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1y', immutable: true }));
app.get(/^\/(?!api\/|socket\.io\/|health).*/, (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});
```

**2b. `Dockerfile` di root (menggantikan `client/Dockerfile` + `nginx.conf` untuk produksi):**
```dockerfile
FROM node:20-alpine AS client
WORKDIR /app
COPY package.json ./
COPY shared ./shared
COPY client/package*.json client/
RUN npm ci --prefix client
COPY client client
RUN npm run build --prefix client

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY shared ./shared
COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server
COPY server server
COPY --from=client /app/client/dist client/dist
WORKDIR /app/server
USER node
EXPOSE 5050
HEALTHCHECK CMD wget -qO- http://localhost:${PORT:-5050}/health || exit 1
CMD ["node", "server.js"]
```
Tambahkan `.dockerignore` (`node_modules`, `**/node_modules`, `*.docx`, `*.pdf`, `research`, `Skripsi Kating`, `Info`, `.git`) supaya naskah skripsi tidak ikut ter-upload ke builder.

**2c. Uji lokal sebelum deploy:**
```bash
docker build -t spil-game .
```
```bash
docker run --rm -p 5050:5050 -e JWT_SECRET=dev -e DATABASE_URL=postgresql://spil_admin:spil_secret_password@host.docker.internal:5432/spil_game spil-game
```
Buka `http://localhost:5050`, mainkan satu putaran solo dan buat satu room multiplayer.

### Fase 3: Infrastruktur & deploy (±½ hari, contoh Railway)

1. Buat project baru, lalu *Deploy from GitHub repo* dan pilih branch `main`. Railway otomatis mendeteksi `Dockerfile` di root.
2. Tambahkan plugin **PostgreSQL**. Variabel `DATABASE_URL` tersedia sebagai referensi.
3. Isi variabel service:

   | Variabel | Nilai |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `DATABASE_SSL` | `false` untuk jaringan internal Railway, `true` untuk Neon/Supabase |
   | `JWT_SECRET` | hasil Fase 0 langkah 3 |
   | `CORS_ORIGIN` | `https://<domain-anda>` |
   | `DB_POOL_MAX` | `10` |

   `PORT` disuntikkan platform dan sudah dibaca `server.js`.
4. Settings: **Replicas = 1**, health check path `/health`, restart policy *on failure*.
5. Buat domain (subdomain `*.up.railway.app` atau domain sendiri). HTTPS dan WSS otomatis.
6. **Opsi VPS:** pakai `docker-compose.yml` yang sudah diperbaiki (Fase 1d), tambah service `caddy` di depan dengan `Caddyfile` berisi `domain-anda { reverse_proxy server:5050 }`. Caddy menangani HTTPS dan WebSocket otomatis. Buka firewall hanya port 80/443.

### Fase 4: Stabilitas state (P1) (±1 hari)

1. **Pemuatan setelah restart (temuan #7, #8).** Di `loadRoomsFromDb` dan `loadSessionsFromDb`, isi `lastActiveAt: new Date(row.updated_at).getTime()`. Setelah semua room dimuat, panggil `startTurnTimer(code)` untuk room yang belum selesai.
2. **Simpan seed (temuan #9).** Buat migrasi baru `20261008_008_add_session_seed.js` yang menambah kolom `seed` (text, nullable) di `sessions`. Tulis kolom itu di `upsertSessionToDb` dan baca saat memuat.
3. **Rate limit event socket (temuan #11).** Batasi per socket dengan penghitung sederhana, misalnya maksimal 20 event per detik. Abaikan event yang melebihi batas. Validasi `bay/row/tier` bertipe string dan `message` bertipe string.
4. **Limiter REST (temuan #12).** Kecualikan `/api/game/offline/*` dari `generalLimiter` atau naikkan batasnya. Untuk `authLimiter`, gunakan kunci `IP + username` agar satu kelas di balik satu NAT tidak saling mengunci.

### Fase 5: Verifikasi sebelum dibuka ke pengguna (±1 hari)

**Smoke test solo:**
- [ ] Guest: mulai game, claim/decline kargo, tempatkan/lepas kontainer, upgrade kapal, depart sampai game over. Entri leaderboard muncul.
- [ ] Refresh di tengah game, lalu *resume* melanjutkan state yang sama.
- [ ] Register, login, main, logout, login di browser lain, lalu sesi yang sama ter-*resume*.

**Smoke test multiplayer (minimal 3 perangkat/jaringan berbeda, termasuk HP data seluler):**
- [ ] Buat room, join dengan kode, chat, claim kargo yang sama secara bersamaan (hanya satu yang menang).
- [ ] Semua ready, kapal berlayar. Satu pemain diam, timer 60 detik auto-sail.
- [ ] Matikan Wi-Fi satu pemain 10 detik, lalu reconnect ke kursi yang sama dengan state utuh.
- [ ] Spectator bisa menonton tapi tidak bisa beraksi.
- [ ] `leave_room` mengosongkan kursi. Room kosong terhapus.

**Uji ketahanan:**
- [ ] **Restart service saat game berlangsung.** Room dan sesi kembali, timer jalan lagi, pemain bisa reconnect.
- [ ] Kirim event tanpa payload (`socket.emit('claim_cargo')`). Server tetap hidup.
- [ ] Uji beban kecil: skrip Node dengan `socket.io-client` yang membuat 20 room × 4 pemain dan melakukan aksi acak selama 10 menit. Pantau CPU, memori, latensi `room_state`, dan jumlah koneksi Postgres.
- [ ] Lighthouse di HP: muat awal < 3 detik di 4G.

### Fase 6: Operasional (berkelanjutan)

- **Monitoring:** UptimeRobot/Better Stack memantau `https://domain/health` setiap 1–5 menit dengan notifikasi email. Endpoint ini sudah mengecek koneksi DB dan mengembalikan 503 bila DB putus.
- **Log:** gunakan log bawaan platform. Cari `[Fatal]`, `[Database]`, dan `Migration failed`.
- **Backup DB:** aktifkan backup otomatis provider, atau jalankan `pg_dump` harian lewat GitHub Actions terjadwal. Uji restore sekali.
- **CI/CD:** tambahkan job deploy di `.github/workflows/ci.yml` yang hanya berjalan di `main` setelah test lulus (Railway: auto-deploy dari GitHub sudah cukup, aktifkan opsi *wait for CI*).
- **Rollback:** redeploy commit sebelumnya dari dashboard. Migrasi Knex harus selalu aditif (tambah kolom/tabel, jangan hapus) agar rollback kode aman.
- **Jadwal deploy:** jangan deploy saat sesi kelas/pilot berlangsung. Restart memutus semua socket, walaupun state pulih.

### Fase 7: Hanya bila dibutuhkan nanti

| Kebutuhan | Langkah | Pemicu |
|---|---|---|
| Lebih dari satu instance | `@socket.io/redis-adapter` + sticky session, dan state room dipindah ke Redis/DB (bukan objek memori) | > ±200 pemain bersamaan atau CPU satu instance > 70% |
| Bot Omega memakai model DRL sungguhan | Panggil `queryDrlService` di jalur bot, deploy `ai-service` sebagai service privat (tanpa domain publik), set `AI_SERVICE_URL` | Model terlatih siap |
| Menyembunyikan grid lawan | Kirim `room_state` per pemain (grid sendiri penuh, lawan hanya ringkasan) | Dipakai untuk kompetisi berhadiah/penilaian |
| Tulis DB lebih hemat | *Debounce* `upsertRoomToDb` 1–2 detik per room, flush saat shutdown | Koneksi/latensi DB tinggi |

---

## 4. Ringkasan urutan kerja

1. Fase 0: untrack `node_modules`, merge ke `main`, buat rahasia.
2. Fase 1: perbaiki crash socket, `trust proxy`, migrasi fail-fast + SSL, rahasia/port compose.
3. Fase 2: satu `Dockerfile` root, Express menyajikan `client/dist`, `.dockerignore`.
4. Fase 3: Railway (atau VPS + Caddy), Postgres, env vars, replika = 1, domain HTTPS.
5. Fase 4: `lastActiveAt` + timer setelah restart, simpan `seed`, rate limit socket.
6. Fase 5: checklist solo, multiplayer, restart, dan beban.
7. Fase 6: monitoring `/health`, backup, CI deploy, aturan rollback.
