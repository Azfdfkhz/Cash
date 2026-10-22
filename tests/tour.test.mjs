import test from "node:test";
import assert from "node:assert/strict";
import {
  TOUR_STATUS, TOUR_VERSION, normalizeTourRole, readTourState, resumeIndex,
  tourMetadata, tourStepsFor, welcomeCopy,
} from "../src/lib/tour/tourConfig.js";
import { DEMO_ID_PREFIX, demoDetailPayload, demoRequests, isDemoCa } from "../src/lib/tour/demoData.js";
import {
  EDGE, computeTooltipPosition, needsScroll, scrollDelta, spotlightRect,
} from "../src/lib/tour/placement.js";

const ROUTES = ["/dashboard", "/cash-advances/new", "/reimbursements/new", "/approvals", "/reports", "/profile"];

test("peran tak dikenal jatuh ke requester", () => {
  assert.equal(normalizeTourRole("operational"), "operational");
  assert.equal(normalizeTourRole("requester"), "requester");
  assert.equal(normalizeTourRole("admin"), "requester");
  assert.equal(normalizeTourRole(undefined), "requester");
});

test("setiap langkah lengkap dan id unik per peran", () => {
  for (const role of ["requester", "operational"]) {
    const steps = tourStepsFor(role);
    assert.ok(steps.length > 5, role);
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length, `id ganda (${role})`);
    for (const s of steps) {
      assert.ok(ROUTES.includes(s.path), `${s.id}: path ${s.path}`);
      assert.match(s.target, /^[a-z0-9-]+$/, `${s.id}: target`);
      assert.ok(typeof s.title === "string" && s.title.length > 2, `${s.id}: title`);
      assert.ok(typeof s.body === "string" && s.body.length > 20, `${s.id}: body`);
      assert.ok(["top", "bottom", "left", "right"].includes(s.placement), `${s.id}: placement`);
    }
  }
});

test("requester tidak melihat halaman operasional, operasional tidak melihat formulir Ajukan", () => {
  const req = tourStepsFor("requester");
  const ops = tourStepsFor("operational");
  for (const s of req) assert.ok(!["/approvals", "/reports"].includes(s.path), `requester: ${s.id}`);
  for (const s of ops) assert.ok(!s.path.endsWith("/new"), `operasional: ${s.id}`);
  assert.ok(ops.some((s) => s.path === "/approvals"));
  assert.ok(ops.some((s) => s.path === "/reports"));
  assert.ok(req.some((s) => s.path === "/cash-advances/new"));
  assert.ok(!req.some((s) => s.id === "stat-spj"), "Perlu SPJ hanya ada di Beranda operasional");
  assert.ok(!ops.some((s) => s.id === "stat-returned"), "Dikembalikan hanya ada di Beranda requester");
});

test("urutan halaman: tidak bolak-balik antar halaman", () => {
  for (const role of ["requester", "operational"]) {
    const seen = [];
    for (const s of tourStepsFor(role)) {
      if (seen[seen.length - 1] !== s.path) {
        assert.ok(!seen.includes(s.path), `${role}: kembali ke ${s.path}`);
        seen.push(s.path);
      }
    }
  }
});

test("teks mengikuti peran", () => {
  const req = tourStepsFor("requester").find((s) => s.id === "stat-balance");
  const ops = tourStepsFor("operational").find((s) => s.id === "stat-balance");
  assert.equal(req.title, "Sisa saldo aktif");
  assert.equal(ops.title, "Saldo berjalan");
  assert.notEqual(req.body, ops.body);
  assert.match(welcomeCopy("operational").title, /Operasional/);
  assert.match(welcomeCopy("requester").title, /Cash Advance/);
});

test("tidak ada langkah yang menjanjikan aksi otomatis pada tombol keputusan/kirim", () => {
  for (const role of ["requester", "operational"]) {
    for (const s of tourStepsFor(role)) {
      if (["ap-actions", "req-actions"].includes(s.id)) {
        assert.ok(!s.interactive, `${s.id} tidak boleh interaktif`);
      }
    }
  }
});

test("langkah clickToGo menyorot menu navigasi dan mengarah ke halaman berikutnya", () => {
  for (const role of ["requester", "operational"]) {
    const steps = tourStepsFor(role);
    steps.forEach((s, i) => {
      if (!s.clickToGo) return;
      assert.ok(s.interactive, `${s.id}: clickToGo harus interaktif`);
      assert.match(s.target, /^nav-/, `${s.id}: target harus menu navigasi`);
      assert.ok(steps[i + 1], `${s.id}: harus ada langkah berikutnya`);
      assert.notEqual(steps[i + 1].path, s.path, `${s.id}: langkah berikutnya harus di halaman lain`);
    });
  }
  const req = tourStepsFor("requester").map((s) => s.id);
  const ops = tourStepsFor("operational").map((s) => s.id);
  assert.ok(req.includes("go-ajukan") && req.includes("go-profile-req"));
  assert.ok(ops.includes("go-approvals") && ops.includes("go-reports") && ops.includes("go-profile-ops"));
});

test("langkah demo: konfigurasi valid dan target contoh jelas", () => {
  for (const role of ["requester", "operational"]) {
    for (const s of tourStepsFor(role)) {
      if (!s.demo) continue;
      assert.equal(s.demo.kind, "review", `${s.id}: kind`);
      assert.ok(["always", "fallback"].includes(s.demo.mode), `${s.id}: mode`);
      if (s.demo.mode === "always") assert.match(s.target, /^(review|detail)-/, `${s.id}: target di dalam contoh`);
      if (s.demo.mode === "fallback") assert.ok(s.demo.target, `${s.id}: target contoh`);
    }
  }
});

test("data contoh tidak pernah terlihat seperti data nyata", () => {
  for (const role of ["requester", "operational"]) {
    const rows = demoRequests(role);
    assert.ok(rows.length >= 2);
    for (const r of rows) {
      assert.ok(isDemoCa(r));
      assert.ok(r.id.startsWith(DEMO_ID_PREFIX));
      assert.match(r.purpose, /^Contoh:/);
    }
    assert.ok(demoRequests(role, "reimbursement").every((r) => r.kind === "reimbursement"));
  }
  assert.equal(isDemoCa({ id: "3f2c9d1e" }), false);
  // isi pop up contoh lengkap dan konsisten (saldo = plafon - terpakai)
  const ca = demoRequests("requester")[0];
  const p = demoDetailPayload(ca);
  assert.equal(p.forCa, ca);
  assert.equal(p.rabItems.reduce((n, i) => n + i.total, 0), ca.amount_requested);
  assert.equal(p.balanceRow.balance, ca.balance);
  assert.ok(p.receipts.every((r) => r.drive_view_url === null), "tanpa berkas yang diunduh dari server");
});

test("status tur dibaca dari metadata", () => {
  assert.deepEqual(readTourState(undefined), { status: TOUR_STATUS.NOT_STARTED, stepId: null });
  assert.deepEqual(readTourState({}), { status: TOUR_STATUS.NOT_STARTED, stepId: null });
  assert.deepEqual(
    readTourState({ tour: tourMetadata(TOUR_STATUS.IN_PROGRESS, "req-rab") }),
    { status: TOUR_STATUS.IN_PROGRESS, stepId: "req-rab" }
  );
  assert.equal(readTourState({ tour: tourMetadata(TOUR_STATUS.COMPLETED) }).status, TOUR_STATUS.COMPLETED);
  assert.equal(readTourState({ tour: tourMetadata(TOUR_STATUS.SKIPPED) }).status, TOUR_STATUS.SKIPPED);
});

test("metadata rusak atau versi lain diabaikan; penanda onboarding lama dianggap sudah melihat", () => {
  assert.equal(readTourState({ tour: { v: "v0", status: "completed" } }).status, TOUR_STATUS.NOT_STARTED);
  assert.equal(readTourState({ tour: { v: TOUR_VERSION, status: "aneh" } }).status, TOUR_STATUS.NOT_STARTED);
  assert.equal(readTourState({ onboarding_seen: "v1" }).status, TOUR_STATUS.COMPLETED);
  // tur baru menang atas penanda lama
  assert.equal(
    readTourState({ onboarding_seen: "v1", tour: tourMetadata(TOUR_STATUS.IN_PROGRESS, "nav") }).status,
    TOUR_STATUS.IN_PROGRESS
  );
});

test("melanjutkan tur: id dikenal -> indeksnya, tidak dikenal -> awal", () => {
  const steps = tourStepsFor("requester");
  assert.equal(resumeIndex(steps, steps[4].id), 4);
  assert.equal(resumeIndex(steps, "tidak-ada"), 0);
  assert.equal(resumeIndex(steps, null), 0);
});

// ───────── placement ─────────

const VP = { width: 1280, height: 800 };
const TIP = { width: 352, height: 220 };

test("sorotan dipotong ke viewport dan null bila di luar layar", () => {
  const h = spotlightRect({ left: 100, top: 100, width: 200, height: 50 }, VP);
  assert.deepEqual(h, { left: 94, top: 94, width: 212, height: 62 });
  const clipped = spotlightRect({ left: -40, top: 700, width: 200, height: 300 }, VP);
  assert.equal(clipped.left, 0);
  assert.equal(clipped.top + clipped.height, 800);
  assert.equal(spotlightRect({ left: 0, top: 2000, width: 10, height: 10 }, VP), null);
  assert.equal(spotlightRect({ left: 0, top: 0, width: 0, height: 10 }, VP), null);
});

test("tooltip desktop selalu berada di dalam viewport", () => {
  const holes = [
    { left: 0, top: 0, width: 100, height: 40 },
    { left: 1180, top: 760, width: 100, height: 40 },
    { left: 600, top: 380, width: 100, height: 40 },
    { left: 0, top: 0, width: 1280, height: 800 },
    { left: 250, top: 100, width: 300, height: 700 },
  ];
  for (const hole of holes) {
    for (const preferred of ["top", "bottom", "left", "right"]) {
      const p = computeTooltipPosition({ hole, tip: TIP, viewport: VP, preferred });
      assert.equal(p.kind, "float");
      assert.ok(p.left >= EDGE - 0.01 && p.left + TIP.width <= VP.width - EDGE + 0.01, `x ${JSON.stringify([hole, preferred, p])}`);
      assert.ok(p.top >= EDGE - 0.01 && p.top + TIP.height <= VP.height - EDGE + 0.01, `y ${JSON.stringify([hole, preferred, p])}`);
    }
  }
});

test("tooltip menghindari sorotan bila ada ruang", () => {
  const hole = { left: 600, top: 100, width: 200, height: 60 };
  const p = computeTooltipPosition({ hole, tip: TIP, viewport: VP, preferred: "bottom" });
  assert.equal(p.placement, "bottom");
  assert.ok(p.top >= hole.top + hole.height);
  // tidak muat di atas (elemen di pojok atas) -> pindah ke bawah
  const top = computeTooltipPosition({ hole: { left: 600, top: 10, width: 200, height: 40 }, tip: TIP, viewport: VP, preferred: "top" });
  assert.equal(top.placement, "bottom");
});

test("layar kecil: tooltip menempel di atas/bawah, tanpa sorotan -> tengah", () => {
  const vp = { width: 390, height: 780 };
  const tip = { width: 366, height: 240 };
  assert.deepEqual(
    computeTooltipPosition({ hole: { left: 10, top: 80, width: 300, height: 100 }, tip, viewport: vp }),
    { kind: "dock", edge: "bottom" }
  );
  assert.deepEqual(
    computeTooltipPosition({ hole: { left: 10, top: 600, width: 300, height: 150 }, tip, viewport: vp }),
    { kind: "dock", edge: "top" }
  );
  assert.deepEqual(computeTooltipPosition({ hole: null, tip, viewport: vp }), { kind: "center" });
});

test("gulir: tidak perlu bila sudah terlihat, delta menempatkan elemen di posisi nyaman", () => {
  assert.equal(needsScroll({ top: 200, height: 100 }, VP), false);
  assert.equal(needsScroll({ top: 900, height: 100 }, VP), true);
  assert.equal(needsScroll({ top: -50, height: 100 }, VP), true);
  assert.equal(needsScroll({ top: 600, height: 100 }, { width: 390, height: 780 }, 260), true);
  assert.equal(scrollDelta({ top: 900, height: 100 }, VP, false), 900 - (800 - 100) / 2);
  assert.equal(scrollDelta({ top: 900, height: 100 }, { width: 390, height: 780 }, true), 900 - 72);
});
