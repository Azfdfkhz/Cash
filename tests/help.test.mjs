import test from "node:test";
import assert from "node:assert/strict";
import {
  GLOSSARY, HELP_TOPICS, normalizeHelpRole,
} from "../src/lib/helpContent.js";

test("peran tak dikenal jatuh ke requester", () => {
  assert.equal(normalizeHelpRole("operational"), "operational");
  assert.equal(normalizeHelpRole("requester"), "requester");
  assert.equal(normalizeHelpRole(undefined), "requester");
  assert.equal(normalizeHelpRole("admin"), "requester");
});

test("semua topik wajib ada dan punya panduan untuk kedua peran", () => {
  const ids = HELP_TOPICS.map((t) => t.id);
  for (const id of ["alur-cash-advance", "alur-reimbursement", "persetujuan", "pencairan", "bukti-transaksi", "spj", "pengembalian"]) {
    assert.ok(ids.includes(id), `topik ${id} hilang`);
  }
  for (const t of HELP_TOPICS) {
    assert.ok(t.common?.length > 20, t.id);
    assert.ok(t.requester?.length > 0, `${t.id} requester`);
    assert.ok(t.operational?.length > 0, `${t.id} operasional`);
  }
});

test("glosarium: istilah unik, 'M' ambigu tidak dipakai", () => {
  const terms = GLOSSARY.map((g) => g.term);
  assert.equal(new Set(terms).size, terms.length);
  assert.ok(!terms.includes("M"));
  assert.ok(terms.includes("miliar") && terms.includes("jt"));
});
