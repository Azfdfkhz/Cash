import test from "node:test";
import assert from "node:assert/strict";
import {
  GLOSSARY, HELP_MAX_CHARS, HELP_TOPICS, ROLE_FLOW, normalizeHelpRole,
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

// Standar keterbacaan v1.2.0: Pusat Bantuan & Glosarium maksimal 80 karakter
// per paragraf / unit penjelasan (bukan ukuran font).
test("setiap unit penjelasan Pusat Bantuan maksimal 80 karakter", () => {
  assert.equal(HELP_MAX_CHARS, 80);
  const tooLong = [];
  const check = (text, where) => {
    if (typeof text !== "string" || text.length > HELP_MAX_CHARS) tooLong.push(`${where} (${text?.length})`);
  };
  for (const [role, steps] of Object.entries(ROLE_FLOW)) {
    steps.forEach((s, i) => check(s.body, `flow.${role}[${i}]`));
  }
  for (const t of HELP_TOPICS) {
    check(t.summary, `${t.id}.summary`);
    check(t.common, `${t.id}.common`);
    for (const key of ["details", "requester", "operational"]) {
      (t[key] ?? []).forEach((x, i) => check(x, `${t.id}.${key}[${i}]`));
    }
  }
  assert.deepEqual(tooLong, []);
});

test("setiap penjelasan glosarium maksimal 80 karakter", () => {
  const tooLong = GLOSSARY.filter((g) => g.meaning.length > HELP_MAX_CHARS).map((g) => g.term);
  assert.deepEqual(tooLong, []);
});
