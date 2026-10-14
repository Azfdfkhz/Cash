// Satu bar placeholder generik (garis teks pulsing) dipakai di berbagai
// loading.js supaya tidak menulis ulang className yang sama berkali-kali.
export default function Bar({ className = "" }) {
  return <div className={`bg-slate-200 rounded ${className}`} />;
}
