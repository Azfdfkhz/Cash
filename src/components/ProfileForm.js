"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Mail,
  Pencil,
  Send,
  User,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BankInput from "@/components/BankInput";
import { maskAccountNumber, maskChatId, maskEmail } from "@/lib/utils";

const REVEAL_SECONDS = 30;

// Satu baris isian: kotak ikon + label kecil + nilai (sesuai desain Figma).
function Row({ icon: Icon, label, children, trailing }) {
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-3.5 first:border-t-0 focus-within:bg-slate-50/60">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-xs text-slate-500">{label}</span>
        {children}
      </div>
      {trailing}
    </div>
  );
}

const valueCls =
  "mt-0.5 block w-full bg-transparent text-[15px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-500 focus:outline-none";
const textCls = `${valueCls} truncate`;
const sectionLabel =
  "mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500";
const cardCls = "overflow-hidden rounded-2xl border border-slate-200 bg-white";

function Dialog({ title, children, actions }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <div className="mt-2 text-sm text-slate-600">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

const ghostBtn =
  "rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const primaryBtn =
  "rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";

export default function ProfileForm({
  profileId,
  username: initialUsername,
  email,
  initialChatId,
  initialBankName,
  initialBankAccountNumber,
  initialBankAccountHolder,
  botUsername,
  canReauthWithPassword = true,
}) {
  // Akun email punya password sejak awal; akun Google bisa membuatnya sendiri
  // (dikonfirmasi lewat kode yang dikirim ke email) untuk membuka nomor rekening.
  const [hasPassword, setHasPassword] = useState(canReauthWithPassword);
  const router = useRouter();

  // Nilai tersimpan (dipakai tampilan baca). Draft hanya ada saat mode edit.
  const [saved, setSaved] = useState({
    username: initialUsername || "",
    chatId: initialChatId || "",
    bankName: initialBankName || "",
    accountNumber: initialBankAccountNumber || "",
    accountHolder: initialBankAccountHolder || "",
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);
  // Nomor rekening di mode edit dikosongkan: kosong = pakai nomor lama, jadi
  // nomor lengkap tidak terbuka hanya karena membuka form edit.
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // Lihat nomor rekening lengkap (butuh autentikasi ulang).
  const [revealed, setRevealed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authInfo, setAuthInfo] = useState("");
  // Alur buat password (akun Google): "ask" -> "code" (kode email + password baru)
  const [setupStep, setSetupStep] = useState("ask");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hideTimer = useRef(null);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function hideAccount() {
    clearTimeout(hideTimer.current);
    setRevealed(false);
  }

  function showAccount() {
    setRevealed(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRevealed(false), REVEAL_SECONDS * 1000);
  }

  function startReveal() {
    if (!saved.accountNumber) return;
    setPassword("");
    setAuthError("");
    setAuthInfo("");
    setSetupStep("ask");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setAuthOpen(true);
  }

  async function submitReauth(e) {
    e?.preventDefault();
    setAuthError("");
    if (hasPassword) {
      if (!password) {
        setAuthError("Masukkan password Anda.");
        return;
      }
      setAuthBusy(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setAuthBusy(false);
      if (error) {
        setAuthError("Password salah.");
        return;
      }
    }
    setPassword("");
    setAuthOpen(false);
    showAccount();
  }

  // Lupa password: kirim tautan reset ke email akun. Setelah mengatur password
  // baru, user kembali ke Profil dan bisa membuka nomor rekening.
  async function sendResetLink() {
    setAuthError("");
    setAuthInfo("");
    setAuthBusy(true);
    const supabase = createClient();
    const next = encodeURIComponent("/reset-password?next=/profile");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
    });
    setAuthBusy(false);
    if (error) {
      setAuthError("Gagal mengirim tautan reset. Coba lagi sebentar lagi.");
      return;
    }
    setAuthInfo(`Tautan reset password dikirim ke ${maskEmail(email)}. Buka email itu untuk membuat password baru.`);
  }

  // Akun Google: minta kode konfirmasi ke email sebelum membuat password.
  async function sendSetupCode() {
    setAuthError("");
    setAuthInfo("");
    setAuthBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.reauthenticate();
    setAuthBusy(false);
    if (error) {
      setAuthError("Gagal mengirim kode ke email. Coba lagi sebentar lagi.");
      return;
    }
    setAuthInfo(`Kode konfirmasi dikirim ke ${maskEmail(email)}.`);
    setSetupStep("code");
  }

  async function submitSetup(e) {
    e?.preventDefault();
    setAuthError("");
    if (!/^\d{6,10}$/.test(code.trim())) {
      setAuthError("Kode dari email berupa 6 angka. Periksa kembali kode Anda.");
      return;
    }
    if (newPassword.length < 8) {
      setAuthError("Password minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError("Konfirmasi password tidak sama.");
      return;
    }
    setAuthBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: code.trim(),
      data: { has_password: true },
    });
    setAuthBusy(false);
    if (error) {
      setAuthError("Kode salah atau sudah kedaluwarsa. Kirim ulang kode lalu coba lagi.");
      return;
    }
    setHasPassword(true);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setAuthOpen(false);
    showAccount();
  }

  function startEdit() {
    setDraft(saved);
    setNewAccountNumber("");
    setErrors({});
    setServerError("");
    setJustSaved(false);
    hideAccount();
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setErrors({});
    setServerError("");
  }

  function validate() {
    const next = {};
    const username = draft.username.trim();
    const bank = draft.bankName.trim();
    const holder = draft.accountHolder.trim();
    const number = newAccountNumber || saved.accountNumber;
    const anyBank = bank || holder || number;

    // Format & panjang username: huruf kecil, angka, titik, underscore,
    // 3–30 karakter (sama dengan batas & pola yang dijaga di database).
    if (username) {
      if (username.length < 3 || username.length > 30) {
        next.username = "Username 3–30 karakter.";
      } else if (!/^[a-z0-9_.]+$/.test(username)) {
        next.username = "Username hanya huruf kecil, angka, titik, dan underscore.";
      }
    }

    if (anyBank) {
      if (!bank) next.bankName = "Nama bank wajib diisi.";
      if (!number) next.accountNumber = "Nomor rekening wajib diisi.";
      else if (number.length < 6 || number.length > 20)
        next.accountNumber = "Nomor rekening 6–20 digit.";
      if (!holder) next.accountHolder = "Atas nama rekening wajib diisi.";
    }
    if (draft.chatId && !/^-?\d{5,15}$/.test(draft.chatId)) {
      next.chatId = "Chat ID berupa angka (5–15 digit).";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    if (validate()) setConfirming(true);
  }

  async function confirmSave() {
    setSaving(true);
    setServerError("");
    const accountNumber = newAccountNumber || saved.accountNumber;
    // Username kosong -> tidak diubah (null hanya dikirim kalau memang
    // sebelumnya belum diisi); dinormalisasi huruf kecil, sumber kebenaran
    // tetap kolom `username` di tabel profiles (bukan full_name).
    const username = draft.username.trim().toLowerCase();
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username || null,
        telegram_chat_id: draft.chatId || null,
        bank_name: draft.bankName.trim() || null,
        bank_account_number: accountNumber.trim() || null,
        bank_account_holder: draft.accountHolder.trim() || null,
      })
      .eq("id", profileId);
    setSaving(false);
    setConfirming(false);

    if (error) {
      // 23505 = unique_violation (idx_profiles_username_lower) -> username
      // sudah dipakai orang lain. Email, ID akun, dan relasi pengajuan
      // (requester_id dst. memakai id, bukan username) tidak tersentuh sama
      // sekali oleh update ini.
      setServerError(
        error.code === "23505"
          ? "Username sudah dipakai. Coba username lain."
          : "Gagal menyimpan. Coba lagi."
      );
      return;
    }

    setSaved({
      username,
      chatId: draft.chatId,
      bankName: draft.bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: draft.accountHolder.trim(),
    });
    setEditing(false);
    setJustSaved(true);
    router.refresh();
  }

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const fieldError = (key) =>
    errors[key] ? <p className="mt-1 text-xs text-rose-600">{errors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {serverError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </div>
      )}
      {justSaved && !editing && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Profil tersimpan.
        </div>
      )}

      <section data-tour="profile-account">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Informasi Akun
          </h2>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-full border border-brand px-3 py-1 text-xs font-semibold text-brand transition-colors hover:bg-primary-muted"
            >
              <Pencil size={13} strokeWidth={2} />
              Edit profil
            </button>
          )}
        </div>

        <div className={cardCls}>
          <Row icon={User} label="Username">
            {editing ? (
              <>
                <input
                  type="text"
                  autoComplete="username"
                  value={draft.username}
                  onChange={(e) =>
                    set("username")(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                  }
                  className={valueCls}
                  placeholder="Contoh: rina.w"
                  maxLength={30}
                />
                {fieldError("username")}
              </>
            ) : (
              <p className={textCls}>{saved.username || "Belum diatur"}</p>
            )}
          </Row>
          <Row icon={Mail} label="Email">
            <p className={textCls}>{maskEmail(email) || "-"}</p>
          </Row>

          <Row icon={Landmark} label="Bank tujuan transfer">
            {editing ? (
              <>
                <BankInput
                  value={draft.bankName}
                  onChange={set("bankName")}
                  className={valueCls}
                  placeholder="Contoh: BCA, Mandiri, BRI"
                />
                {fieldError("bankName")}
              </>
            ) : (
              <p className={textCls}>{saved.bankName || "Belum diisi"}</p>
            )}
          </Row>

          <Row
            icon={CreditCard}
            label="No. rekening"
            trailing={
              !editing && saved.accountNumber ? (
                <button
                  type="button"
                  onClick={revealed ? hideAccount : startReveal}
                  aria-label={revealed ? "Sembunyikan nomor rekening" : "Lihat nomor rekening lengkap"}
                  aria-pressed={revealed}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              ) : null
            }
          >
            {editing ? (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className={valueCls}
                  placeholder={
                    saved.accountNumber
                      ? `${maskAccountNumber(saved.accountNumber)} — ketik untuk mengganti`
                      : "Nomor rekening penerima"
                  }
                />
                {fieldError("accountNumber")}
              </>
            ) : (
              <p className={`${textCls} tabular-nums`}>
                {saved.accountNumber
                  ? revealed
                    ? saved.accountNumber
                    : maskAccountNumber(saved.accountNumber)
                  : "Belum diisi"}
              </p>
            )}
          </Row>

          <Row icon={UserRound} label="Atas nama rekening">
            {editing ? (
              <>
                <input
                  type="text"
                  value={draft.accountHolder}
                  onChange={(e) => set("accountHolder")(e.target.value)}
                  className={valueCls}
                  placeholder="Nama pemilik rekening sesuai buku tabungan"
                />
                {fieldError("accountHolder")}
              </>
            ) : (
              <p className={textCls}>{saved.accountHolder || "Belum diisi"}</p>
            )}
          </Row>
        </div>
        <p className="mt-2 px-1 text-xs leading-relaxed text-slate-500">
          Rekening ini otomatis terisi saat mengajukan Cash Advance atau Reimbursement, jadi tidak
          perlu diketik ulang dan tidak perlu ditampilkan penuh di sini. Tetap bisa diubah per
          pengajuan.
        </p>
      </section>

      <section data-tour="profile-telegram">
        <h2 className={sectionLabel}>Integrasi &amp; Notifikasi</h2>
        <div className={cardCls}>
          <Row
            icon={Bell}
            label="Notifikasi Telegram"
            trailing={
              !editing ? (
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                    saved.chatId
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {saved.chatId ? "Terhubung" : "Belum terhubung"}
                </span>
              ) : null
            }
          >
            {!editing && (
              <p className={textCls}>
                {saved.chatId ? `Chat ID ${maskChatId(saved.chatId)}` : "Belum diatur"}
              </p>
            )}
          </Row>

          {editing && (
            <>
              <Row
                icon={Send}
                label="Telegram Chat ID"
                trailing={
                  <a
                    href="https://t.me/userinfobot?start=start"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full border border-brand px-4 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-primary-muted"
                  >
                    Open Telegram
                  </a>
                }
              >
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.chatId}
                  onChange={(e) => set("chatId")(e.target.value.replace(/[^\d-]/g, ""))}
                  className={valueCls}
                  placeholder="Contoh: 123456789"
                />
                {fieldError("chatId")}
              </Row>
              <div className="border-t border-slate-100 px-5 py-4 text-xs leading-relaxed text-slate-500">
                <p>
                  Diisi supaya Anda dapat notifikasi Telegram saat pengajuan Cash Advance disetujui
                  atau ditolak. Caranya:
                </p>
                <ol className="mt-2 space-y-1">
                  <li>
                    1. Chat bot <span className="font-medium">@Userinfobot</span> di Telegram untuk
                    tahu Chat ID Anda (angka).
                  </li>
                  <li>
                    2. Cari bot notifikasi perusahaan
                    {botUsername && (
                      <>
                        {" "}
                        (
                        <a
                          href={`https://t.me/${botUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand underline"
                        >
                          @{botUsername}
                        </a>
                        )
                      </>
                    )}{" "}
                    dan tekan <span className="font-medium">/start</span> (wajib, kalau tidak
                    notifikasi tidak akan terkirim).
                  </li>
                  <li>3. Masukkan Chat ID dari langkah 1 di sini.</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </section>

      {editing && (
        <div className="flex flex-col gap-2 lg:flex-row lg:justify-end">
          <button type="button" onClick={cancelEdit} className={`${ghostBtn} py-3 lg:py-2.5`}>
            Batal
          </button>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand py-3 font-medium text-white transition-colors hover:bg-brand-dark lg:w-auto lg:px-8 lg:py-2.5"
          >
            Simpan
          </button>
        </div>
      )}

      {confirming && (
        <Dialog
          title="Simpan perubahan profil?"
          actions={
            <>
              <button type="button" onClick={() => setConfirming(false)} disabled={saving} className={ghostBtn}>
                Periksa lagi
              </button>
              <button type="button" onClick={confirmSave} disabled={saving} className={primaryBtn}>
                {saving ? "Menyimpan..." : "Ya, simpan"}
              </button>
            </>
          }
        >
          <p>Data rekening dan Telegram baru akan dipakai untuk pengajuan dan notifikasi berikutnya.</p>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            <li>Username: {draft.username.trim() || "tidak diatur"}</li>
            <li>
              Rekening: {draft.bankName.trim() || "-"}{" "}
              {maskAccountNumber(newAccountNumber || saved.accountNumber)}
            </li>
            <li>Atas nama: {draft.accountHolder.trim() || "-"}</li>
            <li>Telegram: {draft.chatId ? maskChatId(draft.chatId) : "tidak diatur"}</li>
          </ul>
        </Dialog>
      )}

      {authOpen && (
        <Dialog
          title={hasPassword || setupStep === "ask" ? "Lihat nomor rekening lengkap" : "Buat password konfirmasi"}
          actions={
            <>
              <button type="button" onClick={() => setAuthOpen(false)} disabled={authBusy} className={ghostBtn}>
                Batal
              </button>
              {hasPassword ? (
                <button type="button" onClick={submitReauth} disabled={authBusy} className={primaryBtn}>
                  {authBusy ? "Memeriksa..." : "Tampilkan"}
                </button>
              ) : setupStep === "ask" ? (
                <button type="button" onClick={sendSetupCode} disabled={authBusy} className={primaryBtn}>
                  {authBusy ? "Mengirim..." : "Kirim kode ke email"}
                </button>
              ) : (
                <button type="button" onClick={submitSetup} disabled={authBusy} className={primaryBtn}>
                  {authBusy ? "Menyimpan..." : "Simpan & tampilkan"}
                </button>
              )}
            </>
          }
        >
          {hasPassword ? (
            <>
              <p>Masukkan password untuk melanjutkan. Nomor akan disembunyikan lagi otomatis dalam {REVEAL_SECONDS} detik.</p>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReauth(e)}
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Password"
              />
              {authError && <p className="mt-1 text-xs text-rose-600">{authError}</p>}
              {authInfo && <p className="mt-2 text-xs text-emerald-700">{authInfo}</p>}
              <button
                type="button"
                onClick={sendResetLink}
                disabled={authBusy}
                className="mt-2 text-xs font-semibold text-brand hover:underline disabled:opacity-60"
              >
                Lupa password? Kirim tautan reset ke email
              </button>
            </>
          ) : setupStep === "ask" ? (
            <>
              <p>
                Akun Anda masuk lewat Google, jadi belum punya password. Untuk melihat nomor
                rekening lengkap, buat password konfirmasi dulu. Kami kirim kode ke{" "}
                <span className="font-semibold">{maskEmail(email)}</span> untuk memastikan ini Anda.
              </p>
              {authError && <p className="mt-2 text-xs text-rose-600">{authError}</p>}
            </>
          ) : (
            <>
              {authInfo && <p className="text-xs text-emerald-700">{authInfo}</p>}
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submitSetup(e)}
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Kode dari email"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSetup(e)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Password baru (min. 8 karakter)"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSetup(e)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Ulangi password baru"
              />
              {authError && <p className="mt-1 text-xs text-rose-600">{authError}</p>}
              <button
                type="button"
                onClick={sendSetupCode}
                disabled={authBusy}
                className="mt-2 text-xs font-semibold text-brand hover:underline disabled:opacity-60"
              >
                Kirim ulang kode
              </button>
            </>
          )}
        </Dialog>
      )}
    </form>
  );
}
