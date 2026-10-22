// Tautan ke bot Telegram yang langsung membuka APLIKASI Telegram (bukan
// halaman web) dan menampilkan tombol START di chat bot.
//
// Telegram tidak mengizinkan sebuah tautan mengirim pesan "/start" atas nama
// pengguna. Yang bisa dilakukan: parameter ?start= membuat chat bot terbuka
// dengan tombol MULAI/START yang sudah siap -- pengguna cukup menekannya
// satu kali (setara mengetik /start).

export const USERINFO_BOT = "userinfobot";
export const NOTIFY_BOT =
  (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "JejakSakuBot").replace(/^@/, "");

const START_PAYLOAD = "start";

export function telegramWebUrl(username) {
  return `https://t.me/${username}?start=${START_PAYLOAD}`;
}

export function telegramAppUrl(username) {
  return `tg://resolve?domain=${username}&start=${START_PAYLOAD}`;
}

// Coba buka aplikasi Telegram dulu. Kalau halaman tidak kehilangan fokus
// (aplikasi tidak terpasang / diblokir), buka versi web sebagai cadangan.
export function openTelegramBot(username) {
  if (typeof window === "undefined") return;
  let appOpened = false;
  const markOpened = () => {
    appOpened = true;
  };
  window.addEventListener("blur", markOpened, { once: true });
  document.addEventListener("visibilitychange", markOpened, { once: true });

  window.location.href = telegramAppUrl(username);

  setTimeout(() => {
    window.removeEventListener("blur", markOpened);
    document.removeEventListener("visibilitychange", markOpened);
    if (!appOpened && !document.hidden) {
      window.open(telegramWebUrl(username), "_blank", "noopener,noreferrer");
    }
  }, 1500);
}
