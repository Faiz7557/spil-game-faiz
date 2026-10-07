import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// The lobby's hero: a container ship built from primitives on a GPU sea.
// Colours come from the game's CSS tokens (light/dark follow the theme).
// Interaction follows fluid-interface rules: 1:1 drag with momentum,
// rubber-banded pitch, critically damped zoom, instant hover feedback, and a
// still scene when the OS asks for reduced motion.
//
// Units: hull along x (stern -6 → bow +6), y up, +z starboard. Waterline y=0.

// ---------------------------------------------------------------- palette

const cssVar = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

const PORT_CODES = ['SBY', 'MKS', 'JYP', 'MDN'];

const readPalette = () => {
  const dark = document.documentElement.classList.contains('dark');
  return {
    dark,
    sky: cssVar('--g-sky', dark ? '#0F1A1F' : '#F4F8FA'),
    hull: cssVar('--g-hull', '#26404F'),
    red: cssVar('--g-red', '#D21E20'),
    green: cssVar('--g-green', '#2F8A5C'),
    structure: cssVar('--g-structure', '#46545A'),
    ports: PORT_CODES.map((p, i) => cssVar(`--p-${p.toLowerCase()}`, ['#3BA3E6', '#E8B145', '#2FC495', '#E39AC4'][i])),
    // Scene-only colours: the UI tokens are tuned for flat surfaces, water and
    // sky need their own values to read as depth.
    horizon: dark ? '#16303C' : '#DCE8EE',
    deep: dark ? '#0A2230' : '#1A5470',
    shallow: dark ? '#1B4A5C' : '#3A8AAB',
    seaSky: dark ? '#2B5266' : '#B9D6E3',
    sunColor: dark ? '#BFD6FF' : '#FFF1D6',
    sunDir: dark ? new THREE.Vector3(-0.45, 0.32, -1).normalize() : new THREE.Vector3(0.38, 0.42, -1).normalize(),
    bloom: dark ? 0.85 : 0.18
  };
};

// Deterministic pseudo-random so the cargo layout is the same every visit.
const rng = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

// ------------------------------------------------------------ hull shape

const L = 12;
const STERN = -L / 2;
const HALF_BEAM = 1.1;
const KEEL = -0.62;
const DECK = 1.0;
const SECTION_N = 4.2; // superellipse exponent of the hull cross-section

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// t: 0 at the stern, 1 at the bow.
const halfBeamAt = (t) => {
  const bow = t > 0.7 ? Math.pow(Math.max(0, 1 - Math.pow((t - 0.7) / 0.3, 2.2)), 0.62) : 1;
  const stern = 0.9 + 0.1 * smooth(0, 0.12, t);
  return HALF_BEAM * bow * stern;
};
const deckAt = (t) => DECK + 0.32 * Math.pow(smooth(0.68, 1, t), 2);
const keelAt = (t) => KEEL + 0.55 * smooth(0.9, 1, t) + 0.38 * (1 - smooth(0, 0.07, t));
const rakeAt = (t, h) => 0.55 * smooth(0.85, 1, t) * h; // the stem rakes forward
const tAtX = (x) => Math.min(0.999, Math.max(0, (x - STERN) / L));

const sectionPoint = (hb, deck, keel, phi) => {
  const s = Math.sin(phi);
  const z = hb * Math.sign(s) * Math.pow(Math.abs(s), 2 / SECTION_N);
  const y = deck - (deck - keel) * Math.pow(Math.abs(Math.cos(phi)), 2 / SECTION_N);
  return [z, y];
};

// -------------------------------------------------------------- waves
// One wave set drives the GPU sea and the ship's heave/pitch/roll, so the
// hull rides the very swell the player sees.

const WAVES = [
  // dirX, dirZ, steepness, wavelength
  [1.0, 0.25, 0.1, 9.0],
  [0.55, 0.85, 0.08, 6.0],
  [-0.3, 1.0, 0.06, 3.6],
  [0.9, -0.5, 0.04, 2.3]
];

const waveHeightJS = (x, z, time, flow) => {
  let y = 0;
  for (const [dx, dz, steep, len] of WAVES) {
    const k = (Math.PI * 2) / len;
    const c = Math.sqrt(9.8 / k);
    const n = Math.hypot(dx, dz);
    const f = k * ((dx / n) * (x + flow) + (dz / n) * z - c * time);
    y += (steep / k) * Math.sin(f);
  }
  return y;
};

const WAVE_GLSL = WAVES.map(([dx, dz, s, l]) => `vec4(${dx.toFixed(3)}, ${dz.toFixed(3)}, ${s.toFixed(3)}, ${l.toFixed(3)})`).join(', ');

const seaVertex = /* glsl */ `
  uniform float uTime;
  uniform float uFlow;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;
  #include <fog_pars_vertex>

  vec3 gerstner(vec4 w, vec3 p, inout vec3 tangent, inout vec3 binormal) {
    float k = 6.28318 / w.w;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(w.xy);
    float f = k * (dot(d, p.xz + vec2(uFlow, 0.0)) - c * uTime);
    float a = w.z / k;
    tangent += vec3(-d.x * d.x * (w.z * sin(f)), d.x * (w.z * cos(f)), -d.x * d.y * (w.z * sin(f)));
    binormal += vec3(-d.x * d.y * (w.z * sin(f)), d.y * (w.z * cos(f)), -d.y * d.y * (w.z * sin(f)));
    return vec3(d.x * (a * cos(f)), a * sin(f), d.y * (a * cos(f)));
  }

  void main() {
    vec4 waves[4] = vec4[4](${WAVE_GLSL});
    vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 g = p;
    vec3 t = vec3(1.0, 0.0, 0.0);
    vec3 b = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < 4; i++) g += gerstner(waves[i], p, t, b);
    vNormal = normalize(cross(b, t));
    vCrest = g.y;
    vWorld = g;
    vec4 mvPosition = viewMatrix * vec4(g, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const seaFragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunCol;
  uniform vec3 uSunDir;
  uniform float uSpec;
  uniform float uTime;
  uniform float uFlow;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;
  #include <fog_pars_fragment>

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 col = mix(uDeep, uShallow, clamp(vCrest * 2.2 + 0.45, 0.0, 1.0));
    col = mix(col, uSky, fres * 0.8);

    // Sun (or moon) glitter path.
    vec3 h = normalize(uSunDir + v);
    float spec = (pow(max(dot(n, h), 0.0), 260.0) * 2.0 + pow(max(dot(n, h), 0.0), 70.0) * 0.05) * uSpec;
    col += uSunCol * spec;

    // Foam: wave crests, a collar around the hull, and the wake astern.
    vec2 q = vWorld.xz;
    float grain = noise(q * 3.0 + vec2(uFlow * 0.8, uTime * 0.3)) * 0.6 + noise(q * 9.0 - uTime * 0.5) * 0.4;
    float crest = smoothstep(0.15, 0.24, vCrest) * grain * 0.6;
    float e = pow(q.x / 6.5, 2.0) + pow(q.y / 1.35, 2.0);
    float collar = (1.0 - smoothstep(1.0, 1.45, e)) * smoothstep(0.82, 1.0, e) * grain;
    float behind = -6.0 - q.x;
    float spread = 1.0 + behind * 0.22;
    float wake = step(0.0, behind) * (1.0 - smoothstep(0.0, 26.0, behind)) * (1.0 - smoothstep(spread * 0.55, spread, abs(q.y)));
    wake *= noise(vec2(q.x * 1.6 + uFlow * 1.6, q.y * 2.5)) * 0.9 + 0.1;
    float foam = clamp(crest * 0.55 + collar * 0.9 + wake * 0.75, 0.0, 1.0);
    col = mix(col, vec3(0.93, 0.96, 0.97), foam * 0.75);

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`;

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunCol;
  uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.38, h));
    float s = max(dot(d, uSunDir), 0.0);
    col += uSunCol * (pow(s, 900.0) * 3.0 + pow(s, 24.0) * 0.28 + pow(s, 4.0) * 0.08);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const smokeVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * mv;
  }
`;

const smokeFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(uColor, a);
  }
`;

// ------------------------------------------------------------- textures

const canvasTexture = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

// Corrugated steel: dark ribs on white, multiplied by each box colour.
const corrugationTexture = () =>
  canvasTexture(128, 32, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 32);
    g.fillStyle = 'rgba(0,0,0,0.16)';
    for (let x = 0; x < 128; x += 6) g.fillRect(x, 0, 2, 32);
    g.fillStyle = 'rgba(0,0,0,0.24)';
    g.fillRect(0, 0, 128, 2);
    g.fillRect(0, 30, 128, 2);
  });

const windowTexture = (lit) =>
  canvasTexture(256, 128, (g) => {
    g.fillStyle = lit ? '#000000' : '#E9EEF0';
    g.fillRect(0, 0, 256, 128);
    for (let row = 0; row < 5; row++) {
      for (let x = 10; x < 246; x += 22) {
        g.fillStyle = lit && (x * 7 + row * 13) % 5 !== 0 ? '#ffd9a0' : '#2b4150';
        g.fillRect(x, 14 + row * 23, 14, 9);
      }
    }
  });

const textTexture = (lines, { w = 1024, h = 256, size = 150, weight = 800, spacing = 18 } = {}) =>
  canvasTexture(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lh = h / lines.length;
    lines.forEach((line, i) => {
      g.font = `${weight} ${i === 0 ? size : size * 0.55}px "Outfit", "Inter", sans-serif`;
      if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
      g.fillText(line, w / 2, lh * (i + 0.5));
    });
  });

// -------------------------------------------------------------- builders

function buildHull(colors) {
  const STATIONS = 72;
  const ARC = 32;
  const pos = [];
  const col = [];
  const idx = [];
  const red = new THREE.Color(colors.red).multiplyScalar(0.82);
  const hull = new THREE.Color(colors.hull);
  const stripe = new THREE.Color('#E8EDEF');

  for (let i = 0; i <= STATIONS; i++) {
    const t = i / STATIONS;
    const hb = halfBeamAt(t);
    const deck = deckAt(t);
    const keel = keelAt(t);
    for (let j = 0; j <= ARC; j++) {
      const [z, y] = sectionPoint(hb, deck, keel, (j / ARC - 0.5) * Math.PI);
      const h = (y - keel) / (deck - keel);
      pos.push(STERN + t * L + rakeAt(t, h), y, z);
      const tint = y < 0.14 ? red : y > 0.17 && y < 0.23 ? stripe : hull;
      col.push(tint.r, tint.g, tint.b);
    }
  }
  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < ARC; j++) {
      const a = i * (ARC + 1) + j;
      const b = a + ARC + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide }));
}

function buildDeck(colors) {
  const shape = new THREE.Shape();
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = STERN + t * L + rakeAt(t, 1);
    if (i === 0) shape.moveTo(x, -halfBeamAt(t) * 0.97);
    else shape.lineTo(x, -halfBeamAt(t) * 0.97);
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    shape.lineTo(STERN + t * L + rakeAt(t, 1), halfBeamAt(t) * 0.97);
  }
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2);
  const deck = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colors.dark ? '#2F3D3A' : '#7F8F8A', roughness: 0.9, side: THREE.DoubleSide }));
  deck.position.y = DECK - 0.01;
  return deck;
}

function buildTransom(colors) {
  const shape = new THREE.Shape();
  const ARC = 32;
  for (let j = 0; j <= ARC; j++) {
    const [z, y] = sectionPoint(halfBeamAt(0), DECK, keelAt(0), (j / ARC - 0.5) * Math.PI);
    if (j === 0) shape.moveTo(z, y);
    else shape.lineTo(z, y);
  }
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateY(Math.PI / 2);
  geo.translate(STERN, 0, 0);
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colors.hull, roughness: 0.55, side: THREE.DoubleSide }));
}

// Painted lettering on the hull: big SPIL amidships, name at bow and stern.
function buildLettering() {
  const g = new THREE.Group();
  const decal = (tex) =>
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const spil = textTexture(['SPIL'], { size: 200, spacing: 40 });
  const name = textTexture(['SPIL CITRA'], { size: 120, spacing: 14 });
  const sternName = textTexture(['SPIL CITRA', 'SURABAYA'], { h: 384, size: 120, spacing: 12 });

  [1, -1].forEach((side) => {
    const big = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), decal(spil));
    big.position.set(0.9, 0.6, side * (HALF_BEAM + 0.006));
    if (side < 0) big.rotation.y = Math.PI;
    g.add(big);
    const t = 0.88;
    const bow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.27), decal(name));
    bow.position.set(STERN + t * L + 0.05, deckAt(t) - 0.2, side * (halfBeamAt(t) + 0.02));
    bow.rotation.y = side < 0 ? Math.PI + 0.32 : -0.32;
    g.add(bow);
  });
  const stern = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.48), decal(sternName));
  stern.position.set(STERN - 0.006, 0.55, 0);
  stern.rotation.y = -Math.PI / 2;
  g.add(stern);
  return g;
}

function buildCargo(colors) {
  const group = new THREE.Group();
  const rand = rng(7);
  const BOX_L = 0.92;
  const BOX_W = 0.29;
  const BOX_H = 0.29;
  const ROWS = 7;
  const bays = [];
  for (let x = -2.55; x < 4.4; x += 1.0) bays.push(x);

  const boxGeo = new THREE.BoxGeometry(BOX_L, BOX_H * 0.96, BOX_W * 0.94);
  const boxMat = new THREE.MeshStandardMaterial({ map: corrugationTexture(), roughness: 0.5, metalness: 0.2 });
  const boxes = new THREE.InstancedMesh(boxGeo, boxMat, bays.length * ROWS * 5);
  const hatchMat = new THREE.MeshStandardMaterial({ color: colors.structure, roughness: 0.8 });
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const meta = [];
  const neutrals = ['#B9C3C8', '#5E6E76'];
  let n = 0;

  bays.forEach((bx, bi) => {
    const t = tAtX(bx + BOX_L / 2);
    const hb = halfBeamAt(t) * 0.95;
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(BOX_L + 0.04, 0.05, hb * 2 - 0.08), hatchMat);
    hatch.position.set(bx, deckAt(t) + 0.025, 0);
    group.add(hatch);
    // 40ft bays are even-numbered from the bow: the bow bay is 02.
    const bayLabel = String(2 + 4 * (bays.length - 1 - bi)).padStart(2, '0');

    for (let r = 0; r < ROWS; r++) {
      const k = r - (ROWS - 1) / 2;
      const z = k * BOX_W;
      if (Math.abs(z) + BOX_W / 2 > hb) continue;
      // Odd rows to starboard (+z), even to port, 00 on the centreline.
      const rowLabel = k === 0 ? '00' : String(k > 0 ? 2 * k - 1 : -2 * k).padStart(2, '0');
      const centre = 1 - Math.abs(k) / ROWS;
      const mid = 1 - Math.abs(bi - (bays.length - 1) / 2) / bays.length;
      const tiers = Math.max(1, Math.min(5, Math.round(1.4 + centre * 2.4 + mid * 1.6 + (rand() - 0.5) * 1.4)));
      for (let tier = 0; tier < tiers; tier++) {
        m.makeTranslation(bx, deckAt(t) + 0.05 + BOX_H / 2 + tier * BOX_H, z);
        boxes.setMatrixAt(n, m);
        const empty = rand() > 0.84;
        const portIdx = Math.floor(rand() * 4);
        c.set(empty ? neutrals[Math.floor(rand() * neutrals.length)] : colors.ports[portIdx]);
        c.offsetHSL(0, -0.06, (rand() - 0.5) * 0.06);
        boxes.setColorAt(n, c);
        meta.push({ port: empty ? null : PORT_CODES[portIdx], bay: bayLabel, row: rowLabel, tier: String(82 + tier * 2), color: c.clone() });
        n++;
      }
    }
  });
  boxes.count = n;
  boxes.instanceMatrix.needsUpdate = true;
  if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true;
  boxes.name = 'cargo';
  boxes.userData.meta = meta;
  group.add(boxes);

  // Lashing bridges between bays.
  bays.slice(1).forEach((bx) => {
    const t = tAtX(bx);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, halfBeamAt(t) * 1.9), hatchMat);
    bridge.position.set(bx - 0.5, deckAt(t) + 0.3, 0);
    group.add(bridge);
  });
  return group;
}

const SUPER_X = -4.35;

function buildSuperstructure(colors) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#E9EEF0', roughness: 0.5, metalness: 0.05 });
  const lit = colors.dark;
  const winTex = windowTexture(lit);
  const windows = new THREE.MeshStandardMaterial(
    lit
      ? { color: '#E9EEF0', roughness: 0.5, emissive: '#ffcf8a', emissiveMap: winTex, emissiveIntensity: 2.2 }
      : { map: winTex, roughness: 0.4 }
  );
  const trim = new THREE.MeshStandardMaterial({ color: colors.structure, roughness: 0.7 });
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z. +x faces the bow.
  const faces = [windows, white, white, white, windows, windows];
  const x0 = SUPER_X;

  const block = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.55, 1.8), faces);
  block.position.set(x0, DECK + 0.78, 0);
  g.add(block);
  // Deck edges ring the block like balconies.
  [0.42, 0.8, 1.18].forEach((h) => {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(1.31, 0.03, 1.86), trim);
    ring.position.set(x0, DECK + h, 0);
    g.add(ring);
  });
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 1.5), faces);
  upper.position.set(x0 - 0.05, DECK + 1.83, 0);
  g.add(upper);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 2.3), faces);
  bridge.position.set(x0 + 0.12, DECK + 2.25, 0);
  g.add(bridge);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 2.36), trim);
  roof.position.set(x0 + 0.12, DECK + 2.43, 0);
  g.add(roof);

  // Radar mast with a turning scanner.
  const mastMat = new THREE.MeshStandardMaterial({ color: '#D7DDE0', roughness: 0.4, metalness: 0.3 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.75), mastMat);
  mast.position.set(x0 + 0.05, DECK + 2.8, 0);
  g.add(mast);
  const yard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.7), mastMat);
  yard.position.set(x0 + 0.05, DECK + 3.0, 0);
  g.add(yard);
  const radar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: '#2A3A42' }));
  radar.position.set(x0 + 0.05, DECK + 2.62, 0);
  radar.name = 'radar';
  g.add(radar);

  // Funnel: oval stack, SPIL red band, black top.
  const funnel = new THREE.Group();
  funnel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.95, 32), white));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.287, 0.297, 0.28, 32), new THREE.MeshStandardMaterial({ color: colors.red, roughness: 0.45 }));
  band.position.y = 0.12;
  funnel.add(band);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32), new THREE.MeshStandardMaterial({ color: '#1A2226' }));
  cap.position.y = 0.53;
  funnel.add(cap);
  funnel.scale.set(1, 1, 0.62);
  funnel.position.set(x0 - 0.95, DECK + 1.95, 0);
  g.add(funnel);

  // Lifeboats on davits, one each side.
  const boatMat = new THREE.MeshStandardMaterial({ color: '#F08A24', roughness: 0.5 });
  [1, -1].forEach((side) => {
    const boat = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 6, 12), boatMat);
    boat.rotation.z = Math.PI / 2;
    boat.position.set(x0 - 0.15, DECK + 1.36, side * 1.02);
    g.add(boat);
    [-0.22, 0.22].forEach((dx) => {
      const davit = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.03), trim);
      davit.position.set(x0 - 0.15 + dx, DECK + 1.5, side * 0.95);
      g.add(davit);
    });
  });

  // Navigation lights: red to port, green to starboard, white masthead.
  const light = (color, x, y, z) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3) }));
    s.position.set(x, y, z);
    g.add(s);
  };
  light('#ff4b3e', x0 + 0.15, DECK + 2.3, -1.17);
  light('#3ee58a', x0 + 0.15, DECK + 2.3, 1.17);
  light('#ffffff', x0 + 0.05, DECK + 3.2, 0);
  return g;
}

function buildForecastle() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#D7DDE0', roughness: 0.4, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2A3A42', roughness: 0.6 });
  const t = 0.93;
  const x = STERN + t * L + 0.1;
  const deck = deckAt(t);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.1), steel);
  pole.position.set(x, deck + 0.55, 0);
  g.add(pole);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(3) }));
  lamp.position.set(x, deck + 1.12, 0);
  g.add(lamp);
  // Mooring winches and bollards.
  [-0.35, 0.35].forEach((z) => {
    const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), dark);
    winch.rotation.x = Math.PI / 2;
    winch.position.set(x - 0.7, deck + 0.1, z);
    g.add(winch);
    [-0.25, 0].forEach((dx) => {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 10), steel);
      bollard.position.set(x - 0.2 + dx, deck + 0.05, z * 1.7);
      g.add(bollard);
    });
  });
  // Bulbous bow below the waterline.
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshStandardMaterial({ color: '#A8251F', roughness: 0.55 }));
  bulb.scale.set(1.9, 0.72, 0.72);
  bulb.position.set(STERN + L - 0.2, -0.28, 0);
  g.add(bulb);
  return g;
}

function buildGulls(colors) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colors.dark ? '#AFC0C8' : '#F4F6F7', roughness: 0.7, side: THREE.DoubleSide });
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.08, 0, 0.32, 0.1, 0, 0.22], 3));
  wing.computeVertexNormals();
  const rand = rng(31);
  for (let i = 0; i < 6; i++) {
    const gull = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 4, 6), mat);
    body.rotation.z = Math.PI / 2;
    gull.add(body);
    const left = new THREE.Mesh(wing, mat);
    const right = new THREE.Mesh(wing, mat);
    right.scale.z = -1;
    gull.add(left, right);
    gull.userData = { left, right, radius: 5 + rand() * 5, speed: 0.12 + rand() * 0.12, phase: rand() * 6.28, height: 3.6 + rand() * 2.2, cx: -1 + rand() * 3, flap: 5 + rand() * 3 };
    group.add(gull);
  }
  return group;
}

function buildSmoke(colors) {
  const COUNT = 70;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(new Float32Array(COUNT), 1));
  geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(new Float32Array(COUNT), 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(colors.dark ? '#6F7F86' : '#9AA6AB') }, uScale: { value: 300 } },
    vertexShader: smokeVertex,
    fragmentShader: smokeFragment,
    transparent: true,
    depthWrite: false
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.particles = Array.from({ length: COUNT }, (_, i) => ({ age: (i / COUNT) * 6, life: 6 }));
  return points;
}

function buildStars() {
  const rand = rng(99);
  const pos = [];
  for (let i = 0; i < 700; i++) {
    const az = rand() * Math.PI * 2;
    const el = 0.06 + Math.pow(rand(), 0.7) * 1.4;
    pos.push(Math.cos(el) * Math.cos(az) * 340, Math.sin(el) * 340, Math.cos(el) * Math.sin(az) * 340);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: '#d6e4ff', size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: false, depthWrite: false }));
}

const disposeTree = (root) => {
  root.traverse((o) => {
    o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat) => {
      if (!mat) return;
      mat.map?.dispose();
      mat.emissiveMap?.dispose();
      mat.dispose();
    });
  });
};

// ------------------------------------------------------------- hotspots

const HOTSPOTS = [
  { label: 'Anjungan', note: 'Ruang kemudi dan navigasi kapal', pos: [SUPER_X + 0.4, DECK + 2.45, 0] },
  { label: 'Cerobong', note: 'Gas buang mesin utama, bergaris merah SPIL', pos: [SUPER_X - 0.95, DECK + 2.6, 0] },
  { label: 'Bay kontainer', note: 'Disusun per bay · row · tier, seperti di bayplan', pos: [0.95, DECK + 1.75, 0] },
  { label: 'Haluan · bay 02', note: 'Bay bernomor kecil berada di depan kapal', pos: [STERN + L - 0.5, DECK + 0.55, 0] },
  { label: 'Garis air', note: 'Kapal tenggelam lebih dalam saat muatan bertambah', pos: [2.4, 0.18, HALF_BEAM], normal: [0, 0, 1] }
];

// Rubber-band past a bound: the further out, the less it follows.
const rubberband = (over, dim, k = 0.55) => (over * dim * k) / (dim + k * Math.abs(over));
const PITCH_MIN = 0.06;
const PITCH_MAX = 0.85;
const HOME = { yaw: 0.42, pitch: 0.27, zoom: 1 };

export default function ShipScene({ busy = false, className = '' }) {
  const rootRef = useRef(null);
  const mountRef = useRef(null);
  const tipRef = useRef(null);
  const hotRefs = useRef([]);
  const busyRef = useRef(busy);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- renderer, post, environment
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const dpr = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 800);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.55, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // Adaptive quality: software renderers start low; anything else drops to
    // low if the first seconds run under ~30fps. Low = no bloom, no shadows,
    // 1x pixel ratio.
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    let lowQuality = /SwiftShader|Basic Render|llvmpipe|Software/i.test(gpu);
    const applyQuality = () => {
      const ratio = lowQuality ? 1 : dpr;
      renderer.setPixelRatio(ratio);
      composer.setPixelRatio(ratio);
      bloom.enabled = !lowQuality;
      renderer.shadowMap.enabled = !lowQuality;
      scene.traverse((o) => {
        if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
      });
    };

    // ---- world (rebuilt on theme change)
    let world = null;
    let ship = null;
    let radar = null;
    let cargo = null;
    let gulls = null;
    let smoke = null;
    let seaMat = null;
    const funnelTop = new THREE.Vector3(SUPER_X - 0.95, DECK + 2.5, 0);

    const build = () => {
      if (world) {
        disposeTree(world);
        scene.remove(world);
      }
      const colors = readPalette();
      // The sea plane ends at 200 units; fog it out well before that.
      scene.fog = new THREE.Fog(colors.horizon, 40, 120);
      scene.background = new THREE.Color(colors.sky);
      scene.environmentIntensity = colors.dark ? 0.3 : 0.55;
      renderer.toneMappingExposure = colors.dark ? 1.05 : 1.0;
      bloom.strength = colors.bloom;

      world = new THREE.Group();

      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(380, 48, 24),
        new THREE.ShaderMaterial({
          uniforms: {
            uTop: { value: new THREE.Color(colors.sky) },
            uHorizon: { value: new THREE.Color(colors.horizon) },
            uSunCol: { value: new THREE.Color(colors.sunColor) },
            uSunDir: { value: colors.sunDir }
          },
          vertexShader: skyVertex,
          fragmentShader: skyFragment,
          side: THREE.BackSide,
          depthWrite: false
        })
      );
      world.add(sky);
      if (colors.dark) world.add(buildStars());

      world.add(new THREE.HemisphereLight(colors.dark ? '#8fa9b8' : '#ffffff', colors.deep, colors.dark ? 0.55 : 0.75));
      // Key light from the viewer's side casts the shadows; the sun/moon sits
      // behind the ship for the glitter path and a rim on the containers.
      const key = new THREE.DirectionalLight(colors.dark ? '#cfe0ff' : '#fff6ea', colors.dark ? 1.1 : 1.7);
      key.position.set(7, 11, 9);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 1, far: 40 });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      world.add(key);
      const sun = new THREE.DirectionalLight(colors.sunColor, colors.dark ? 0.9 : 1.1);
      sun.position.copy(colors.sunDir).multiplyScalar(30);
      world.add(sun);
      const rim = new THREE.DirectionalLight(colors.green, colors.dark ? 0.9 : 0.35);
      rim.position.set(-8, 3, -6);
      world.add(rim);

      ship = new THREE.Group();
      ship.add(buildHull(colors), buildDeck(colors), buildTransom(colors), buildLettering());
      const cargoGroup = buildCargo(colors);
      cargo = cargoGroup.getObjectByName('cargo');
      ship.add(cargoGroup);
      const sup = buildSuperstructure(colors);
      radar = sup.getObjectByName('radar');
      ship.add(sup, buildForecastle());
      ship.traverse((o) => {
        if (o.isMesh && !o.material.transparent) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      world.add(ship);

      const seaGeo = new THREE.PlaneGeometry(400, 400, 240, 240);
      seaGeo.rotateX(-Math.PI / 2);
      seaMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uFlow: { value: 0 },
            uDeep: { value: new THREE.Color(colors.deep) },
            uShallow: { value: new THREE.Color(colors.shallow) },
            uSky: { value: new THREE.Color(colors.seaSky) },
            uSunCol: { value: new THREE.Color(colors.sunColor) },
            uSunDir: { value: colors.sunDir },
            uSpec: { value: colors.dark ? 0.45 : 1 }
          }
        ]),
        vertexShader: seaVertex,
        fragmentShader: seaFragment,
        fog: true
      });
      world.add(new THREE.Mesh(seaGeo, seaMat));

      gulls = buildGulls(colors);
      world.add(gulls);
      smoke = buildSmoke(colors);
      world.add(smoke);
      scene.add(world);
    };
    build();

    // ---- framing: the form covers the left ~520px on wide screens, so the
    // ship centres in the space that is left and the camera pulls back until
    // the hull fits it.
    const PANEL_PX = 520;
    const SHIP_SPAN = 12;
    let baseDist = 24;
    let portrait = false;
    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = width / height;
      portrait = camera.aspect < 0.9;
      const wide = width >= 1024;
      const free = wide ? width - PANEL_PX : width;
      if (wide) camera.setViewOffset(width, height, -PANEL_PX / 2, 0, width, height);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      const tanHalfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      baseDist = Math.min(70, Math.max(16, (SHIP_SPAN * width) / (0.85 * free * 2 * tanHalfH)));
      if (smoke) smoke.material.uniforms.uScale.value = height * dpr * 0.9;
    };
    applyQuality();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    const perf = { frames: 0, time: 0, decided: lowQuality };

    // ---- orbit state: drag 1:1, momentum on release, rubber-band pitch,
    // critically damped zoom.
    const orbit = {
      yaw: HOME.yaw,
      pitch: HOME.pitch,
      zoom: HOME.zoom,
      zoomTarget: HOME.zoom,
      yawVel: 0,
      pitchVel: 0,
      dragging: false,
      lastInput: -1e9,
      history: []
    };
    const pointers = new Map();
    let pinchStart = 0;
    let pinchZoom = 1;
    const ndc = new THREE.Vector2(9, 9);
    let hoverDirty = false;
    let insideCanvas = false;

    const setCursor = (c) => {
      mount.style.cursor = c;
    };
    setCursor('grab');

    const onDown = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      mount.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        pinchZoom = orbit.zoomTarget;
      }
      orbit.dragging = true;
      orbit.yawVel = 0;
      orbit.pitchVel = 0;
      orbit.history = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      orbit.lastInput = performance.now();
      setCursor('grabbing');
    };
    const onMove = (e) => {
      const rect = mount.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      hoverDirty = true;
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      orbit.lastInput = performance.now();
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart > 0) orbit.zoomTarget = THREE.MathUtils.clamp(pinchZoom * (pinchStart / d), 0.6, 1.5);
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      orbit.yaw -= dx * 0.006;
      orbit.pitch += dy * 0.004;
      orbit.history.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (orbit.history.length > 6) orbit.history.shift();
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size > 0) return;
      orbit.dragging = false;
      pinchStart = 0;
      // Hand the finger's velocity to the momentum (rad/s).
      const h = orbit.history;
      if (h.length >= 2) {
        const a = h[0];
        const b = h[h.length - 1];
        const dt = Math.max(16, b.t - a.t) / 1000;
        if (performance.now() - b.t < 80) {
          orbit.yawVel = (-(b.x - a.x) * 0.006) / dt;
          orbit.pitchVel = ((b.y - a.y) * 0.004) / dt;
        }
      }
      setCursor('grab');
    };
    const onWheel = (e) => {
      e.preventDefault();
      orbit.zoomTarget = THREE.MathUtils.clamp(orbit.zoomTarget * Math.exp(e.deltaY * 0.0012), 0.6, 1.5);
      orbit.lastInput = performance.now();
    };
    const onDouble = () => {
      orbit.yawVel = 0;
      orbit.pitchVel = 0;
      orbit.zoomTarget = HOME.zoom;
      orbit.lastInput = -1e9; // let the home spring take over right away
    };
    const onEnter = () => {
      insideCanvas = true;
    };
    const onLeave = () => {
      insideCanvas = false;
      ndc.set(9, 9);
      hoverDirty = true;
    };
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('pointermove', onMove);
    mount.addEventListener('pointerup', onUp);
    mount.addEventListener('pointercancel', onUp);
    mount.addEventListener('wheel', onWheel, { passive: false });
    mount.addEventListener('dblclick', onDouble);
    mount.addEventListener('pointerenter', onEnter);
    mount.addEventListener('pointerleave', onLeave);

    // Gentle parallax from the cursor anywhere on the page.
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    const onWindowMove = (e) => {
      parallax.tx = (e.clientX / window.innerWidth) * 2 - 1;
      parallax.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onWindowMove);

    // ---- hover: highlight one container and show its slot
    const raycaster = new THREE.Raycaster();
    const tmpM = new THREE.Matrix4();
    const lift = new THREE.Matrix4().makeTranslation(0, 0.07, 0);
    let hovered = -1;
    const tip = tipRef.current;
    const setHover = (id) => {
      if (id === hovered || !cargo) return;
      const meta = cargo.userData.meta;
      if (hovered >= 0 && hovered < cargo.count) {
        cargo.getMatrixAt(hovered, tmpM);
        tmpM.premultiply(new THREE.Matrix4().makeTranslation(0, -0.07, 0));
        cargo.setMatrixAt(hovered, tmpM);
        cargo.setColorAt(hovered, meta[hovered].color);
      }
      hovered = id;
      if (id >= 0) {
        cargo.getMatrixAt(id, tmpM);
        tmpM.premultiply(lift);
        cargo.setMatrixAt(id, tmpM);
        cargo.setColorAt(id, meta[id].color.clone().offsetHSL(0, 0.08, 0.14));
        const m = meta[id];
        tip.querySelector('[data-port]').textContent = m.port || 'MT';
        tip.querySelector('[data-port]').style.background = m.port ? `var(--p-${m.port.toLowerCase()})` : 'var(--g-faint)';
        tip.querySelector('[data-dest]').textContent = m.port ? `Tujuan ${m.port}` : 'Kontainer kosong';
        tip.querySelector('[data-slot]').textContent = `${m.bay}-${m.row}-${m.tier}`;
        tip.style.opacity = '1';
        setCursor('pointer');
      } else {
        tip.style.opacity = '0';
        if (!orbit.dragging) setCursor('grab');
      }
      cargo.instanceMatrix.needsUpdate = true;
      if (cargo.instanceColor) cargo.instanceColor.needsUpdate = true;
    };

    // ---- animation
    const clock = new THREE.Clock();
    const motion = reduced ? 0 : 1;
    let time = 0;
    let flow = 0;
    let dolly = 0;
    const introStart = performance.now();
    const INTRO_MS = reduced ? 0 : 2800;
    const tmpV = new THREE.Vector3();
    const tmpN = new THREE.Vector3();
    const camDir = new THREE.Vector3();

    const step = () => {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const now = performance.now();
      // Sample frame time between 1s and 4s after mount, then decide once.
      if (!perf.decided && now - introStart > 1000) {
        perf.frames++;
        perf.time += rawDt;
        if (now - introStart > 4000) {
          perf.decided = true;
          if (perf.time / perf.frames > 1 / 30) {
            lowQuality = true;
            applyQuality();
            resize();
          }
        }
      }
      const speed = busyRef.current ? 2.2 : 1;
      time += dt * motion * speed;
      flow += dt * motion * 0.9 * speed;
      dolly += ((busyRef.current ? 1 : 0) - dolly) * (1 - Math.exp(-dt * 3));

      // Momentum: exponential decay (≈0.998 per ms) once released.
      if (!orbit.dragging) {
        const decay = Math.pow(0.996, dt * 1000);
        orbit.yaw += orbit.yawVel * dt;
        orbit.pitch += orbit.pitchVel * dt;
        orbit.yawVel *= decay;
        orbit.pitchVel *= decay;
        // Out of bounds: critically damped spring back to the edge.
        const edge = THREE.MathUtils.clamp(orbit.pitch, PITCH_MIN, PITCH_MAX);
        if (edge !== orbit.pitch) {
          orbit.pitchVel *= 0.6;
          orbit.pitch += (edge - orbit.pitch) * (1 - Math.exp(-dt * 12));
        }
        // After a while untouched, drift home with a slow breathing sway.
        if (now - orbit.lastInput > 6000 && motion) {
          const homeYaw = HOME.yaw + Math.sin(time * 0.07) * 0.12;
          let diff = homeYaw - orbit.yaw;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          orbit.yaw += diff * (1 - Math.exp(-dt * 0.6));
          orbit.pitch += (HOME.pitch - orbit.pitch) * (1 - Math.exp(-dt * 0.6));
          orbit.zoomTarget += (HOME.zoom - orbit.zoomTarget) * (1 - Math.exp(-dt * 0.6));
        } else if (now - orbit.lastInput > 6000) {
          orbit.yaw = HOME.yaw;
          orbit.pitch = HOME.pitch;
          orbit.zoomTarget = HOME.zoom;
        }
      }
      orbit.zoom += (orbit.zoomTarget - orbit.zoom) * (1 - Math.exp(-dt * 8));

      parallax.x += (parallax.tx - parallax.x) * (1 - Math.exp(-dt * 2.5));
      parallax.y += (parallax.ty - parallax.y) * (1 - Math.exp(-dt * 2.5));

      // Cinematic intro: swing in from high astern, ease-out.
      const p = INTRO_MS ? Math.min(1, (now - introStart) / INTRO_MS) : 1;
      const intro = 1 - Math.pow(1 - p, 3);
      let pitch = orbit.pitch;
      if (orbit.dragging && (pitch < PITCH_MIN || pitch > PITCH_MAX)) {
        const bound = pitch < PITCH_MIN ? PITCH_MIN : PITCH_MAX;
        pitch = bound + rubberband(pitch - bound, 1);
      }
      const yaw = orbit.yaw + (portrait ? 0.5 : 0) + parallax.x * 0.08 * motion + (1 - intro) * 1.3;
      const el = pitch - parallax.y * 0.03 * motion + (1 - intro) * 0.45;
      const dist = (baseDist * orbit.zoom - dolly * 4) * (1 + (1 - intro) * 0.9);
      camera.position.set(Math.sin(yaw) * Math.cos(el) * dist, Math.sin(el) * dist + 0.4, Math.cos(yaw) * Math.cos(el) * dist);
      camera.lookAt(0, 1.1, 0);

      // Ship rides the swell: heave, pitch and roll from the same waves.
      if (ship) {
        const hb = waveHeightJS(5.2, 0, time, flow);
        const hs = waveHeightJS(-5.2, 0, time, flow);
        const hp = waveHeightJS(0, -1.1, time, flow);
        const hS = waveHeightJS(0, 1.1, time, flow);
        ship.position.y = ((hb + hs + hp + hS) / 4) * 0.6 - 0.02;
        ship.rotation.z = Math.atan2(hb - hs, 10.4) * 0.5;
        ship.rotation.x = Math.atan2(hp - hS, 2.2) * 0.35;
      }
      if (radar) radar.rotation.y = time * 1.6;
      if (seaMat) {
        seaMat.uniforms.uTime.value = time;
        seaMat.uniforms.uFlow.value = flow;
      }

      // Seagulls circle and flap.
      if (gulls) {
        gulls.children.forEach((gull) => {
          const u = gull.userData;
          const a = time * u.speed + u.phase;
          gull.position.set(u.cx + Math.cos(a) * u.radius, u.height + Math.sin(time * 0.5 + u.phase) * 0.3, Math.sin(a) * u.radius * 0.7);
          gull.rotation.y = -a;
          gull.rotation.z = 0.25;
          const flapA = Math.sin(time * u.flap + u.phase) * 0.6;
          u.left.rotation.x = flapA;
          u.right.rotation.x = -flapA;
        });
      }

      // Funnel smoke drifts aft (the ship is under way).
      if (smoke && ship) {
        const src = tmpV.copy(funnelTop).applyMatrix4(ship.matrixWorld);
        const pos = smoke.geometry.attributes.position;
        const size = smoke.geometry.attributes.aSize;
        const alpha = smoke.geometry.attributes.aAlpha;
        smoke.userData.particles.forEach((pt, i) => {
          pt.age += dt * motion * speed;
          if (pt.age > pt.life) pt.age -= pt.life;
          const k = pt.age / pt.life;
          pos.setXYZ(i, src.x - k * 5.5 - k * k * 2, src.y + k * 2.4, src.z + Math.sin(i * 1.7 + k * 3) * k * 0.6);
          size.setX(i, 0.35 + k * 2.2);
          alpha.setX(i, (motion ? 1 : 0) * Math.sin(Math.PI * Math.min(1, k * 1.4)) * 0.28 * (1 - k));
        });
        pos.needsUpdate = true;
        size.needsUpdate = true;
        alpha.needsUpdate = true;
      }

      ship?.updateMatrixWorld(true);

      // Hover raycast (only while the pointer is over the scene and still).
      if (hoverDirty && cargo) {
        hoverDirty = false;
        let id = -1;
        if (insideCanvas && !orbit.dragging && p >= 1) {
          raycaster.setFromCamera(ndc, camera);
          const hit = raycaster.intersectObject(cargo, false)[0];
          if (hit && hit.instanceId !== undefined) id = hit.instanceId;
        }
        setHover(id);
      }
      if (hovered >= 0) {
        const rect = mount.getBoundingClientRect();
        tip.style.transform = `translate(${((ndc.x + 1) / 2) * rect.width + 16}px, ${((1 - ndc.y) / 2) * rect.height + 16}px)`;
      }

      // Hotspot pins follow their 3D anchors.
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.getWorldDirection(camDir);
      HOTSPOTS.forEach((spot, i) => {
        const el = hotRefs.current[i];
        if (!el || !ship) return;
        tmpV.set(...spot.pos).applyMatrix4(ship.matrixWorld);
        let visible = p >= 1;
        if (spot.normal) {
          tmpN.set(...spot.normal).transformDirection(ship.matrixWorld);
          visible = visible && tmpN.dot(tmpV.clone().sub(camera.position)) < 0;
        }
        tmpV.project(camera);
        visible = visible && tmpV.z < 1 && Math.abs(tmpV.x) < 1 && Math.abs(tmpV.y) < 1;
        el.style.opacity = visible ? '1' : '0';
        el.style.pointerEvents = visible ? 'auto' : 'none';
        el.style.transform = `translate(${((tmpV.x + 1) / 2) * w}px, ${((1 - tmpV.y) / 2) * h}px)`;
      });

      composer.render();
    };

    let raf = 0;
    const loop = () => {
      step();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Stop drawing while the tab is hidden.
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        clock.getDelta();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Rebuild colours when the theme class on <html> flips.
    const mo = new MutationObserver(() => {
      hovered = -1;
      build();
      resize();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onWindowMove);
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('pointerup', onUp);
      mount.removeEventListener('pointercancel', onUp);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('dblclick', onDouble);
      mount.removeEventListener('pointerenter', onEnter);
      mount.removeEventListener('pointerleave', onLeave);
      disposeTree(scene);
      envTex.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      <div ref={mountRef} className="absolute inset-0" style={{ touchAction: 'pan-y' }} aria-hidden="true" />

      {/* Hotspot pins (desktop): a dot that opens a label on hover. */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
        {HOTSPOTS.map((spot, i) => (
          <div
            key={spot.label}
            ref={(el) => {
              hotRefs.current[i] = el;
            }}
            className="group absolute left-0 top-0 transition-opacity duration-500"
            style={{ opacity: 0 }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2 relative flex items-center">
              <span className="relative grid place-items-center w-5 h-5">
                <span className="absolute inset-0 rounded-full bg-g-green opacity-40 animate-ping motion-reduce:animate-none" />
                <span className="relative w-2.5 h-2.5 rounded-full bg-white ring-[3px] ring-g-green shadow-[0_0_12px_var(--g-green)]" />
              </span>
              <span className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap g-glass !rounded-xl px-3 py-2 opacity-0 translate-x-[-4px] scale-95 origin-left transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100">
                <span className="block text-callout font-semibold text-g-ink">{spot.label}</span>
                <span className="block text-caption text-g-muted">{spot.note}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Container tooltip: destination and its bay-row-tier slot. */}
      <div
        ref={tipRef}
        className="pointer-events-none absolute left-0 top-0 g-glass !rounded-xl px-3 py-2 flex items-center gap-2.5 transition-opacity duration-150"
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <span data-port className="font-plex text-caption font-semibold text-white px-1.5 py-0.5 rounded-md" />
        <span className="flex flex-col">
          <span data-dest className="text-callout font-semibold text-g-ink" />
          <span className="text-caption text-g-muted">
            Slot <span data-slot className="font-plex" />
          </span>
        </span>
      </div>
    </div>
  );
}
