import test from "node:test";
import assert from "node:assert/strict";
import { MODAL, closeModal, isModalOpen, openModal } from "../src/lib/modalState.js";

// Alur modal v1.2.0: hanya satu modal aktif pada satu waktu.

test("membuka modal baru menggantikan modal yang aktif", () => {
  let m = openModal(null, MODAL.SCAN);
  assert.ok(isModalOpen(m, MODAL.SCAN));
  m = openModal(m, MODAL.RETURN);
  assert.ok(isModalOpen(m, MODAL.RETURN));
  assert.ok(!isModalOpen(m, MODAL.SCAN), "kwitansi harus tertutup");
});

test("Catat kwitansi -> Kembalikan Sisa: hanya Kembalikan Sisa yang terbuka", () => {
  const m = openModal(openModal(null, MODAL.SCAN), MODAL.RETURN);
  assert.equal(m.name, MODAL.RETURN);
});

test("Catat kwitansi -> Lihat Detail: hanya Detail yang tampil", () => {
  const m = openModal(openModal(null, MODAL.SCAN), MODAL.DETAIL, { focus: null });
  assert.equal(m.name, MODAL.DETAIL);
});

test("Setujui -> dialog persetujuan -> Lihat Detail: dialog tertutup, Detail tampil", () => {
  let m = openModal(null, MODAL.DECISION, { step: "disburse" });
  assert.equal(m.step, "disburse");
  m = openModal(m, MODAL.DETAIL, { focus: null });
  assert.equal(m.name, MODAL.DETAIL);
  assert.equal(m.step, undefined, "parameter modal lama tidak ikut terbawa");
});

test("menutup Detail kembali ke halaman sebelumnya tanpa membuka modal lain", () => {
  const m = openModal(openModal(null, MODAL.DECISION, { step: "disburse" }), MODAL.DETAIL);
  assert.equal(closeModal(m, MODAL.DETAIL), null);
  assert.equal(closeModal(m), null);
});

test("callback tutup yang terlambat tidak menutup modal yang baru", () => {
  const m = openModal(openModal(null, MODAL.SCAN), MODAL.DETAIL);
  assert.equal(closeModal(m, MODAL.SCAN), m);
  assert.ok(isModalOpen(closeModal(m, MODAL.SCAN), MODAL.DETAIL));
});

test("menutup saat tidak ada modal aman", () => {
  assert.equal(closeModal(null, MODAL.SCAN), null);
  assert.ok(!isModalOpen(null, MODAL.SCAN));
});
