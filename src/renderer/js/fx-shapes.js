// The shapes the effect layer draws with (fx.js) and her biochip (chip.js): her colours, the
// jagged cuts of her intro's close-up, and her mask, what she is at heart once the mane and the
// body are gone.

export const COLORS = {
  red: '#ff2152',
  green: '#36ff7a',
  ink: '#14101c',
  violet: '#7b3dff',
  paper: '#fff4f6',
  blue: '#3d6bff',
};

export const FRAME_MS = 1000 / 24;

// her intro (see intro()): her close-up holding your screen by its edges
// (assets/capri/intro-grab.webp, cut out by tools/build-intro.py), where things are on it in its
// pixels, and when things happen, in drawings at 24 fps
export const GRAB = {
  w: 1672, h: 941,
  face: { x: 830, y: 330, size: 430 }, // the middle of her face, and about how wide it is
  eyes: [{ x: 719.5, y: 382.5 }, { x: 935, y: 297.5 }],
  tilt: -0.38, // her head's tilt (radians), for her lids
  socket: 48, iris: 34, pupil: 13.5, // the ink inside her green rings, her blue iris, her white pupil
  irisColor: '#026ffe', pupilColor: '#fdfdfb', inkColor: '#010207', // the picture's own colours
  tag: { x: 1110, y: 175 }, // where "hi" pops, by her face
  // the black lock over her eye on the right ends flat, cut by the top of the frame it comes
  // from: drawn on to its point (grabbed), the top of her head
  lock: [[926, 20], [983, 20], [978, -48]],
  top: -48,
  // her mane, behind her (the pictures are her alone): as big as in the show, shards hooked all
  // the same way, its outline walked round her head from her left, over the top and well past
  // the top of the picture, to her right
  mane: [
    [531, 480], [322, 472], [240, 444], [192, 440], [62, 415], [337, 371], [339, 299], [245, 245],
    [222, 229], [132, 170], [381, 214], [380, 137], [326, 62], [311, 39], [249, -47], [471, 81],
    [344, -142], [331, -256], [302, -321], [297, -435], [516, -153], [609, -203], [647, -286],
    [653, -328], [682, -459], [757, -155], [857, -288], [934, -360], [959, -396], [1049, -510],
    [989, -203], [1124, -240], [1226, -280], [1282, -330], [1403, -388], [1214, -121], [1208, 15],
    [1318, -8], [1382, -34], [1491, -47], [1247, 108], [1277, 174], [1350, 196], [1382, 200],
    [1493, 215], [1256, 268], [1278, 331], [1329, 372], [1380, 387], [1468, 435], [1243, 410],
    [1129, 480], [1030, 590], [630, 590]
  ],
  hands: [{ x: 0, y: 610 }, { x: 1672, y: 520 }], // where her hands hold the edges of the screen
};

export const lerp = (a, b, t) => a + (b - a) * t;

// A stable random number in [0, 1) for (i, seed): the same drawing gets the same jags.
export const hash = (i, seed) => {
  const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// What shows of her intro's close-up (fx.js intro): never a straight edge of the picture, always a
// jagged one, new jags every drawing (`seed`). Each adds its shape to the current path, in the
// picture's pixels.
export const JAG = 70; // px of the picture between two points of a cut
export const JAG_AMP = 46;

// From the sides in: rL and rR, how far in from the left and right edges (1: half the picture).
export function cutEdges(ctx, rL, rR, seed) {
  const { w, h } = GRAB;
  const side = (r, left) => {
    if (r <= 0) return;
    const reach = r * w * 0.5;
    const amp = JAG_AMP * Math.min(1, r * 4);
    ctx.moveTo(left ? -60 : w + 60, -60);
    for (let y = -60, i = 0; y <= h + 60 + JAG; y += JAG, i++) {
      const x = reach + (hash(i, seed + (left ? 0 : 50)) - 0.5) * 2 * amp;
      ctx.lineTo(left ? x : w - x, y);
    }
    ctx.lineTo(left ? -60 : w + 60, h + 60 + JAG);
    ctx.closePath();
  };
  side(rL, true);
  side(rR, false);
}

// From the middle out: a band `half` wide on each side of her face.
export function cutBand(ctx, half, seed) {
  const { h } = GRAB;
  const cx = GRAB.face.x;
  const ys = [];
  for (let y = -60; y <= h + 60 + JAG; y += JAG) ys.push(y);
  ys.forEach((y, i) => {
    const x = cx - half - (hash(i, seed) - 0.5) * 2 * JAG_AMP;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  for (let i = ys.length - 1; i >= 0; i--) ctx.lineTo(cx + half + (hash(i, seed + 50) - 0.5) * 2 * JAG_AMP, ys[i]);
  ctx.closePath();
}

// Her head and mane: a spiky disc of radius R around her face, long points and short ones.
export function cutHead(ctx, R, seed) {
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = R * (i % 2 ? 0.78 : 1) * (0.92 + hash(i, seed) * 0.16);
    const x = GRAB.face.x + Math.cos(a) * r * 1.15, y = GRAB.face.y + Math.sin(a) * r * 0.95;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
export const onTwos = (ms) => Math.floor(ms / (FRAME_MS * 2)) * FRAME_MS * 2;

// Her mask, what she is at heart in the show once the mane and the body are gone: a green
// slab of a face with a hooked spike rising from it, two eyes (ink almonds, green ring, blue
// iris, white pupil turned toward `look`), and a white fang under it, all over a violet copy.
// Drawn around (x, y) = the middle of the face, k = scale (1: about 95 px wide).
//   eyes   how open each eye is, [left, right]; under 0.15 it's shut (a thick sleepy curve)
//   spike  draw the hooked spike above it
//   flat   one colour for the whole thing (an impact frame)
export const MASK = {
  face: [[-48, -20], [-12, -22], [48, -26], [46, 20], [-45, 23]],
  spike: [[-32, -20], [-37, -50], [-22, -63], [6, -67], [24, -75], [34, -99], [49, -90], [44, -66], [30, -48], [2, -42], [-10, -40], [-12, -21]],
  fang: [[-6, 22], [1, 27], [8, 22], [13, 26], [22, 21], [8, 52]],
  eyes: [[-23, 0], [22, -3]],
};

export function drawMask(ctx, x, y, k, { eyes = [1, 1], look = null, spike = true, flat = null } = {}) {
  const poly = (pts, dx = 0, dy = 0) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy)));
    ctx.closePath();
  };
  const shapes = spike ? [MASK.spike, MASK.face, MASK.fang] : [MASK.face, MASK.fang];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.lineJoin = 'miter';
  for (const s of shapes) {
    poly(s, 3, 3);
    ctx.fillStyle = flat || COLORS.violet;
    ctx.fill();
  }
  if (flat) {
    for (const s of shapes) {
      poly(s);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (spike) {
    poly(MASK.spike);
    ctx.fillStyle = COLORS.green;
    ctx.fill();
  }
  poly(MASK.face);
  ctx.fillStyle = COLORS.green;
  ctx.fill();
  poly(MASK.fang);
  ctx.fillStyle = COLORS.paper;
  ctx.fill();
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  MASK.eyes.forEach(([ex, ey], i) => {
    const o = eyes[i];
    if (o < 0.15) {
      // shut
      ctx.beginPath();
      ctx.moveTo(ex - 15, ey - 4);
      ctx.lineTo(ex, ey + 5);
      ctx.lineTo(ex + 15, ey - 4);
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      return;
    }
    let px = 0, py = 0;
    if (look) {
      const d = Math.hypot(look.x - (x + ex * k), look.y - (y + ey * k)) || 1;
      px = ((look.x - (x + ex * k)) / d) * 2.6;
      py = ((look.y - (y + ey * k)) / d) * 2.2;
    }
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(1, o);
    ctx.beginPath(); // an almond of ink
    ctx.moveTo(-19, 0);
    ctx.quadraticCurveTo(0, -24, 19, 0);
    ctx.quadraticCurveTo(0, 24, -19, 0);
    ctx.fillStyle = COLORS.ink;
    ctx.fill();
    const disk = (dx, dy, r, color) => {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };
    disk(px * 0.4, py * 0.4, 10.5, COLORS.green);
    disk(px * 0.4, py * 0.4, 8.8, COLORS.ink);
    disk(px * 0.7, py * 0.7, 7.6, COLORS.blue);
    ctx.beginPath();
    ctx.ellipse(px, py, 3, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

// One of her eyes: green ring, blue iris, white pupil turned toward `look`, over an ink disk
// with its violet copy. `open` squashes it shut. (The eyes all over a window she possesses.)
export function drawEye(ctx, x, y, R, open, look = null) {
  let px = 0, py = 0;
  if (look) {
    const d = Math.hypot(look.x - x, look.y - y) || 1;
    px = ((look.x - x) / d) * R * 0.2;
    py = ((look.y - y) / d) * R * 0.2;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, open);
  const disk = (dx, dy, r, color) => {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  disk(-3, 3, R, COLORS.violet);
  disk(0, 0, R, COLORS.ink);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.8, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.green;
  ctx.lineWidth = R * 0.16;
  ctx.stroke();
  disk(px * 0.6, py * 0.6, R * 0.52, COLORS.blue);
  ctx.beginPath();
  ctx.ellipse(px, py, R * 0.16, R * 0.24, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.paper;
  ctx.fill();
  ctx.restore();
}

