// Perhitungan geometri tur (murni, tanpa DOM) supaya bisa diuji.
// Semua koordinat dalam piksel viewport (hasil getBoundingClientRect).

export const SPOT_PAD = 6; // jarak sorotan dari tepi elemen
export const EDGE = 12; // jarak minimum tooltip dari tepi layar
export const GAP = 14; // jarak tooltip dari sorotan
export const MOBILE_MAX = 640; // di bawah ini tooltip menempel di atas/bawah layar

// Sorotan = rect elemen + padding, dipotong ke viewport. null bila di luar layar.
export function spotlightRect(rect, viewport, pad = SPOT_PAD) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const left = Math.max(0, rect.left - pad);
  const top = Math.max(0, rect.top - pad);
  const right = Math.min(viewport.width, rect.left + rect.width + pad);
  const bottom = Math.min(viewport.height, rect.top + rect.height + pad);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}

function clamp(v, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

const OPPOSITE = { top: "bottom", bottom: "top", left: "right", right: "left" };

function candidates(preferred) {
  const first = OPPOSITE[preferred] ? preferred : "bottom";
  const order = [first, OPPOSITE[first], "bottom", "top", "right", "left"];
  return order.filter((p, i) => order.indexOf(p) === i);
}

// Posisi tooltip.
//  hole     : hasil spotlightRect, atau null (langkah tanpa sorotan -> tengah layar)
//  tip      : { width, height } ukuran tooltip yang sudah terukur
//  viewport : { width, height }
// Hasil:
//  { kind: "center" }
//  { kind: "dock", edge: "top" | "bottom" }          (layar kecil, lebar penuh)
//  { kind: "float", placement, top, left }            (desktop, di dekat sorotan)
export function computeTooltipPosition({ hole, tip, viewport, preferred = "bottom" }) {
  if (!hole) return { kind: "center" };
  const { width: vw, height: vh } = viewport;

  if (vw < MOBILE_MAX) {
    const below = vh - (hole.top + hole.height);
    const above = hole.top;
    const need = tip.height + EDGE * 2;
    if (below >= need) return { kind: "dock", edge: "bottom" };
    if (above >= need) return { kind: "dock", edge: "top" };
    // Tidak ada ruang bebas: tempel di sisi yang lebih lapang.
    return { kind: "dock", edge: below >= above ? "bottom" : "top" };
  }

  const w = tip.width;
  const h = tip.height;
  const centerX = hole.left + hole.width / 2;
  const centerY = hole.top + hole.height / 2;
  const maxLeft = vw - w - EDGE;
  const maxTop = vh - h - EDGE;

  for (const p of candidates(preferred)) {
    let top;
    let left;
    let fits;
    if (p === "bottom") {
      top = hole.top + hole.height + GAP;
      left = clamp(centerX - w / 2, EDGE, maxLeft);
      fits = top + h <= vh - EDGE;
    } else if (p === "top") {
      top = hole.top - GAP - h;
      left = clamp(centerX - w / 2, EDGE, maxLeft);
      fits = top >= EDGE;
    } else if (p === "right") {
      left = hole.left + hole.width + GAP;
      top = clamp(centerY - h / 2, EDGE, maxTop);
      fits = left + w <= vw - EDGE;
    } else {
      left = hole.left - GAP - w;
      top = clamp(centerY - h / 2, EDGE, maxTop);
      fits = left >= EDGE;
    }
    if (fits) return { kind: "float", placement: p, top, left };
  }

  // Elemen terlalu besar untuk ditempeli: letakkan di pojok kanan bawah layar.
  return { kind: "float", placement: "bottom", top: Math.max(EDGE, maxTop), left: Math.max(EDGE, maxLeft) };
}

// Apakah elemen perlu digulir? true bila tidak sepenuhnya nyaman terlihat.
export function needsScroll(rect, viewport, reserveBottom = 0) {
  const top = EDGE * 2;
  const bottom = viewport.height - EDGE * 2 - reserveBottom;
  if (rect.height > bottom - top) return rect.top < top - 1 || rect.top > bottom;
  return rect.top < top || rect.top + rect.height > bottom;
}

// Selisih gulir agar elemen berada di posisi nyaman.
//  mobile  : elemen di dekat atas layar (tooltip menempel di bawah)
//  desktop : elemen di tengah layar (atau di atas bila lebih tinggi dari layar)
export function scrollDelta(rect, viewport, mobile) {
  const topPad = mobile ? 72 : 96;
  if (mobile || rect.height > viewport.height * 0.6) return rect.top - topPad;
  return rect.top - (viewport.height - rect.height) / 2;
}
