// Salin worker pdf.js ke public/pdfjs/ supaya tersaji di alamat tetap
// (/pdfjs/pdf.worker.min.mjs). Worker yang di-bundle lewat
// `new URL(..., import.meta.url)` menghasilkan alamat /_next/static/media/...
// yang 404 di Vercel (aset di sana ada di /_next/static/immutable/...).
// Dijalankan otomatis sebelum `dev` dan `build`, jadi selalu sama versinya
// dengan pdfjs-dist yang terpasang.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve("pdfjs-dist/package.json")), "build", "pdf.worker.min.mjs");
const destDir = join(process.cwd(), "public", "pdfjs");
mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, "pdf.worker.min.mjs"));
console.log("pdf.js worker -> public/pdfjs/pdf.worker.min.mjs");
