import Link from "next/link";

// Pilihan jenis pengajuan di atas form "Ajukan".
export default function KindSwitch({ active }) {
  const items = [
    { kind: "cash_advance", href: "/cash-advances/new", label: "Cash Advance", hint: "Minta dana sebelum belanja" },
    { kind: "reimbursement", href: "/reimbursements/new", label: "Reimbursement", hint: "Klaim uang pribadi yang sudah terpakai" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 lg:max-w-md">
      {items.map((item) => (
        <Link
          key={item.kind}
          href={item.href}
          replace
          aria-current={active === item.kind ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-center transition-colors ${
            active === item.kind
              ? "bg-white shadow-sm text-brand"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="block text-sm font-semibold">{item.label}</span>
          <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">
            {item.hint}
          </span>
        </Link>
      ))}
    </div>
  );
}
