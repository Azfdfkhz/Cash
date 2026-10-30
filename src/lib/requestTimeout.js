// Batas waktu kirim untuk aksi konfirmasi (pencairan, pengembalian, dst.).
// Bila lebih dari 15 detik belum selesai, permintaan dihentikan dan pengguna
// diminta klik ulang, supaya tidak menunggu tanpa kepastian di jaringan lambat.
export const REQUEST_TIMEOUT_MS = 15000;

export const TIMEOUT_MESSAGE =
  "Belum terkirim setelah 15 detik (koneksi mungkin lambat). Tekan tombolnya sekali lagi untuk mencoba ulang.";

export function createRequestTimer(ms = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const id = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
    get timedOut() {
      return timedOut;
    },
  };
}

// Lempar error batas waktu bila timer sudah habis (hasil abort kadang hanya
// muncul sebagai `error` dari Supabase, bukan exception).
export function assertNotTimedOut(timer) {
  if (timer.timedOut) throw new Error(TIMEOUT_MESSAGE);
}

export function toTimeoutError(err, timer) {
  if (timer.timedOut || err?.name === "AbortError") return new Error(TIMEOUT_MESSAGE);
  return err;
}
