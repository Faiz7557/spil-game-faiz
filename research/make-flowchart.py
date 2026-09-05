"""
Generates Gambar "Diagram Alur Penelitian" for Bab 3 of the thesis.

Replaces the manual draw.io -> PNG export step. The content mirrors
research/diagram-alur-penelitian.drawio.xml exactly as of the current naskah,
so the figure and the chapter text agree.

    python research/make-flowchart.py

Outputs (research/figures/):
    alur-penelitian.png   300 dpi, for pasting into Word/Docs
    alur-penelitian.svg   vector, if the template allows it

WHEN THE NASKAH IS CORRECTED, EDIT `PARAMS` BELOW AND RE-RUN.
The audit flagged four values in this figure that will change once Bab 3 is
synchronised with the harness (see docs/ASUMSI.md and research/README.md):

    nominal sigma        0,5   ->  0,30          (DEFAULT_SCENARIO.reeferShare)
    validation layers    V1..V5 ->  V1..V6       (V6 = horizon-edge)
    sensitivity design   50 seed/sel x 5 agen -> 100 seed/sel x 4 agen
    seed split           TEST [300.000, ...) ->  TEST [300.000, 310.000)
                                                 SENS [310.000, ...)

They are deliberately left at the naskah's current values so the figure does
not contradict the chapter it sits in.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

# --- values that must track the naskah ---------------------------------------
PARAMS = {
    "faktor":      "ρ intensitas  ·  σ pangsa REEFER  ·  κ proporsi committed",
    "strata":      "faktorial 4 × 2 × 3 = 24 strata",
    "validasi":    "V1 provenance · V3 distribusional · V4 diskriminatif · V5 sensitivitas",
    "seed_latih":  "seed [0 – 200.000)",
    "seed_val":    "seed [200.000 – 300.000)",
    "seed_uji":    "seed [300.000 – …)  ·  tak pernah dilatihkan",
    "exp_utama":   "kondisi nominal ρ = 0,9 · σ = 0,5 · κ = 0,4\n300 seed × 5 agen",
    "exp_sens":    "faktorial penuh 4 × 2 × 3 = 24 strata\n50 seed per sel × 5 agen",
    "mask":        "37 aksi = 36 slot + tolak muat, dari validSlots()",
}

W, H = 160.0, 292.0                       # drawing units, millimetres

BLUE_F, BLUE_E, BLUE_T = "#dae8fc", "#6c8ebf", "#1f3864"
BLUE_D                 = "#b1ccf5"
RED_F,  RED_E,  RED_T  = "#f8cecc", "#b85450", "#7b1e1e"
GRN_F,  GRN_E,  GRN_T  = "#d5e8d4", "#82b366", "#1e4620"
GRN_D                  = "#a9d18e"
YEL_F,  YEL_E,  YEL_T  = "#fff2cc", "#d6b656", "#7f6000"
YEL_D                  = "#ffd966"
ORG_F,  ORG_E          = "#ffe6cc", "#d79b00"
PUR_F,  PUR_E,  PUR_T  = "#e1d5e7", "#9673a6", "#4b2e63"
ARROW                  = "#4d4d4d"

FAMILY = ["Times New Roman", "DejaVu Serif", "serif"]

fig, ax = plt.subplots(figsize=(W / 25.4, H / 25.4))
ax.set_xlim(0, W)
ax.set_ylim(H, 0)                          # y grows downward
ax.axis("off")
fig.subplots_adjust(left=0, right=1, top=1, bottom=0)


def box(x, y, w, h, fill, edge, *, r=1.6, lw=0.9, dash=None, z=1):
    p = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={r}",
        facecolor=fill, edgecolor=edge, linewidth=lw, zorder=z,
    )
    if dash:
        p.set_linestyle((0, dash))
    ax.add_patch(p)


def label(x, y, w, h, head, sub=None, *, color="#1a1a1a",
          fs=8.6, fs_sub=6.9, bold=True, z=3):
    """Head line centred in the box, optional smaller sub-line under it."""
    cx, cy = x + w / 2, y + h / 2
    if sub is None:
        ax.text(cx, cy, head, ha="center", va="center", zorder=z,
                fontsize=fs, fontweight="bold" if bold else "normal",
                color=color, family=FAMILY, linespacing=1.35)
    else:
        n_sub = sub.count("\n") + 1
        off = (0.85 + 0.9 * (n_sub - 1)) / 2 + 0.55
        ax.text(cx, cy - off, head, ha="center", va="center", zorder=z,
                fontsize=fs, fontweight="bold" if bold else "normal",
                color=color, family=FAMILY, linespacing=1.35)
        ax.text(cx, cy + off + 0.35, sub, ha="center", va="center", zorder=z,
                fontsize=fs_sub, color=color, family=FAMILY, linespacing=1.4)


def band(x, y, w, h, text, fill, edge, tcolor, fs=9.2):
    box(x, y, w, h, fill, edge, r=0.8, lw=1.0, z=2)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", zorder=3,
            fontsize=fs, fontweight="bold", color=tcolor, family=FAMILY)


def arrow(x, y0, y1, *, lw=1.5):
    ax.add_patch(FancyArrowPatch(
        (x, y0), (x, y1), arrowstyle="-|>", mutation_scale=9,
        linewidth=lw, color=ARROW, shrinkA=0, shrinkB=0, zorder=4))


def elbow(x0, y0, x1, y1, *, lw=1.2):
    ax.plot([x0, x0], [y0, (y0 + y1) / 2], color=ARROW, lw=lw, zorder=4)
    ax.plot([x0, x1], [(y0 + y1) / 2, (y0 + y1) / 2], color=ARROW, lw=lw, zorder=4)
    ax.add_patch(FancyArrowPatch(
        (x1, (y0 + y1) / 2), (x1, y1), arrowstyle="-|>", mutation_scale=8,
        linewidth=lw, color=ARROW, shrinkA=0, shrinkB=0, zorder=4))


M, IW = 5.0, 150.0                         # left margin, inner width
CX = W / 2

# ============================ TAHAP 1 =======================================
box(2.5, 1.0, W - 5, 97.5, "#f4f8fe", BLUE_E, r=2.4, lw=1.3, dash=(4, 3), z=0)
band(M, 3.0, IW, 8.5, "TAHAP 1  —  KONSTRUKSI DAN VALIDASI DATASET",
     BLUE_F, BLUE_E, BLUE_T)

rows1 = [
    (14.0, "Formalisasi Masalah sebagai Markov Decision Process",
     "ruang keadaan · ruang aksi · topeng aksi · fungsi transisi · fungsi imbalan", BLUE_F),
    (28.0, "Implementasi Lingkungan Simulasi",
     "port gameEngine.js (JavaScript) → Python", BLUE_F),
    (42.0, "V2  —  Verifikasi Silang JS ↔ Python",
     "pendapatan, jumlah restow, rolled container, dan kas akhir identik", BLUE_F),
    (56.0, "Generator Skenario Terparameterisasi", PARAMS["faktor"], BLUE_F),
    (70.0, "Stratifikasi Skenario", PARAMS["strata"], BLUE_F),
    (84.0, "Validasi Dataset", PARAMS["validasi"], BLUE_D),
]
for y, head, sub, fill in rows1:
    box(M, y, IW, 11.0, fill, BLUE_E)
    label(M, y, IW, 11.0, head, sub)
for y, *_ in rows1[1:]:
    arrow(CX, y - 3.0, y - 0.4)

arrow(CX, 98.5, 102.6)

# ========================= PEMISAHAN DATASET ================================
box(M, 103.0, IW, 10.0, ORG_F, ORG_E)
label(M, 103.0, IW, 10.0, "Pemisahan Dataset",
      "disjoint by construction — pembagian menurut rentang seed")

splits = [
    ("Data Latih",    PARAMS["seed_latih"], YEL_F),
    ("Data Validasi", PARAMS["seed_val"],   YEL_F),
    ("Data Uji",      PARAMS["seed_uji"],   YEL_D),
]
sw, gap = (IW - 2 * 3.0) / 3, 3.0
for i, (head, sub, fill) in enumerate(splits):
    x = M + i * (sw + gap)
    box(x, 117.0, sw, 12.0, fill, YEL_E)
    label(x, 117.0, sw, 12.0, head, sub, fs=8.4, fs_sub=6.4)
    elbow(CX, 113.2, x + sw / 2, 116.6)

arrow(M + 2 * (sw + gap) + sw / 2, 129.2, 133.6)

# ============================ TAHAP 2 =======================================
box(2.5, 134.0, W - 5, 93.0, "#fef6f6", RED_E, r=2.4, lw=1.3, dash=(4, 3), z=0)
band(M, 136.0, IW, 8.5, "TAHAP 2  —  PERANCANGAN AGEN DAN EKSPERIMEN",
     RED_F, RED_E, RED_T)

cw = (IW - 4.0) / 2
lx, rx = M, M + cw + 4.0

box(lx, 147.0, cw, 45.0, "#edf3fc", BLUE_E, r=1.8, lw=1.0, z=1)
band(lx, 147.0, cw, 7.0, "Agen Non-Pembelajar", BLUE_F, BLUE_E, BLUE_T, fs=8.0)
agents = [
    (155.5, "A1  —  Random", "terima/tolak acak, slot sahih acak"),
    (164.5, "A2  —  Rule-based", "ambang tarif + urutan tier"),
    (173.5, "A3  —  Greedy", "skoring slot multi-kriteria"),
    (182.5, "A4  —  Simulated Annealing", "optimasi bayplan, anggaran iterasi dilaporkan"),
]
for y, head, sub in agents:
    box(lx + 2.5, y, cw - 5.0, 8.0, BLUE_F, BLUE_E, r=1.2, lw=0.8, z=2)
    label(lx + 2.5, y, cw - 5.0, 8.0, head, sub, fs=7.6, fs_sub=6.1)

box(rx, 147.0, cw, 45.0, "#eef6ed", GRN_E, r=1.8, lw=1.0, z=1)
band(rx, 147.0, cw, 7.0, "Agen Pembelajar  —  Deep Reinforcement Learning",
     GRN_F, GRN_E, GRN_T, fs=7.4)
box(rx + 2.5, 155.5, cw - 5.0, 9.0, GRN_D, GRN_E, r=1.2, lw=0.8, z=2)
label(rx + 2.5, 155.5, cw - 5.0, 9.0, "A5  —  MaskablePPO",
      "Gymnasium + Stable-Baselines3 (sb3-contrib)", fs=7.8, fs_sub=6.1)
box(rx + 2.5, 166.0, cw - 5.0, 24.5, GRN_F, GRN_E, r=1.2, lw=0.8, z=2)
ax.text(rx + 4.5, 168.2, "Komponen rancangan agen A5", ha="left", va="top",
        zorder=3, fontsize=7.4, fontweight="bold", color="#1a1a1a", family=FAMILY)
comp = [
    "Ruang observasi — encoding grid, kontainer aktif, minggu",
    "Action mask — " + PARAMS["mask"],
    "Fungsi reward — tarif − penalti restow − penalti rolled",
    "Domain randomization — (ρ, σ, κ) diacak tiap episode",
    "Tuning hyperparameter & early stopping pada data validasi",
]
for i, t in enumerate(comp):
    ax.text(rx + 4.5, 172.4 + i * 3.6, "•  " + t, ha="left", va="top",
            zorder=3, fontsize=6.4, color="#1a1a1a", family=FAMILY)

box(M, 196.0, IW, 14.0, "#fffcf0", YEL_E, r=1.8, lw=1.0, z=1)
band(M, 196.0, IW, 6.5,
     "Eksperimen pada Data Uji  —  kelima agen menghadapi skenario identik",
     YEL_F, YEL_E, YEL_T, fs=7.6)
for i, (head, sub) in enumerate([("Eksperimen Utama", PARAMS["exp_utama"]),
                                 ("Eksperimen Sensitivitas (V5)", PARAMS["exp_sens"])]):
    x = M + 2.5 + i * ((IW - 7.0) / 2 + 2.0)
    box(x, 203.4, (IW - 7.0) / 2, 5.4, YEL_F, YEL_E, r=1.0, lw=0.8, z=2)
    ax.text(x + (IW - 7.0) / 4, 204.4, head, ha="center", va="top", zorder=3,
            fontsize=7.4, fontweight="bold", color="#1a1a1a", family=FAMILY)
    ax.text(x + (IW - 7.0) / 4, 207.4, sub.replace("\n", "  ·  "),
            ha="center", va="top", zorder=3, fontsize=6.2,
            color="#1a1a1a", family=FAMILY)

arrow(CX, 192.4, 195.6)
box(M, 214.0, IW, 10.5, RED_F, RED_E)
label(M, 214.0, IW, 10.5, "Pencatatan Variabel Terikat",
      "pendapatan bersih · jumlah restow · rolled container · utilisasi slot\n"
      "waktu komputasi · stabilitas antar-seed",
      fs=8.4, fs_sub=6.4)
arrow(CX, 210.2, 213.6)
arrow(CX, 224.7, 229.6)

# ============================ TAHAP 3 =======================================
box(2.5, 230.0, W - 5, 29.5, "#f8f5fb", PUR_E, r=2.4, lw=1.3, dash=(4, 3), z=0)
band(M, 232.0, IW, 8.0, "TAHAP 3  —  ANALISIS STATISTIK",
     PUR_F, PUR_E, PUR_T)
stats = [
    ("Uji Friedman", "randomized complete block\nseed = blok, agen = perlakuan"),
    ("Kendall’s W", "ukuran efek · konkordansi\nperingkat antar blok"),
    ("Post-hoc Nemenyi", "pasangan mana yang terpisah\ncritical difference diagram"),
]
bw = (IW - 2 * 3.0) / 3
for i, (head, sub) in enumerate(stats):
    x = M + i * (bw + 3.0)
    box(x, 243.0, bw, 13.5, PUR_F, PUR_E)
    label(x, 243.0, bw, 13.5, head, sub, fs=8.0, fs_sub=6.2)

# ============================ KELUARAN ======================================
arrow(CX, 260.0, 264.6)
box(M, 265.0, IW, 11.0, BLUE_F, BLUE_E)
label(M, 265.0, IW, 11.0, "Interpretasi dan Pembahasan",
      "peringkat agen · konsistensi peringkat lintas strata (Kendall’s τ)",
      fs=8.4, fs_sub=6.4)

arrow(CX, 276.2, 280.6)
box(M + 22.0, 281.0, IW - 44.0, 9.5, GRN_D, GRN_E, r=4.5, lw=1.1)
label(M + 22.0, 281.0, IW - 44.0, 9.5, "Kesimpulan dan Saran", fs=9.2)

fig.canvas.draw()
outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures")
os.makedirs(outdir, exist_ok=True)
png = os.path.join(outdir, "alur-penelitian.png")
svg = os.path.join(outdir, "alur-penelitian.svg")
fig.savefig(png, dpi=300, facecolor="white", bbox_inches="tight", pad_inches=0.04)
fig.savefig(svg, facecolor="white", bbox_inches="tight", pad_inches=0.04)
print("wrote", png)
print("wrote", svg)
