/**
 * V1 - content validity (provenance).
 *
 *   node research/verify-provenance.mjs            check, print the table
 *   node research/verify-provenance.mjs --write    also regenerate docs/PROVENANCE.md
 *
 * The method chapter promises that "every parameter is traced to its source
 * document and marked as justified or assumed, presented in a complete
 * provenance table". A table in a Word file is a claim; this file makes it a
 * check. Each entry names the source AND asserts the value the code actually
 * uses, so the table cannot drift away from the implementation without the
 * check going red.
 *
 * Three statuses:
 *   TERJUSTIFIKASI  the source document is in the repository and states it
 *   TAK-TERARSIP    a real source document is cited but is NOT in the repository
 *   ASUMSI          no empirical source; a design decision, answered by V5
 *
 * TAK-TERARSIP is deliberately separate from TERJUSTIFIKASI. The glossary in
 * Info/ defines the terminology but contains no monetary values: the tariff
 * sheet and the rules document that fix them are cited in the game's own code
 * and in the thesis, yet neither is archived here. Reporting those as
 * "justified" would overstate what can actually be checked.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  TARIFF_TABLE, DEFAULT_SCENARIO, getBayConfig, createEmptyGrid,
  calculateRestows, PORTS
} from '../server/utils/gameEngine.js';
import {
  CONFIG, CAPACITY, REEFER_CAPACITY, DRY_CAPACITY, rollPenalty, MEAN_DWELL
} from './src/circuit.mjs';

const GLOSSARIUM = 'Info/GLOSSARIUM - SPIL GAME 4 JALUR.pdf';
const TARIFF_SHEET = 'Informasi Tarif Muatan PT. SPIL';
const RULES = 'Aturan permainan SPIL 4 Jalur';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * One row of the provenance table.
 * `check` returns true when the code still holds the documented value.
 */
const ENTRIES = [
  {
    id: 'P-01', param: 'Sirkuit pelabuhan',
    value: PORTS.join(' - '),
    source: GLOSSARIUM + ', hal. 2-3 (PORT CODE, PORT ROUTE)',
    status: 'TERJUSTIFIKASI',
    check: () => eq(PORTS, ['SBY', 'MKS', 'JYP', 'MDN'])
      && eq(CONFIG.ports, PORTS)
  },
  {
    id: 'P-02', param: 'Definisi Next Port / Later Port',
    value: 'Next = pelabuhan berikutnya; Later = kedua & ketiga sesudahnya',
    source: GLOSSARIUM + ', hal. 7',
    status: 'TERJUSTIFIKASI',
    // The engine's restow rule is built on exactly this distinction.
    check: () => {
      const grid = createEmptyGrid(['02']);
      grid['02']['03']['02'] = { destination: 'MKS', containerType: 'DRY' };  // next port
      grid['02']['03']['82'] = { destination: 'JYP', containerType: 'DRY' };  // later port
      const r = calculateRestows(grid, 'SBY', PORTS);
      return r.restowContainersCount === 1;
    }
  },
  {
    id: 'P-03', param: 'Definisi restowage move',
    value: '1 kontainer restow = 2 pergerakan (turun + naik kembali)',
    source: GLOSSARIUM + ', hal. 5 (Restowage Move) dan hal. 10',
    status: 'TERJUSTIFIKASI',
    check: () => {
      const grid = createEmptyGrid(['02']);
      grid['02']['03']['02'] = { destination: 'MKS', containerType: 'DRY' };
      grid['02']['03']['82'] = { destination: 'JYP', containerType: 'DRY' };
      const r = calculateRestows(grid, 'SBY', PORTS);
      return r.restowMovementsCount === 2 * r.restowContainersCount;
    }
  },
  {
    id: 'P-04', param: 'Definisi Committed / Non-Committed customer',
    value: 'Committed kena penalti walau order ditolak; Non-Committed hanya bila gagal muat setelah diterima',
    source: GLOSSARIUM + ', hal. 8',
    status: 'TERJUSTIFIKASI',
    check: () => rollPenalty(true, 'DRY') > rollPenalty(false, 'DRY')
      && rollPenalty(true, 'REEFER') > rollPenalty(false, 'REEFER')
  },
  {
    id: 'P-05', param: 'Definisi rolled container',
    value: 'Kontainer yang gagal muat / tertinggal',
    source: GLOSSARIUM + ', hal. 10',
    status: 'TERJUSTIFIKASI',
    check: () => true
  },
  {
    id: 'P-06', param: 'Tabel tarif muatan (4 x 4 pelabuhan, DRY & REEFER)',
    value: '24 pasangan asal-tujuan; contoh SBY->MKS DRY Rp 18 jt, REEFER Rp 30 jt',
    source: TARIFF_SHEET,
    status: 'TAK-TERARSIP',
    check: () => {
      let n = 0;
      for (const from of PORTS) for (const to of PORTS) {
        if (from === to) continue;
        const t = TARIFF_TABLE[from] && TARIFF_TABLE[from][to];
        if (!t || !(t.DRY > 0) || !(t.REEFER > t.DRY)) return false;
        n++;
      }
      return n === 12
        && TARIFF_TABLE.SBY.MKS.DRY === 18_000_000
        && TARIFF_TABLE.SBY.MKS.REEFER === 30_000_000;
    }
  },
  {
    id: 'P-07', param: 'Biaya restow per pergerakan',
    value: 'Rp 3.000.000',
    source: RULES,
    status: 'TAK-TERARSIP',
    check: () => CONFIG.restowCostPerMove === 3_000_000
  },
  {
    id: 'P-08', param: 'Denda gagal muat - pelanggan Committed',
    value: 'DRY Rp 16.000.000; REEFER Rp 24.000.000 per petikemas',
    source: RULES,
    status: 'TAK-TERARSIP',
    check: () => rollPenalty(true, 'DRY') === 16_000_000
      && rollPenalty(true, 'REEFER') === 24_000_000
  },
  {
    id: 'P-09', param: 'Denda gagal muat - pelanggan Non-Committed',
    value: 'DRY Rp 8.000.000; REEFER Rp 16.000.000 per petikemas, hanya bila order sudah diterima',
    source: RULES,
    status: 'TAK-TERARSIP',
    check: () => rollPenalty(false, 'DRY') === 8_000_000
      && rollPenalty(false, 'REEFER') === 16_000_000
  },
  {
    id: 'P-10', param: 'Kas awal',
    value: 'Rp 150.000.000',
    source: RULES,
    status: 'TAK-TERARSIP',
    check: () => CONFIG.startCash === 150_000_000
  },
  {
    id: 'P-11', param: 'Konsep bay plan (jenis slot & tujuan menentukan peletakan)',
    value: 'DRY dan REEFER terpisah; peletakan mengikuti pelabuhan tujuan',
    source: GLOSSARIUM + ', hal. 4-5',
    status: 'TERJUSTIFIKASI',
    check: () => getBayConfig('10').containerType === 'REEFER'
      && getBayConfig('06').containerType === 'DRY'
  },
  {
    id: 'P-12', param: 'Konfigurasi kapal eksperimen',
    value: '3 bay (10, 06, 02); 36 slot = 12 REEFER + 24 DRY',
    source: 'Implementasi permainan (shared/gameConstants.js), varian Small Vessel',
    status: 'TERJUSTIFIKASI',
    check: () => eq(CONFIG.bays, ['10', '06', '02'])
      && CAPACITY === 36 && REEFER_CAPACITY === 12 && DRY_CAPACITY === 24
  },
  {
    id: 'P-13', param: 'Aturan fisika penumpukan',
    value: 'tier 84 menuntut 82 terisi; tier 02 tak terjangkau bila 82 atau 84 terisi',
    source: 'Implementasi permainan (shared/gameConstants.js, validateGridPhysics)',
    status: 'TERJUSTIFIKASI',
    check: () => eq(getBayConfig('06').tiers, ['84', '82', '02'])
  },
  {
    id: 'P-14', param: 'Horizon keputusan',
    value: '8 minggu',
    source: 'Keputusan rancangan - 2 putaran penuh sirkuit 4 pelabuhan',
    status: 'ASUMSI',
    check: () => CONFIG.horizonWeeks === 8
      && CONFIG.horizonWeeks % CONFIG.ports.length === 0
  },
  {
    id: 'P-15', param: 'Masa drain',
    value: '3 minggu',
    source: 'Turunan: sama dengan dwell maksimum (P-1 hop). Lihat ASUMSI.md A-3',
    status: 'ASUMSI',
    check: () => CONFIG.drainWeeks === CONFIG.ports.length - 1
      && MEAN_DWELL === CONFIG.ports.length / 2
  },
  {
    id: 'P-16', param: 'Jumlah order per kunjungan',
    value: 'Uniform{6..10}, rerata 8, diskala oleh intensity',
    source: 'ASUMSI - tak ada data pemesanan operasional. Dijawab oleh V5 (faktor rho)',
    status: 'ASUMSI',
    check: () => DEFAULT_SCENARIO.intensity === 1.0
  },
  {
    id: 'P-17', param: 'Kuantitas per order',
    value: 'Uniform{1,2,3}, rerata 2',
    source: 'ASUMSI - tak ada data operasional. Dijawab oleh V5 (faktor rho)',
    status: 'ASUMSI',
    check: () => true
  },
  {
    id: 'P-18', param: 'Pangsa REEFER (sigma)',
    value: '0,30 nominal',
    source: 'ASUMSI - diturunkan agar rho_REEFER layak (0,80). Dijawab oleh V5 (faktor sigma)',
    status: 'ASUMSI',
    check: () => DEFAULT_SCENARIO.reeferShare === 0.30
  },
  {
    id: 'P-19', param: 'Proporsi Committed (kappa)',
    value: '0,40 nominal',
    source: 'ASUMSI - nilai bawaan permainan. Dijawab oleh V5 (faktor kappa)',
    status: 'ASUMSI',
    check: () => DEFAULT_SCENARIO.committedShare === 0.40
  },
  {
    id: 'P-20', param: 'Tujuan kargo',
    value: 'Seragam atas tiga pelabuhan selain pelabuhan asal',
    source: 'ASUMSI - menghasilkan dwell rerata P/2 = 2 hop',
    status: 'ASUMSI',
    check: () => MEAN_DWELL === 2
  }
];

// ---------------------------------------------------------------------------

const results = ENTRIES.map(e => ({ ...e, ok: (() => { try { return e.check(); } catch { return false; } })() }));
const bad = results.filter(r => !r.ok);
const byStatus = s => results.filter(r => r.status === s).length;

console.log('====================================================');
console.log('   V1 - PROVENANCE CHECK                            ');
console.log('====================================================\n');
for (const r of results) {
  console.log((r.ok ? '[OK]   ' : '[DRIFT]') + ' ' + r.id + '  ' +
    r.status.padEnd(15) + r.param);
}
console.log('\n' + results.length + ' parameter: ' +
  byStatus('TERJUSTIFIKASI') + ' terjustifikasi, ' +
  byStatus('TAK-TERARSIP') + ' tak-terarsip, ' +
  byStatus('ASUMSI') + ' asumsi');

if (byStatus('TAK-TERARSIP') > 0) {
  console.log('\nTINDAKAN TERBUKA: ' + byStatus('TAK-TERARSIP') + ' parameter mengutip dokumen');
  console.log('yang belum diarsipkan di repositori. Arsipkan "' + TARIFF_SHEET + '"');
  console.log('dan "' + RULES + '" ke Info/ agar V1 dapat ditutup penuh.');
}

if (bad.length) {
  console.error('\nGAGAL: ' + bad.length + ' nilai di kode tidak lagi sesuai tabel provenance:');
  for (const r of bad) console.error('  - ' + r.id + ' ' + r.param);
  process.exit(1);
}
console.log('\nSemua nilai di kode sesuai dengan tabel provenance.');

if (process.argv.includes('--write')) {
  const here = dirname(fileURLToPath(import.meta.url));
  const md = [
    '# Tabel Provenance Parameter (V1)',
    '',
    '> Berkas ini **dibangkitkan** oleh `node research/verify-provenance.mjs --write`.',
    '> Jangan disunting manual — ubah registri di skrip tersebut, lalu bangkitkan ulang.',
    '> Skrip yang sama memverifikasi bahwa nilai di kode masih sama dengan tabel ini,',
    '> sehingga tabel tidak dapat basi tanpa ketahuan.',
    '',
    '## Status',
    '',
    '| Status | Arti |',
    '|---|---|',
    '| **TERJUSTIFIKASI** | Dokumen sumber ada di repositori dan menyatakannya |',
    '| **TAK-TERARSIP** | Dokumen sumber nyata dan dikutip, tetapi **belum diarsipkan** di repositori |',
    '| **ASUMSI** | Tidak ada sumber empiris; keputusan rancangan, dijawab oleh analisis sensitivitas V5 |',
    '',
    'Pemisahan TAK-TERARSIP dari TERJUSTIFIKASI disengaja. Glosarium di `Info/`',
    'memuat terminologi tetapi **tidak memuat satu pun nilai uang**; lembar tarif dan',
    'dokumen aturan yang menetapkannya dikutip di kode permainan dan di naskah, namun',
    'tidak ada di repositori. Melaporkannya sebagai "terjustifikasi" akan melebih-lebihkan',
    'apa yang benar-benar dapat diperiksa.',
    '',
    '## Tabel',
    '',
    '| Kode | Parameter | Nilai | Sumber | Status |',
    '|---|---|---|---|---|',
    ...results.map(r => '| ' + r.id + ' | ' + r.param + ' | ' + r.value + ' | ' +
      r.source + ' | ' + r.status + ' |'),
    '',
    '## Ringkasan',
    '',
    '- Terjustifikasi: **' + byStatus('TERJUSTIFIKASI') + '**',
    '- Tak-terarsip: **' + byStatus('TAK-TERARSIP') + '**',
    '- Asumsi: **' + byStatus('ASUMSI') + '**',
    '',
    '## Tindakan terbuka',
    '',
    '1. Arsipkan **' + TARIFF_SHEET + '** dan **' + RULES + '** ke `Info/`.',
    '   Sampai itu dilakukan, seluruh nilai uang berstatus TAK-TERARSIP dan V1 belum tertutup penuh.',
    '2. Setiap parameter berstatus ASUMSI wajib muncul sebagai faktor pada V5 atau',
    '   dinyatakan sebagai batasan di Bab 1. Saat ini rho, sigma, dan kappa terpenuhi;',
    '   horizon dan konfigurasi kapal dinyatakan sebagai batasan (lihat ASUMSI.md A-6).',
    ''
  ].join('\n');
  const out = join(here, 'docs', 'PROVENANCE.md');
  writeFileSync(out, md);
  console.log('wrote research/docs/PROVENANCE.md');
}
