"use client";

// Cadangan terakhir bila layout utama sendiri gagal dimuat. Harus membawa
// <html>/<body> sendiri dan tidak boleh bergantung pada komponen lain.
export default function GlobalError() {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, Arial, sans-serif", padding: "3rem 1.5rem", textAlign: "center", color: "#172033" }}>
        <h1 style={{ fontSize: "1.5rem" }}>Terjadi kesalahan</h1>
        <p style={{ color: "#475569" }}>Aplikasi gagal dimuat. Muat ulang halaman, atau hubungi tim pengelola bila berlanjut.</p>
        <a href="/dashboard" style={{ color: "#1d4ed8", fontWeight: 600 }}>Ke Beranda</a>
      </body>
    </html>
  );
}
