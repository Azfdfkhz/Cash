"use client";

import { createContext, useCallback, useContext, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Navigasi yang hanya mengubah query (?tab=, ?filter=, ?page=, ?jenis=) tetap
// di segmen halaman yang sama, jadi loading.js TIDAK tampil dan layar terlihat
// "membeku" sampai data baru tiba. Konteks ini membungkus navigasi tsb dalam
// transition supaya `pending` bisa dipakai menampilkan skeleton.
export const PendingNavContext = createContext({ pending: false, navigate: null });

export function usePendingNav() {
  return useContext(PendingNavContext);
}

export function PendingNavProvider({ children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = useCallback(
    (href, { replace = false, scroll } = {}) => {
      startTransition(() => {
        const options = scroll === undefined ? undefined : { scroll };
        if (replace) router.replace(href, options);
        else router.push(href, options);
      });
    },
    [router]
  );

  const value = useMemo(() => ({ pending, navigate }), [pending, navigate]);
  return <PendingNavContext.Provider value={value}>{children}</PendingNavContext.Provider>;
}

// <Link> yang ikut memicu `pending`. Di luar provider berperilaku seperti
// <Link> biasa. Klik dengan Ctrl/Cmd/Shift/tengah tetap membuka tab baru.
export function PendingLink({ href, onClick, replace = false, scroll, ...props }) {
  const { navigate } = usePendingNav();

  function handleClick(e) {
    onClick?.(e);
    if (e.defaultPrevented || !navigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (props.target && props.target !== "_self") return;
    e.preventDefault();
    navigate(href, { replace, scroll });
  }

  return <Link href={href} replace={replace} scroll={scroll} onClick={handleClick} {...props} />;
}

// Tampilkan `fallback` selama navigasi berlangsung, `children` selebihnya.
export function PendingContent({ children, fallback }) {
  const { pending } = usePendingNav();
  return pending ? fallback : children;
}
