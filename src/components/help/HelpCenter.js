"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, PlayCircle, Search } from "lucide-react";
import {
  GLOSSARY,
  HELP_ROLES,
  HELP_TOPICS,
  ROLE_FLOW,
  normalizeHelpRole,
} from "@/lib/helpContent";
import { START_TOUR_EVENT } from "@/lib/tour/tourConfig";

function RoleTabs({ role, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Pilih panduan sesuai peran"
      className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100/80 p-1 sm:w-auto"
    >
      {HELP_ROLES.map((r) => {
        const active = r.id === role;
        return (
          <button
            key={r.id}
            type="button"
            role="tab"
            id={`help-tab-${r.id}`}
            aria-selected={active}
            aria-controls="help-panel"
            onClick={() => onChange(r.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors sm:flex-none ${
              active
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

function Steps({ items }) {
  return (
    <ol className="space-y-3">
      {items.map((s, i) => (
        <li key={s.title} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">{s.title}</p>
            <p className="mt-0.5 text-base leading-relaxed text-slate-700">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Topic({ topic, role, open, onToggle }) {
  const items = topic[role] ?? [];
  const roleLabel = HELP_ROLES.find((r) => r.id === role)?.label ?? "";
  const panelId = `topic-${topic.id}`;
  return (
    <div id={topic.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="min-w-0">
            <span className="block text-base font-bold text-slate-900">{topic.title}</span>
            <span className="mt-0.5 block text-sm text-slate-600">{topic.summary}</span>
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      {open && (
        <div id={panelId} className="space-y-3 border-t border-slate-100 px-5 pb-5 pt-4">
          <p className="text-base font-semibold leading-relaxed text-slate-900">{topic.common}</p>
          {topic.details?.length > 0 && (
            <ul className="list-disc space-y-1.5 pl-5 text-base leading-relaxed text-slate-700 marker:text-slate-500">
              {topic.details.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <>
              <h4 className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                Langkah untuk {roleLabel}
              </h4>
              <ol className="list-decimal space-y-1.5 pl-5 text-base leading-relaxed text-slate-700 marker:text-slate-500">
                {items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Pusat Bantuan: dipakai di dalam aplikasi (/help) dan halaman publik
// (/bantuan). `canReplayTour` hanya benar di dalam aplikasi, karena
// tur interaktif berada di layout aplikasi.
export default function HelpCenter({ defaultRole = "requester", canReplayTour = false }) {
  const [role, setRole] = useState(normalizeHelpRole(defaultRole));
  const [openId, setOpenId] = useState(HELP_TOPICS[0].id);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const glossary = q
    ? GLOSSARY.filter((g) => `${g.term} ${g.meaning}`.toLowerCase().includes(q))
    : GLOSSARY;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Pusat bantuan</h1>
        <p className="text-sm text-slate-700">Panduan alur dana, bukti, dan pengembalian sisa saldo.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <RoleTabs role={role} onChange={setRole} />
          {canReplayTour && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <PlayCircle size={16} aria-hidden="true" />
              Panduan interaktif · Mulai tur ulang
            </button>
          )}
        </div>
      </header>

      <div id="help-panel" role="tabpanel" aria-labelledby={`help-tab-${role}`} className="space-y-6">
        <section aria-labelledby="help-flow" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="help-flow" className="mb-4 text-base font-bold text-slate-900">
            Ringkasan alur untuk {HELP_ROLES.find((r) => r.id === role).label}
          </h2>
          <Steps items={ROLE_FLOW[role]} />
        </section>

        <section aria-labelledby="help-topics" className="space-y-3">
          <h2 id="help-topics" className="text-base font-bold text-slate-900">
            Panduan per topik
          </h2>
          {HELP_TOPICS.map((t) => (
            <Topic
              key={t.id}
              topic={t}
              role={role}
              open={openId === t.id}
              onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            />
          ))}
        </section>
      </div>

      <section aria-labelledby="help-glossary" className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="help-glossary" className="text-base font-bold text-slate-900">
            Glosarium istilah
          </h2>
          <label className="relative block sm:w-64">
            <span className="sr-only">Cari istilah</span>
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari istilah"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brand focus:outline-none"
            />
          </label>
        </div>
        {glossary.length === 0 ? (
          <p className="text-sm text-slate-600">Istilah tidak ditemukan.</p>
        ) : (
          <dl className="divide-y divide-slate-100">
            {glossary.map((g) => (
              <div key={g.term} className="py-3 sm:grid sm:grid-cols-[14rem_1fr] sm:gap-4">
                <dt className="text-base font-semibold text-slate-900">{g.term}</dt>
                <dd className="mt-0.5 text-base leading-relaxed text-slate-700 sm:mt-0">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <p className="text-xs text-slate-600">
        Masih bingung? Hubungi Tim Operasional di organisasi Anda.{" "}
        {!canReplayTour && (
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Kembali ke halaman masuk
          </Link>
        )}
      </p>
    </div>
  );
}
