// Renders a FASTag location report (header, summary, latest ping, history,
// route map, journey summary) onto a canvas and downloads it as a JPG.

const W = 1024;
const SCALE = 2;
const FONT = 'Inter, "Segoe UI", Roboto, Arial, sans-serif';
const C = {
  navy: '#0b3d6e',
  blue: '#1e63b8',
  icon: '#1565c0',
  ink: '#102a43',
  soft: '#486581',
  line: '#dde8f3',
  rowLine: '#e8eff6',
  green: '#2e7d32',
  greenDark: '#1b5e20',
  greenBg: '#f3faf3',
  greenSoft: '#e6f4e6',
  greenBorder: '#8fcf92',
  dot: '#8db8ec',
  rail: '#a9c8ec',
};

const f = (weight, size) => `${weight} ${size}px ${FONT}`;

function parseTime(t) {
  if (!t) return null;
  const d = new Date(String(t).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}
const monthShort = (d) => d.toLocaleString('en-US', { month: 'short' });
const fmtDate = (d) => (d ? `${d.getDate()} ${monthShort(d)} ${d.getFullYear()}` : '—');
const fmtShortDate = (d) => (d ? `${d.getDate()} ${monthShort(d)}` : '—');
const fmtTime = (d) => (d ? d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—');
const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;

const plazaName = (loc) => loc.toll_plaza || 'Unknown toll plaza';
const placeText = (loc) => [loc.city, loc.state, loc.pincode].filter(Boolean).join(', ') || 'Address unavailable';
const hasCoords = (loc) => Number.isFinite(loc.lat) && Number.isFinite(loc.lon) && !(loc.lat === 0 && loc.lon === 0);

// ---------- drawing primitives ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function box(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  roundRect(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function fit(ctx, str, maxW) {
  if (!maxW || ctx.measureText(str).width <= maxW) return str;
  let s = str;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

function text(ctx, str, x, y, font, color, { align = 'left', maxW } = {}) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fit(ctx, String(str), maxW), x, y);
}

function wrap(ctx, str, font, maxW, maxLines = Infinity) {
  ctx.font = font;
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fit(ctx, `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, maxW);
    return kept;
  }
  return lines;
}

function line(ctx, x1, y1, x2, y2, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// ---------- icons (centered on x, y) ----------

function pinIcon(ctx, x, y, s, color, hole = '#ffffff') {
  const r = s * 0.32;
  const cy = y - s * 0.14;
  ctx.beginPath();
  ctx.arc(x, cy, r, Math.PI * 0.75, Math.PI * 0.25);
  ctx.lineTo(x, cy + r * 1.75);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, cy, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = hole;
  ctx.fill();
}

function calendarIcon(ctx, x, y, s, color) {
  const w = s;
  const h = s * 0.9;
  const left = x - w / 2;
  const top = y - h / 2;
  box(ctx, left, top, w, h, s * 0.12, null, color, Math.max(1.5, s * 0.08));
  ctx.fillStyle = color;
  ctx.fillRect(left, top, w, h * 0.28);
  ctx.fillRect(left + w * 0.25, top - s * 0.12, s * 0.08, s * 0.2);
  ctx.fillRect(left + w * 0.67, top - s * 0.12, s * 0.08, s * 0.2);
  const d = s * 0.11;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(left + w * (0.2 + c * 0.25), top + h * (0.45 + r * 0.24), d, d);
    }
  }
}

function clockIcon(ctx, x, y, s, color) {
  const r = s / 2;
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.55);
  ctx.lineTo(x, y);
  ctx.lineTo(x + r * 0.42, y + r * 0.25);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function truckIcon(ctx, x, y) {
  ctx.fillStyle = '#ffffff';
  box(ctx, x, y, 50, 36, 3, '#ffffff');
  ctx.beginPath();
  ctx.moveTo(x + 54, y + 10);
  ctx.lineTo(x + 68, y + 10);
  ctx.lineTo(x + 79, y + 23);
  ctx.lineTo(x + 79, y + 36);
  ctx.lineTo(x + 54, y + 36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.navy;
  ctx.fillRect(x + 59, y + 14, 10, 8);
  [x + 16, x + 66].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, y + 42, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, y + 42, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = C.navy;
    ctx.fill();
  });
}

function signalIcon(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#43a047';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  [r * 0.38, r * 0.62].forEach((ar) => {
    ctx.beginPath();
    ctx.arc(x, y - 2, ar, Math.PI * 0.8, Math.PI * 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - 2, ar, Math.PI * 1.8, Math.PI * 2.2);
    ctx.stroke();
  });
  line(ctx, x, y - 2, x, y + r * 0.5, '#ffffff', 2.2);
  ctx.beginPath();
  ctx.arc(x, y - 2, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineCap = 'butt';
}

function barsIcon(ctx, x, y, color) {
  ctx.fillStyle = color;
  box(ctx, x - 13, y + 1, 7, 10, 1.5, color);
  box(ctx, x - 3.5, y - 5, 7, 16, 1.5, color);
  box(ctx, x + 6, y - 11, 7, 22, 1.5, color);
}

function checkIcon(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = C.green;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y);
  ctx.lineTo(x - r * 0.1, y + r * 0.35);
  ctx.lineTo(x + r * 0.5, y - r * 0.35);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

// ---------- map ----------

function project(lat, lon, z) {
  const size = 256 * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

function loadImage(src, timeout = 6000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), timeout);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

// `points` are chronological (oldest first); the last one is the latest ping.
async function drawMap(ctx, x, y, w, h, points, latestName) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 10);
  ctx.clip();
  ctx.fillStyle = '#eef2f5';
  ctx.fillRect(x, y, w, h);

  const valid = points.filter(hasCoords);
  if (valid.length === 0) {
    text(ctx, 'Map unavailable', x + w / 2, y + h / 2, f(500, 15), C.soft, { align: 'center' });
    ctx.restore();
    box(ctx, x, y, w, h, 10, null, C.line);
    return;
  }

  let z = 13;
  let px;
  for (; z > 3; z--) {
    px = valid.map((p) => project(p.lat, p.lon, z));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    if (Math.max(...xs) - Math.min(...xs) <= w - 70 && Math.max(...ys) - Math.min(...ys) <= h - 90) break;
  }
  px = valid.map((p) => project(p.lat, p.lon, z));
  const xs = px.map((p) => p.x);
  const ys = px.map((p) => p.y);
  const ox = (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2;
  const oy = (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2 + 10;

  const n = 2 ** z;
  const tiles = [];
  for (let tx = Math.floor(ox / 256); tx <= Math.floor((ox + w) / 256); tx++) {
    for (let ty = Math.floor(oy / 256); ty <= Math.floor((oy + h) / 256); ty++) {
      if (ty < 0 || ty >= n) continue;
      const wrapped = ((tx % n) + n) % n;
      tiles.push(
        loadImage(`https://tile.openstreetmap.org/${z}/${wrapped}/${ty}.png`).then((img) => ({ img, tx, ty }))
      );
    }
  }
  const loaded = await Promise.all(tiles);
  loaded.forEach(({ img, tx, ty }) => {
    if (img) ctx.drawImage(img, x + tx * 256 - ox, y + ty * 256 - oy, 256, 256);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);

  const pts = px.map((p) => ({ x: x + p.x - ox, y: y + p.y - oy }));

  // route
  if (pts.length > 1) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = '#f2a51a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
  }

  pts.slice(0, -1).forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = C.icon;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  const last = pts[pts.length - 1];
  pinIcon(ctx, last.x, last.y - 14, 34, '#e53935');

  // latest label with a white halo
  ctx.font = f(700, 14);
  const label = fit(ctx, latestName, w * 0.5);
  const labelW = ctx.measureText(label).width;
  const right = last.x + 16 + labelW < x + w - 8;
  const lx = right ? last.x + 16 : last.x - 16 - labelW;
  box(ctx, lx - 6, last.y - 34, labelW + 12, 24, 5, 'rgba(255,255,255,0.92)');
  text(ctx, label, lx, last.y - 17, f(700, 14), C.ink);

  // attribution
  ctx.font = f(400, 10);
  const attr = '© OpenStreetMap contributors';
  const aw = ctx.measureText(attr).width;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(x + w - aw - 10, y + h - 16, aw + 10, 16);
  text(ctx, attr, x + w - 5, y + h - 4, f(400, 10), C.soft, { align: 'right' });

  ctx.restore();
  box(ctx, x, y, w, h, 10, null, C.line);
}

// ---------- journey helpers ----------

function travelDirection(first, last) {
  if (!first || !last || !hasCoords(first) || !hasCoords(last)) return 'Not available';
  const avgLat = ((first.lat + last.lat) / 2) * (Math.PI / 180);
  const dLat = last.lat - first.lat;
  const dLon = (last.lon - first.lon) * Math.cos(avgLat);
  if (Math.hypot(dLat, dLon) < 0.05) return 'Stationary (Approx.)';
  const deg = ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
  const names = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  const i = Math.round(deg / 45) % 8;
  return `${names[(i + 4) % 8]} → ${names[i]} (Approx.)`;
}

function statesCovered(chronological) {
  const states = [];
  chronological.forEach((loc) => {
    if (loc.state && !states.includes(loc.state)) states.push(loc.state);
  });
  return states.length ? states.join(', ') : 'Not available';
}

// ---------- main ----------

/** `result.locations` must be sorted newest first. */
export async function downloadFastagReport(result) {
  const locations = result.locations || [];
  if (locations.length === 0) return;
  const chronological = [...locations].reverse();
  const latest = locations[0];
  const first = chronological[0];
  const latestTime = parseTime(latest.position_time);
  const firstTime = parseTime(first.position_time);
  const now = new Date();
  const periodStart = firstTime || new Date(now.getTime() - 72 * 3600 * 1000);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- measure dynamic sections before sizing the canvas ---
  const M = 24;
  const BODY_Y = 524;
  const LEFT_W = 648;
  const RIGHT_X = 694;
  const RIGHT_W = W - M - RIGHT_X;
  const ROW_H = 80;
  const leftH = 54 + 8 + locations.length * ROW_H + 8;

  const valueX = RIGHT_X + 135;
  const valueW = RIGHT_W - 135 - 14;
  const bold = f(700, 15);
  const regular = f(400, 15);
  const summaryRows = [
    { label: 'Total Locations', lines: [{ t: String(locations.length), font: bold }] },
    {
      label: 'First Location',
      lines: [
        ...wrap(ctx, plazaName(first), bold, valueW, 2).map((t) => ({ t, font: bold })),
        { t: `(${fmtShortDate(firstTime)}, ${fmtTime(firstTime)})`, font: regular },
      ],
    },
    {
      label: 'Last Location',
      lines: [
        ...wrap(ctx, plazaName(latest), bold, valueW, 2).map((t) => ({ t, font: bold })),
        { t: `(${fmtShortDate(latestTime)}, ${fmtTime(latestTime)})`, font: regular },
      ],
    },
    {
      label: 'States Covered',
      lines: wrap(ctx, statesCovered(chronological), bold, valueW, 4).map((t) => ({ t, font: bold })),
    },
    {
      label: 'Travel Direction',
      lines: wrap(ctx, travelDirection(first, latest), bold, valueW, 2).map((t) => ({ t, font: bold })),
    },
  ].map((row) => ({ ...row, h: row.lines.length * 21 + 22 }));
  const summaryH = 72 + summaryRows.reduce((s, r) => s + r.h, 0) + 6;

  const note = 'Note: Location data is based on FASTag toll transactions and may vary slightly from actual GPS location.';
  const noteLines = wrap(ctx, note, f(400, 13), RIGHT_W - 44);
  const sourceH = 102 + noteLines.length * 19 + 12;

  const MAP_H = 300;
  const rightH = MAP_H + 22 + summaryH + 22 + sourceH;
  const bodyBottom = BODY_Y + Math.max(leftH, rightH);
  const H = bodyBottom + 110;

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // --- header ---
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, C.navy);
  grad.addColorStop(1, C.blue);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 110);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(670, 110);
  ctx.bezierCurveTo(720, 60, 820, 70, 860, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  truckIcon(ctx, 38, 26);
  text(ctx, 'FASTag Location Report', 148, 58, f(700, 36), '#ffffff');
  text(ctx, 'Track Today  •  Move Tomorrow', 148, 87, f(400, 18), 'rgba(255,255,255,0.88)');
  text(ctx, 'Safer Roads', W - M, 51, f(500, 17), '#ffffff', { align: 'right' });
  text(ctx, 'Smarter Business', W - M, 75, f(500, 17), '#ffffff', { align: 'right' });

  // --- info strip ---
  box(ctx, M, 132, W - M * 2, 112, 10, '#f7fafd', C.line);
  const colW = (W - M * 2) / 4;
  for (let i = 1; i < 4; i++) line(ctx, M + colW * i, 152, M + colW * i, 224, C.line);
  text(ctx, 'Vehicle Number', 46, 168, f(400, 16), C.soft);
  text(ctx, result.vehicle_no, 46, 210, f(700, 30), C.ink, { maxW: colW - 40 });

  const c1 = M + colW + 20;
  text(ctx, 'Report Period', c1, 168, f(400, 16), C.soft);
  calendarIcon(ctx, c1 + 12, 196, 22, C.icon);
  text(ctx, 'Last 72 Hours', c1 + 34, 202, f(700, 18), C.ink, { maxW: colW - 60 });
  text(ctx, `${fmtDate(periodStart)} – ${fmtDate(now)}`, c1 + 34, 225, f(400, 14), C.ink, { maxW: colW - 60 });

  const c2 = M + colW * 2 + 20;
  text(ctx, 'Total Location Pings', c2, 168, f(400, 16), C.soft);
  pinIcon(ctx, c2 + 14, 202, 30, C.icon);
  text(ctx, String(locations.length), c2 + 40, 212, f(700, 26), C.ink);

  const c3 = M + colW * 3 + 20;
  text(ctx, 'Report Generated', c3, 168, f(400, 16), C.soft);
  clockIcon(ctx, c3 + 12, 200, 24, C.icon);
  text(ctx, fmtDateTime(now), c3 + 34, 206, f(400, 15), C.ink, { maxW: colW - 60 });

  // --- latest location ---
  box(ctx, M, 266, W - M * 2, 236, 12, C.greenBg, C.greenBorder, 1.5);
  ctx.font = f(700, 19);
  const badgeW = ctx.measureText('LATEST LOCATION').width + 78;
  box(ctx, 46, 281, badgeW, 42, 7, C.green);
  pinIcon(ctx, 70, 304, 26, '#ffffff', C.green);
  text(ctx, 'LATEST LOCATION', 96, 309, f(700, 19), '#ffffff');
  text(ctx, plazaName(latest), 90, 368, f(700, 32), C.ink, { maxW: 540 });
  pinIcon(ctx, 102, 400, 24, '#3d7f8f');
  text(ctx, placeText(latest), 128, 406, f(400, 21), C.soft, { maxW: 500 });
  box(ctx, 46, 431, 574, 56, 8, C.greenSoft);
  calendarIcon(ctx, 102, 459, 24, C.icon);
  text(ctx, fmtDate(latestTime), 128, 467, f(700, 21), C.ink, { maxW: 180 });
  line(ctx, 320, 443, 320, 475, '#cfe6cf');
  clockIcon(ctx, 357, 459, 26, C.icon);
  text(ctx, fmtTime(latestTime), 385, 467, f(700, 21), C.ink);

  line(ctx, 642, 290, 642, 480, '#cfe6cf');
  box(ctx, 664, 289, W - M - 22 - 664, 190, 10, '#e9f5e9');
  signalIcon(ctx, 709, 334, 22);
  text(ctx, 'Latest FASTag Ping', 687, 388, f(700, 20), C.green);
  const pingText = latestTime
    ? `Vehicle crossed this toll plaza at ${fmtTime(latestTime).replace(/^0/, '')} on ${fmtDate(latestTime)}.`
    : 'Crossing time is not available for this ping.';
  wrap(ctx, pingText, f(400, 16), 270, 3).forEach((l, i) => text(ctx, l, 687, 418 + i * 23, f(400, 16), C.soft));

  // --- location history ---
  box(ctx, M, BODY_Y, LEFT_W, leftH, 10, '#ffffff', C.line);
  const hGrad = ctx.createLinearGradient(M, 0, M + LEFT_W, 0);
  hGrad.addColorStop(0, C.navy);
  hGrad.addColorStop(1, C.blue);
  box(ctx, M, BODY_Y, LEFT_W, 54, 10, hGrad);
  pinIcon(ctx, 62, BODY_Y + 29, 26, '#ffffff', C.navy);
  text(ctx, 'LOCATION HISTORY', 90, BODY_Y + 34, f(700, 19), '#ffffff');
  ctx.font = f(700, 19);
  const histW = ctx.measureText('LOCATION HISTORY ').width;
  text(ctx, '(Latest First)', 90 + histW, BODY_Y + 34, f(400, 17), 'rgba(255,255,255,0.9)');
  const pill = `Total ${locations.length} Location${locations.length === 1 ? '' : 's'}`;
  ctx.font = f(500, 15);
  const pillW = ctx.measureText(pill).width + 28;
  box(ctx, M + LEFT_W - 20 - pillW, BODY_Y + 12, pillW, 30, 8, 'rgba(255,255,255,0.16)');
  text(ctx, pill, M + LEFT_W - 20 - pillW / 2, BODY_Y + 32, f(500, 15), '#ffffff', { align: 'center' });

  const rowsY = BODY_Y + 62;
  if (locations.length > 1) {
    line(ctx, 69, rowsY + ROW_H / 2, 69, rowsY + (locations.length - 0.5) * ROW_H, C.rail, 3);
  }
  locations.forEach((loc, i) => {
    const top = rowsY + i * ROW_H;
    const cy = top + ROW_H / 2;
    const t = parseTime(loc.position_time);
    if (i === 0) box(ctx, M + 10, top + 2, LEFT_W - 20, ROW_H - 4, 7, C.greenSoft);
    else line(ctx, 100, top, M + LEFT_W - 16, top, C.rowLine);
    ctx.beginPath();
    ctx.arc(69, cy, 21, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#3c9a40' : C.dot;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, String(i + 1).padStart(2, '0'), 69, cy + 6, f(700, 17), '#ffffff', { align: 'center' });
    text(ctx, plazaName(loc), 115, cy - 5, f(700, 19), C.ink, { maxW: 390 });
    text(ctx, placeText(loc), 115, cy + 20, f(400, 15), C.soft, { maxW: 390 });
    calendarIcon(ctx, 537, cy - 12, 16, C.icon);
    text(ctx, fmtDate(t), 554, cy - 6, f(400, 16), C.soft, { maxW: 100 });
    clockIcon(ctx, 537, cy + 16, 17, C.icon);
    text(ctx, fmtTime(t), 554, cy + 22, f(400, 16), C.soft, { maxW: 100 });
  });

  // --- right column: map, journey summary, data source ---
  await drawMap(ctx, RIGHT_X, BODY_Y, RIGHT_W, MAP_H, chronological, plazaName(latest));

  const sy = BODY_Y + MAP_H + 22;
  box(ctx, RIGHT_X, sy, RIGHT_W, summaryH, 10, '#eef5fd');
  barsIcon(ctx, RIGHT_X + 30, sy + 36, C.icon);
  text(ctx, 'Journey Summary', RIGHT_X + 62, sy + 43, f(700, 20), C.ink);
  let ry = sy + 72;
  summaryRows.forEach((row, i) => {
    text(ctx, row.label, RIGHT_X + 18, ry + 18, f(400, 15), C.soft, { maxW: 115 });
    row.lines.forEach((l, j) => text(ctx, l.t, valueX, ry + 18 + j * 21, l.font, C.ink, { maxW: valueW }));
    ry += row.h;
    if (i < summaryRows.length - 1) line(ctx, RIGHT_X + 18, ry - 6, RIGHT_X + RIGHT_W - 18, ry - 6, '#d6e4f3');
  });

  const dy = sy + summaryH + 22;
  box(ctx, RIGHT_X, dy, RIGHT_W, sourceH, 10, '#eef7ee');
  checkIcon(ctx, RIGHT_X + 37, dy + 37, 16);
  text(ctx, 'Data Source', RIGHT_X + 66, dy + 43, f(700, 18), C.greenDark);
  text(ctx, 'FASTag Toll Plaza Records', RIGHT_X + 66, dy + 67, f(400, 15), C.ink, { maxW: RIGHT_W - 80 });
  noteLines.forEach((l, i) => text(ctx, l, RIGHT_X + 22, dy + 102 + i * 19, f(400, 13), C.soft));

  // --- footer ---
  const fy = bodyBottom + 52;
  line(ctx, M, fy, W - M, fy, C.line);
  text(ctx, `Generated on ${fmtDateTime(now)}`, M, fy + 30, f(400, 13), C.soft);
  text(ctx, 'Reliable Tracking  |  Efficient Logistics  |  A Better Tomorrow', W / 2 + 40, fy + 30, f(500, 13), C.navy, {
    align: 'center',
  });
  text(ctx, 'Page 1 of 1', W - M, fy + 30, f(400, 13), C.soft, { align: 'right' });

  await new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${result.vehicle_no}-fastag-report.jpg`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        resolve();
      },
      'image/jpeg',
      0.95
    );
  });
}
