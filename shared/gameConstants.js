/**
 * Vessel bay-plan constants and pure geometry/physics helpers.
 *
 * This is the single source of truth for the ship layout, imported by both
 * the client (rendering the bayplan) and the server (validating and scoring
 * it). It used to be duplicated in client/src/utils/gameHelpers.js and
 * server/utils/gameEngine.js, and the copies had already drifted (bay 22
 * stopped being recognised as REEFER on one side but not the other). Edit
 * only this file for anything here - the two callers just re-export it.
 *
 * Kept dependency-free (no Node or DOM APIs) so it works unmodified in the
 * browser bundle, the Node server, and the research harness.
 */

// Ports circuit definition
export const PORTS = ['SBY', 'MKS', 'JYP', 'MDN'];

export const PORT_CODES_INFO = [
  { code: 'SBY', number: '01', name: 'Surabaya', fullName: 'Pelabuhan Tanjung Perak, Surabaya' },
  { code: 'MKS', number: '02', name: 'Makassar', fullName: 'Pelabuhan Soekarno-Hatta, Makassar' },
  { code: 'JYP', number: '03', name: 'Jayapura', fullName: 'Pelabuhan Jayapura, Papua' },
  { code: 'MDN', number: '04', name: 'Medan', fullName: 'Pelabuhan Belawan, Medan' }
];

// Official Tariff Table (Informasi Tarif Muatan PT. SPIL).
// Single source of truth for client, server, and research provenance.
export const TARIFF_TABLE = {
  SBY: {
    MKS: { DRY: 18000000, REEFER: 30000000 },
    MDN: { DRY: 6000000, REEFER: 11000000 },
    JYP: { DRY: 16200000, REEFER: 24000000 }
  },
  MKS: {
    SBY: { DRY: 10000000, REEFER: 18000000 },
    MDN: { DRY: 12000000, REEFER: 20000000 },
    JYP: { DRY: 16000000, REEFER: 24000000 }
  },
  JYP: {
    SBY: { DRY: 13000000, REEFER: 19000000 },
    MKS: { DRY: 13000000, REEFER: 23000000 },
    MDN: { DRY: 11000000, REEFER: 17000000 }
  },
  MDN: {
    SBY: { DRY: 13000000, REEFER: 22000000 },
    MKS: { DRY: 14000000, REEFER: 24000000 },
    JYP: { DRY: 14000000, REEFER: 22000000 }
  }
};

// Official Glossary Sections from GLOSSARIUM - SPIL GAME 4 JALUR.pdf
export const GLOSSARY_SECTIONS = [
  {
    id: 'port-route',
    title: 'Port Code & Port Route',
    subtitle: 'Kode Pelabuhan & Rotasi Sirkuit Pelayaran',
    page: 'Hal. 2-3',
    icon: 'Anchor',
    items: [
      {
        term: 'Sirkuit Rotasi Tetap',
        desc: 'SBY (01) ➔ MKS (02) ➔ JYP (03) ➔ MDN (04) ➔ kembali ke SBY (01). Kapal berlayar secara siklis menghubungkan pulau-pulau utama Indonesia.'
      },
      {
        term: 'Port Code Resmi',
        desc: '01 SBY: Surabaya, 02 MKS: Makassar, 03 JYP: Jayapura, 04 MDN: Medan.'
      }
    ]
  },
  {
    id: 'bayplan-stowage',
    title: 'Bayplan Kapal & Stowage Sheet',
    subtitle: 'Perencanaan Muatan & Fisika Kapal',
    page: 'Hal. 4-5',
    icon: 'Ship',
    items: [
      {
        term: 'Bay Plan',
        desc: 'Gambaran perencanaan muatan kapal petikemas (kontainer) yang menghitung berdasarkan jenis peti kemas (DRY / REEFER), tujuan pengirimannya, dan volume daya angkut kapal yang akan dimuat.'
      },
      {
        term: 'Bay (Posisi Membujur)',
        desc: 'Pembagian muatan berupa nomor membujur dari ujung kapal depan (haluan/bow) hingga belakang (buritan/stern).'
      },
      {
        term: 'Row (Posisi Melintang)',
        desc: 'Nomor baris melintang dari sumbu tengah kapal. Nomor ganjil di sisi kanan kapal (Starboard), nomor genap di sisi kiri kapal (Port), dan 00 di garis tengah (Center), sesuai ISO 9711-1.'
      },
      {
        term: 'Tier (Tingkat Ketinggian)',
        desc: 'Ketinggian tumpukan petikemas. Tier 02 berada di dalam palka (Underdeck/Hold), sedangkan Tier 82 & 84 berada di atas geladak kapal (On-Deck).'
      },
      {
        term: 'Jumlah Perpindahan (Discharge Moves)',
        desc: 'Kuantitas perpindahan/pergerakan crane ketika membongkar kontainer (menurunkan kontainer dari kapal).'
      },
      {
        term: 'Jumlah Pergerakan Muat (Load Moves)',
        desc: 'Kuantitas perpindahan/pergerakan crane ketika memuat kontainer (menaikkan kontainer ke atas kapal).'
      },
      {
        term: 'Restowage Move (Shifting)',
        desc: 'Penyusunan ulang kontainer di atas kapal dengan menurunkan kontainer untuk mengambil kontainer di bawahnya dan menaikkannya kembali. 1 kontainer restow = 2 pergerakan (turun + naik kembali) dengan biaya Rp 3.000.000 per pergerakan (total Rp 6.000.000 per kontainer blocker).'
      }
    ]
  },
  {
    id: 'stock-availability',
    title: 'Update Stok & Ketersediaan',
    subtitle: 'Manajemen Kuota & Rute Kargo',
    page: 'Hal. 6-7',
    icon: 'Package',
    items: [
      {
        term: 'Fungsi Lembar Stok',
        desc: 'Digunakan untuk update jumlah kontainer saat tiba maupun akan berangkat: mengetahui kapasitas kapal yang bisa dimuat, mencatat sales call yang diambil/ditolak, dan menghitung estimasi pendapatan.'
      },
      {
        term: 'Next Port',
        desc: 'Pelabuhan tujuan selanjutnya tepat setelah cabang Anda. Kargo Next Port wajib ditempatkan di dek atas (Tier 82/84) agar saat kapal bersandar dapat langsung dibongkar tanpa memblokir kargo lain.'
      },
      {
        term: 'Later Port',
        desc: 'Pelabuhan tujuan kedua & ketiga setelah cabang Anda. Kargo Later Port sebaiknya ditempatkan di palka bawah (Tier 02) agar tidak terganggu saat kapal singgah di pelabuhan perantara.'
      },
      {
        term: 'Kuota DRY vs REEFER',
        desc: 'Bay 10 & 14 dilengkapi plug listrik pendingin khusus kontainer REEFER. Bay 18, 06, dan 02 dikhususkan untuk DRY kontainer. Muatan tidak boleh saling tertukar jenis slotnya.'
      }
    ]
  },
  {
    id: 'sales-call-tariff',
    title: 'Sales Call & Informasi Tarif',
    subtitle: 'Penerimaan Order & Klasifikasi Customer',
    page: 'Hal. 8',
    icon: 'PhoneCall',
    items: [
      {
        term: 'Informasi Tarif Muatan',
        desc: 'Lembar panduan resmi SPIL untuk mengetahui batas tarif/harga minimal pengangkutan container dari pelabuhan asal ke pelabuhan tujuan (bervariasi berdasarkan rute dan tipe petikemas DRY/REEFER).'
      },
      {
        term: 'Committed Customer',
        desc: 'Customer prioritas (terikat kontrak). Apabila muatan kontainernya TIDAK DIAMBIL atau GAGAL DIMUAT ke dalam kapal, kapten/operator akan langsung dikenakan penalti rolling penuh (DRY Rp 16 Jt, REEFER Rp 24 Jt per unit).'
      },
      {
        term: 'Non-Committed Customer',
        desc: 'Customer biasa. Apabila penawaran kontainernya tidak diambil/ditolak, TIDAK AKAN terkena penalti. Namun, jika order sudah diterima/diklaim tetapi gagal termuat ke atas kapal, tetap dikenakan penalti (DRY Rp 8 Jt, REEFER Rp 16 Jt per unit).'
      }
    ]
  },
  {
    id: 'weekly-performance',
    title: 'Lembar Kinerja Mingguan',
    subtitle: 'Audit Finansial & Evaluasi Cabang',
    page: 'Hal. 9-10',
    icon: 'FileText',
    items: [
      {
        term: 'Fungsi Lembar Kinerja',
        desc: 'Mendokumentasikan performa cabang/pelabuhan: menghitung kontainer gagal muat (rolled), jumlah restow, total penalti operasional, dan pendapatan bersih (net revenue).'
      },
      {
        term: 'Rolled Containers',
        desc: 'Kontainer yang gagal muat / tertinggal di pelabuhan asal padahal kapasitas kapal tersedia atau order sudah terlanjur diklaim.'
      },
      {
        term: 'Rolling Penalty',
        desc: 'Denda kegagalan muat: Committed (DRY Rp 16 Jt, REEFER Rp 24 Jt), Non-Committed (DRY Rp 8 Jt, REEFER Rp 16 Jt).'
      },
      {
        term: 'Restow Penalty',
        desc: 'Denda akibat pergerakan crane tambahan untuk membongkar kontainer yang menghalangi kargo pelabuhan saat ini (Rp 3.000.000 per movement, atau Rp 6.000.000 per blocker).'
      },
      {
        term: 'Pendapatan Bersih (Net Income)',
        desc: 'Pendapatan Kotor Freight (diakui saat kontainer sampai di pelabuhan tujuan / discharge) dikurangi Total Penalti Rolling dan Total Penalti Restow.'
      }
    ]
  }
];

// Vessel Bayplan specifications
// Bay 26 & 22: DRY only, 4 rows, 3 tiers (84, 82, 02) - Level 3 Large Vessel
// Bay 18: DRY only, 3 rows, 2 tiers (84, 82 - on-deck only)
// Bay 14 & 10: REEFER only, 4 rows, 3 tiers (84, 82, 02)
// Bay 06 & 02: DRY only, 4 rows, 3 tiers (84, 82, 02)
export const BAYS = ['18', '14', '10', '06', '02'];
export const ALL_BAYS = ['26', '22', '18', '14', '10', '06', '02'];

export const OFFLINE_BAYS_BY_LEVEL = {
  1: ['10', '06', '02'],
  2: ['18', '14', '10', '06', '02'],
  3: ['26', '22', '18', '14', '10', '06', '02']
};

// Bays fitted with reefer plugs. Kept as an explicit list so adding a bay
// is a one-line change instead of an edit to a boolean expression.
export const REEFER_BAYS = ['14', '10'];

export const getBayConfig = (bay) => {
  const isBay18 = bay === '18';
  return {
    rows: isBay18 ? ['01', '00', '02'] : ['03', '01', '02', '04'],
    tiers: isBay18 ? ['84', '82'] : ['84', '82', '02'],
    containerType: REEFER_BAYS.includes(bay) ? 'REEFER' : 'DRY'
  };
};

/**
 * Creates a clean, empty vessel grid
 */
export const createEmptyGrid = (bays = BAYS) => {
  const grid = {};
  bays.forEach(bay => {
    grid[bay] = {};
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      grid[bay][row] = {};
      config.tiers.forEach(tier => {
        grid[bay][row][tier] = null;
      });
    });
  });
  return grid;
};

/**
 * Validates slot type restrictions and support structures.
 * Underdeck (02) is supported by tanktop.
 * On-deck (82) sits on hatch cover, supported without 02.
 * On-deck upper (84) requires on-deck lower (82).
 */
export const validateGridPhysics = (grid) => {
  const errors = [];
  const bays = Object.keys(grid);

  bays.forEach(bay => {
    const config = getBayConfig(bay);
    config.rows.forEach(row => {
      const stack = grid[bay][row];

      // 1. Container Type matching Bay slot type
      config.tiers.forEach(tier => {
        const container = stack[tier];
        if (container) {
          if (config.containerType === 'REEFER' && container.containerType !== 'REEFER') {
            errors.push(`Slot Bay ${bay}, Row ${row}, Tier ${tier} hanya menerima kontainer REEFER, tetapi berisi DRY.`);
          }
          if (config.containerType === 'DRY' && container.containerType !== 'DRY') {
            errors.push(`Slot Bay ${bay}, Row ${row}, Tier ${tier} hanya menerima kontainer DRY, tetapi berisi REEFER.`);
          }
        }
      });

      // 2. Stacking rule: Tier 84 requires Tier 82 in the same row
      if (stack['84'] && !stack['82']) {
        errors.push(`Kesalahan Fisika Kapal: Kontainer di Bay ${bay}, Row ${row}, Tier 84 melayang. Dibutuhkan Tier 82.`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors
  };
};
