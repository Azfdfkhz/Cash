import test from "node:test";
import assert from "node:assert/strict";
import { formatCompactIdr, formatCurrency, nextAction } from "../src/lib/utils.js";

// Intl memakai spasi tak-putus (U+00A0) antara "Rp" dan angka; samakan untuk perbandingan.
const n = (s) => s.replace(/\u00a0/g, " ");

test("nol", () => {
  assert.equal(n(formatCompactIdr(0)), "Rp 0");
  assert.equal(n(formatCompactIdr(null)), "Rp 0");
  assert.equal(n(formatCompactIdr(undefined)), "Rp 0");
  assert.equal(n(formatCompactIdr("abc")), "Rp 0");
});

test("ribuan (di bawah 1 juta) tampil penuh", () => {
  assert.equal(n(formatCompactIdr(500)), "Rp 500");
  assert.equal(n(formatCompactIdr(950_000)), "Rp 950.000");
  assert.equal(n(formatCompactIdr(999_999)), "Rp 999.999");
});

test("jutaan memakai 'jt'", () => {
  assert.equal(formatCompactIdr(1_000_000), "Rp 1 jt");
  assert.equal(formatCompactIdr(1_850_000), "Rp 1,85 jt");
  assert.equal(formatCompactIdr(15_000_000), "Rp 15 jt");
  assert.equal(formatCompactIdr(100_000_000), "Rp 100 jt");
  assert.equal(formatCompactIdr(250_500_000), "Rp 250,5 jt");
});

test("miliaran memakai 'miliar', tidak ada 'M'", () => {
  assert.equal(formatCompactIdr(1_000_000_000), "Rp 1 miliar");
  assert.equal(formatCompactIdr(17_000_000_000), "Rp 17 miliar");
  assert.equal(formatCompactIdr(2_345_000_000), "Rp 2,35 miliar");
  assert.equal(formatCompactIdr(999_000_000_000), "Rp 999 miliar");
});

test("triliun menggantikan 'T'", () => {
  assert.equal(formatCompactIdr(2_500_000_000_000), "Rp 2,5 triliun");
});

test("pembulatan tidak menghasilkan '1000 jt' / '1000 miliar'", () => {
  assert.equal(formatCompactIdr(999_999_999), "Rp 1 miliar");
  assert.equal(formatCompactIdr(999_999_999_999), "Rp 1 triliun");
  assert.equal(formatCompactIdr(999_990_000), "Rp 999,99 jt");
});

test("tidak ada satuan ambigu 'M' atau 'T' di keluaran", () => {
  for (const v of [1e6, 3.3e7, 1e9, 1.7e10, 5.5e11, 1e12, 4e12]) {
    assert.doesNotMatch(formatCompactIdr(v), /\b[MT]\b/);
  }
});

test("opsi long: 'miliar rupiah' / 'juta rupiah'", () => {
  assert.equal(formatCompactIdr(17_000_000_000, { long: true }), "17 miliar rupiah");
  assert.equal(formatCompactIdr(1_850_000, { long: true }), "1,85 juta rupiah");
});

test("opsi prefix:false menghilangkan 'Rp '", () => {
  assert.equal(formatCompactIdr(17_000_000_000, { prefix: false }), "17 miliar");
  assert.equal(formatCompactIdr(1_850_000, { prefix: false }), "1,85 jt");
});

test("negatif", () => {
  assert.equal(formatCompactIdr(-1_850_000), "-Rp 1,85 jt");
  assert.equal(formatCompactIdr(-17_000_000_000), "-Rp 17 miliar");
});

test("nilai asli tidak diubah (fungsi murni; formatCurrency tetap penuh)", () => {
  const v = 17_123_456_789;
  formatCompactIdr(v);
  assert.equal(v, 17_123_456_789);
  assert.equal(n(formatCurrency(v)), "Rp 17.123.456.789");
});

test("nextAction: teks ringkas + title nominal penuh", () => {
  const ca = { status: "approved", disbursed_at: "2026-01-01", kind: "cash_advance", balance: 17_000_000_000 };
  const a = nextAction(ca, false);
  assert.match(a.text, /Rp 17 miliar/);
  assert.match(n(a.title), /Rp 17\.000\.000\.000/);
});
