import { useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { can } from "../lib/types";
import type { View } from "../lib/types";
import { fmtDateTime, fmtTime, todayISO } from "../lib/format";
import { I, type IconName } from "./icons";
import { Chip, RoleChip, cx } from "./ui";

const NAV: { view: View; label: string; icon: IconName }[] = [
  { view: "dashboard", label: "Dashboard", icon: "gauge" },
  { view: "pedidos", label: "Pedidos", icon: "board" },
  { view: "reservas", label: "Reservas", icon: "calendar" },
  { view: "clientes", label: "Clientes", icon: "users" },
  { view: "productos", label: "Productos y Recetas", icon: "cake" },
  { view: "inventario", label: "Inventario", icon: "boxes" },
  { view: "caja", label: "Caja", icon: "register" },
  { view: "reparto", label: "Reparto", icon: "scooter" },
];

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 rounded-xl bg-cocoa-800 border border-crema/12 flex items-center justify-center overflow-hidden shrink-0">
        <I n="cake" className="w-6 h-6 text-fresa" />
        <span className="absolute -bottom-1 left-0 right-0 h-1.5 bg-caramelo/70" />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="font-display font-black text-lg tracking-tight">
            Tortas <span className="text-fresa italic">Demo</span>
          </p>
          <p className="eyebrow mt-1">ERP · Casa de ventas</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const me = useApp((s) => s.users.find((u) => u.id === s.currentUserId));
  const logout = useApp((s) => s.logout);
  const orders = useApp((s) => s.orders);
  const inventory = useApp((s) => s.inventory);
  const deliveries = useApp((s) => s.deliveries);

  const badges: Partial<Record<View, number>> = useMemo(() => {
    const pending = orders.filter((o) => !["entregado", "cancelado"].includes(o.status) && o.scheduled_date === todayISO()).length;
    const low = inventory.filter((i) => i.qty <= i.min_qty).length;
    const deliv = deliveries.filter((d) => {
      const o = orders.find((x) => x.id === d.order_id);
      return o?.scheduled_date === todayISO() && d.status !== "entregado";
    }).length;
    return { pedidos: pending, inventario: low, reparto: deliv };
  }, [orders, inventory, deliveries]);

  const nav = NAV.filter((n) => n.view !== "auditoria");

  const body = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5">
        <Brand />
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map((n) => (
          <button
            key={n.view}
            onClick={() => {
              setView(n.view);
              onClose();
            }}
            className={cx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer group relative",
              view === n.view ? "bg-crema/10 text-crema" : "text-crema/50 hover:text-crema hover:bg-crema/5"
            )}
          >
            <span
              className={cx(
                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-fresa transition-all duration-300",
                view === n.view ? "h-6 opacity-100" : "h-0 opacity-0"
              )}
            />
            <I n={n.icon} className={cx("w-[18px] h-[18px] transition-colors", view === n.view ? "text-fresa" : "text-crema/40 group-hover:text-crema/70")} />
            <span className="flex-1 text-left">{n.label}</span>
            {badges[n.view] ? (
              <span className={cx(
                "min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center",
                n.view === "inventario" ? "bg-fresa/20 text-fresa" : "bg-caramelo/20 text-caramelo"
              )}>
                {badges[n.view]}
              </span>
            ) : null}
          </button>
        ))}
        {me?.role === "admin" && (
          <button
            onClick={() => {
              setView("auditoria");
              onClose();
            }}
            className={cx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer",
              view === "auditoria" ? "bg-crema/10 text-crema" : "text-crema/50 hover:text-crema hover:bg-crema/5"
            )}
          >
            <I n="shield" className={cx("w-[18px] h-[18px]", view === "auditoria" ? "text-fresa" : "text-crema/40")} />
            <span className="flex-1 text-left">Auditoría y Ajustes</span>
          </button>
        )}
      </nav>
      {me && (
        <div className="p-3 border-t border-crema/8">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-cocoa-900/60">
            <div className="w-9 h-9 rounded-full bg-fresa/20 border border-fresa/30 flex items-center justify-center font-display font-bold text-fresa text-sm shrink-0">
              {me.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{me.full_name}</p>
              <RoleChip role={me.role} />
            </div>
            <button onClick={logout} title="Cerrar turno" className="p-2 rounded-lg text-crema/40 hover:text-fresa hover:bg-crema/6 transition cursor-pointer">
              <I n="logout" className="w-4.5 h-4.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-crema/25 mt-2.5 font-mono">v2.0 · datos demo locales</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen bg-cocoa-900/70 border-r border-crema/8">
        {body}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-cocoa-950/80" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-cocoa-900 border-r border-crema/10 anim-fade-up">{body}</aside>
        </div>
      )}
    </>
  );
}

function Clock() {
  const [ts, setTs] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setTs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cocoa-900 border border-crema/10 font-mono text-sm text-caramelo tabular-nums">
      <I n="clock" className="w-4 h-4" />
      {fmtTime(ts)}
    </div>
  );
}

function Bell() {
  const notifs = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markNotifsRead);
  const [open, setOpen] = useState(false);
  const unread = notifs.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) markRead();
        }}
        className="relative p-2.5 rounded-lg border border-crema/10 bg-cocoa-900 text-crema/70 hover:text-crema hover:border-crema/20 transition cursor-pointer"
        aria-label="Notificaciones"
      >
        <span key={unread} className={cx(unread > 0 && "anim-bell inline-block")}>
          <I n="bell" className="w-4.5 h-4.5" />
        </span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-fresa text-cocoa-950 text-[10px] font-black flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] card anim-pop overflow-hidden">
            <header className="px-4 py-3 border-b border-crema/8 flex items-center justify-between">
              <p className="font-display font-semibold">Centro de avisos</p>
              <Chip className="bg-pistacho/15 text-pistacho border-pistacho/25">
                <I n="wa" className="w-3 h-3" /> WhatsApp simulado
              </Chip>
            </header>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 && <p className="p-5 text-sm text-crema/40">Sin notificaciones.</p>}
              {notifs.slice(0, 12).map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-crema/6 last:border-0 hover:bg-crema/4 transition">
                  <div className="flex items-center gap-2">
                    <span className={cx("shrink-0", n.channel === "whatsapp" ? "text-pistacho" : "text-caramelo")}>
                      <I n={n.channel === "whatsapp" ? "wa" : "spark"} className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-sm font-bold flex-1">{n.title}</p>
                    <span className="text-[10px] text-crema/35 font-mono">{fmtDateTime(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-crema/55 mt-1 pl-5.5 leading-relaxed">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const TITLES: Record<View, [string, string]> = {
  dashboard: ["Panel de operaciones", "Visión general del día"],
  pedidos: ["Gestión de pedidos", "Tablero kanban · arrastrá las tarjetas"],
  reservas: ["Calendario de reservas", "Capacidad de producción por día"],
  clientes: ["Clientes", "CRM de la casa"],
  productos: ["Productos y recetas", "Catálogo y escandallos"],
  inventario: ["Inventario de insumos", "Stock en unidad base, alertas de mínimo"],
  caja: ["Caja y finanzas", "Movimientos y arqueo diario"],
  reparto: ["Reparto del día", "Logística de entregas"],
  auditoria: ["Auditoría y ajustes", "Trazabilidad y configuración"],
};

export function Header({ onMenu }: { onMenu: () => void }) {
  const view = useApp((s) => s.view);
  const me = useApp((s) => s.users.find((u) => u.id === s.currentUserId));
  const [t] = TITLES[view];
  const [, sub] = TITLES[view];
  return (
    <header className="sticky top-0 z-30 bg-cocoa-950/85 backdrop-blur-sm border-b border-crema/8">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
        <button onClick={onMenu} className="lg:hidden p-2 rounded-lg border border-crema/10 text-crema/70 cursor-pointer" aria-label="Menú">
          <I n="menu" className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="eyebrow hidden sm:block">{sub}</p>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight truncate">{t}</h1>
        </div>
        {me && <span className="hidden sm:block"><RoleChip role={me.role} /></span>}
        <Clock />
        <Bell />
      </div>
    </header>
  );
}

export function Ticker() {
  const logs = useApp((s) => s.orderLogs);
  const txs = useApp((s) => s.transactions);
  const orders = useApp((s) => s.orders);

  const events = useMemo(() => {
    const evs: { ts: number; text: string; tone: string }[] = [];
    logs.slice(0, 8).forEach((l) => {
      const o = orders.find((x) => x.id === l.order_id);
      if (o && l.new_status !== l.old_status)
        evs.push({ ts: l.created_at, text: `${o.code} → ${l.new_status.replace(/_/g, " ")}`, tone: "text-crema/70" });
      else if (o) evs.push({ ts: l.created_at, text: `${o.code} · ${l.note ?? "actualizado"}`, tone: "text-crema/70" });
    });
    txs.slice(0, 6).forEach((t) =>
      evs.push({
        ts: t.created_at,
        text: `${t.type === "ingreso" ? "+" : "−"} $ ${Math.round(t.amount / 100)} · ${t.category} (${t.payment_method})`,
        tone: t.type === "ingreso" ? "text-pistacho" : "text-fresa",
      })
    );
    return evs.sort((a, b) => b.ts - a.ts).slice(0, 12);
  }, [logs, txs, orders]);

  if (!events.length) return null;
  const strip = events.map((e, i) => (
    <span key={i} className="inline-flex items-center gap-2 mx-5 text-xs font-mono">
      <span className="text-crema/30">{fmtTime(e.ts)}</span>
      <span className={e.tone}>{e.text}</span>
      <span className="text-fresa/60">✦</span>
    </span>
  ));

  return (
    <div className="relative overflow-hidden border-b border-crema/8 bg-cocoa-900/50">
      <div className="flex w-max anim-marquee py-2">
        <div className="flex">{strip}</div>
        <div className="flex" aria-hidden>{strip}</div>
      </div>
    </div>
  );
}

export function CapBadge({ booked, max }: { booked: number; max: number }) {
  const ratio = booked / max;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono border",
        ratio >= 1 ? "bg-fresa/15 text-fresa border-fresa/30" : ratio >= 0.85 ? "bg-caramelo/15 text-caramelo border-caramelo/30" : "bg-pistacho/10 text-pistacho border-pistacho/25"
      )}
      title={`Capacidad ${booked}/${max} unidades`}
    >
      {booked}/{max}
    </span>
  );
}

export function useMe() {
  return useApp((s) => s.users.find((u) => u.id === s.currentUserId));
}

export function useCan(perm: Parameters<typeof can>[1]) {
  const me = useMe();
  return can(me?.role, perm);
}
