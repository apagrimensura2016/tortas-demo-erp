import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { addDaysISO, fmtDateLong, fmtMoney, fmtQty, fmtWeekday, isToday, timeGreeting, todayISO } from "../lib/format";
import { I, type IconName } from "../components/icons";
import { Btn, Chip, CountUp, Empty, Reveal, StatusChip, cx } from "../components/ui";
import { CapBadge, Ticker, useMe } from "../components/layout";

function Kpi({
  icon, label, value, fmt, sub, accent, delay, onClick, spark,
}: {
  icon: IconName; label: string; value: number; fmt: (n: number) => string; sub: string;
  accent: "fresa" | "caramelo" | "pistacho" | "arandano"; delay: number; onClick?: () => void;
  spark?: number[];
}) {
  const acc = {
    fresa: "text-fresa border-fresa/25 bg-fresa/8",
    caramelo: "text-caramelo border-caramelo/25 bg-caramelo/8",
    pistacho: "text-pistacho border-pistacho/25 bg-pistacho/8",
    arandano: "text-arandano border-arandano/25 bg-arandano/8",
  }[accent];
  const line = { fresa: "bg-fresa", caramelo: "bg-caramelo", pistacho: "bg-pistacho", arandano: "bg-arandano" }[accent];
  return (
    <Reveal delay={delay}>
      <button
        onClick={onClick}
        className="card card-hover w-full text-left p-5 relative overflow-hidden group cursor-pointer"
      >
        <span className={cx("absolute top-0 left-0 right-0 h-[3px]", line)} />
        <div className="flex items-start justify-between gap-3">
          <span className={cx("w-10 h-10 rounded-lg border flex items-center justify-center shrink-0", acc)}>
            <I n={icon} className="w-5 h-5" />
          </span>
          {spark && (
            <svg viewBox="0 0 100 32" className="w-24 h-8 opacity-70" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-caramelo"
                points={spark
                  .map((v, i) => `${(i / (spark.length - 1)) * 100},${30 - (v / Math.max(...spark, 1)) * 26}`)
                  .join(" ")}
              />
            </svg>
          )}
        </div>
        <p className="eyebrow mt-4">{label}</p>
        <CountUp to={value} fmt={fmt} className="font-display text-3xl sm:text-4xl font-black tracking-tight block mt-1 tabular-nums" />
        <p className="text-xs text-crema/45 mt-1.5 group-hover:text-crema/70 transition-colors">{sub}</p>
      </button>
    </Reveal>
  );
}

function WeekChart() {
  const transactions = useApp((s) => s.transactions);
  const [hover, setHover] = useState<number | null>(null);

  const days = useMemo(() => {
    const t = todayISO();
    return Array.from({ length: 7 }, (_, i) => addDaysISO(t, i - 6));
  }, []);

  const data = useMemo(
    () =>
      days.map((d) => {
        const txs = transactions.filter((t) => {
          const td = new Date(t.created_at);
          return `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}-${String(td.getDate()).padStart(2, "0")}` === d;
        });
        const ing = txs.filter((t) => t.type === "ingreso").reduce((a, t) => a + t.amount, 0);
        const egr = txs.filter((t) => t.type === "egreso").reduce((a, t) => a + t.amount, 0);
        return { d, ing, egr };
      }),
    [days, transactions]
  );

  const max = Math.max(...data.map((x) => Math.max(x.ing, x.egr)), 1);
  const W = 620, H = 210, padB = 26, padT = 14;
  const gw = W / 7;
  const y = (v: number) => padT + (H - padB - padT) * (1 - v / max);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="eyebrow">Finanzas</p>
          <h3 className="font-display text-xl font-bold">Últimos 7 días</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-crema/55">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-pistacho" /> Ingresos</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-fresa/80" /> Egresos</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-4 h-0.5 bg-crema/70 rounded" /> Neto</span>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1="0" x2={W} y1={y(max * p)} y2={y(max * p)} stroke="rgba(245,231,210,0.07)" strokeDasharray="3 5" />
          ))}
          {data.map((dd, i) => {
            const cx0 = i * gw + gw / 2;
            return (
              <g key={dd.d} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={i * gw} y={0} width={gw} height={H} fill={hover === i ? "rgba(245,231,210,0.04)" : "transparent"} />
                <rect x={cx0 - 24} y={y(dd.ing)} width={20} height={Math.max(2, H - padB - y(dd.ing))} rx={4} className="fill-pistacho" opacity={hover === i ? 1 : 0.85} />
                <rect x={cx0 + 4} y={y(dd.egr)} width={20} height={Math.max(2, H - padB - y(dd.egr))} rx={4} className="fill-fresa" opacity={hover === i ? 0.95 : 0.6} />
                <text x={cx0} y={H - 8} textAnchor="middle" className="fill-crema/40 text-[11px] font-semibold" fontSize="11">
                  {isToday(dd.d) ? "hoy" : fmtWeekday(dd.d)}
                </text>
              </g>
            );
          })}
          <polyline
            fill="none"
            stroke="rgba(245,231,210,0.75)"
            strokeWidth="2"
            strokeLinejoin="round"
            points={data.map((dd, i) => `${i * gw + gw / 2},${y(dd.ing - dd.egr)}`).join(" ")}
          />
          {data.map((dd, i) => (
            <circle key={i} cx={i * gw + gw / 2} cy={y(dd.ing - dd.egr)} r={hover === i ? 4.5 : 3} className="fill-crema" />
          ))}
        </svg>
      </div>
      {hover !== null && (
        <div className="anim-pop inline-flex items-center gap-4 rounded-lg border border-crema/12 bg-cocoa-900 px-3.5 py-2 text-xs font-mono">
          <span className="text-crema/50">{fmtWeekday(data[hover].d)}</span>
          <span className="text-pistacho">+{fmtMoney(data[hover].ing)}</span>
          <span className="text-fresa">−{fmtMoney(data[hover].egr)}</span>
          <span className="text-crema font-bold">neto {fmtMoney(data[hover].ing - data[hover].egr)}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const me = useMe();
  const orders = useApp((s) => s.orders);
  const transactions = useApp((s) => s.transactions);
  const inventory = useApp((s) => s.inventory);
  const products = useApp((s) => s.products);
  const slots = useApp((s) => s.slots);
  const clients = useApp((s) => s.clients);
  const settings = useApp((s) => s.settings);
  const openOrder = useApp((s) => s.openOrder);
  const setView = useApp((s) => s.setView);

  const t = todayISO();
  const ingToday = transactions.filter((x) => x.type === "ingreso" && new Date(x.created_at).toDateString() === new Date().toDateString()).reduce((a, x) => a + x.amount, 0);
  const toDeliver = orders.filter((o) => o.scheduled_date === t && !["entregado", "cancelado"].includes(o.status));
  const porCobrar = orders.filter((o) => !["entregado", "cancelado"].includes(o.status)).reduce((a, o) => a + o.balance_due, 0);
  const lowStock = inventory.filter((i) => i.qty <= i.min_qty);
  const todayOrders = orders.filter((o) => o.scheduled_date === t).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  const slotToday = slots.find((s) => s.date === t);
  const spark = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(t, i - 6));
    return days.map((d) =>
      transactions
        .filter((x) => x.type === "ingreso" && `${new Date(x.created_at).getFullYear()}-${String(new Date(x.created_at).getMonth() + 1).padStart(2, "0")}-${String(new Date(x.created_at).getDate()).padStart(2, "0")}` === d)
        .reduce((a, x) => a + x.amount, 0)
    );
  }, [transactions, t]);

  const days14 = Array.from({ length: 14 }, (_, i) => addDaysISO(t, i));

  return (
    <div>
      <Ticker />
      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-[1500px] mx-auto">
        <Reveal>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="eyebrow">{fmtDateLong(t)} · {settings.store_name}</p>
              <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight mt-1">
                {timeGreeting()}, {me?.full_name.split(" ")[0]} <span className="text-fresa">✳</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {slotToday && (
                <div className="card px-4 py-2.5 flex items-center gap-3">
                  <I n="flame" className="w-5 h-5 text-caramelo anim-flame" />
                  <div>
                    <p className="eyebrow">Horno de hoy</p>
                    <CapBadge booked={slotToday.booked_count} max={slotToday.max_capacity} />
                  </div>
                </div>
              )}
              <Btn variant="primary" icon="plus" onClick={() => useApp.getState().openNewOrder()}>
                Nuevo pedido
              </Btn>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 xl:col-span-4">
            <Kpi icon="register" label="Ventas de hoy" value={ingToday} fmt={fmtMoney} sub="Ingresos registrados en caja" accent="pistacho" delay={0} onClick={() => setView("caja")} spark={spark} />
          </div>
          <div className="col-span-12 sm:col-span-6 xl:col-span-3">
            <Kpi icon="board" label="A entregar hoy" value={toDeliver.length} fmt={(n) => `${n}`} sub={toDeliver.length ? `Próximo: ${toDeliver[0].scheduled_time} h` : "Agenda libre 🎉"} accent="caramelo" delay={70} onClick={() => setView("pedidos")} />
          </div>
          <div className="col-span-12 sm:col-span-6 xl:col-span-3">
            <Kpi icon="wallet" label="Por cobrar" value={porCobrar} fmt={fmtMoney} sub="Saldos y señas pendientes" accent="fresa" delay={140} onClick={() => setView("pedidos")} />
          </div>
          <div className="col-span-12 sm:col-span-6 xl:col-span-2">
            <Kpi icon="alert" label="Stock bajo" value={lowStock.length} fmt={(n) => `${n}`} sub={lowStock.length ? "Reponer insumos" : "Todo en orden"} accent="arandano" delay={210} onClick={() => setView("inventario")} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-7">
            <Reveal delay={100}><WeekChart /></Reveal>
          </div>
          <div className="col-span-12 xl:col-span-5">
            <Reveal delay={160}>
              <div className="card p-5 h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Agenda</p>
                    <h3 className="font-display text-xl font-bold">Pedidos de hoy</h3>
                  </div>
                  <Btn small variant="ghost" onClick={() => setView("pedidos")}>Ver kanban <I n="arrow" className="w-3.5 h-3.5" /></Btn>
                </div>
                <div className="mt-4 space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {todayOrders.length === 0 && <Empty icon="cake" title="Hoy no hay pedidos" body="Creá uno nuevo desde el botón rosa." />}
                  {todayOrders.map((o) => {
                    const c = clients.find((x) => x.id === o.client_id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => openOrder(o.id)}
                        className="w-full flex items-center gap-3 rounded-lg border border-crema/8 bg-cocoa-900/60 px-3.5 py-2.5 hover:border-caramelo/40 hover:bg-cocoa-900 transition-all duration-200 cursor-pointer group"
                      >
                        <span className="font-mono text-xs text-caramelo font-bold w-12 shrink-0">{o.scheduled_time}</span>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-bold truncate group-hover:text-caramelo transition-colors">{c?.full_name}</p>
                          <p className="text-[11px] text-crema/40 truncate">
                            {o.items.map((i) => `${i.quantity}× ${products.find((p) => p.id === i.product_id)?.name ?? "?"}`).join(", ")}
                          </p>
                        </div>
                        <span className="font-display font-bold text-sm tabular-nums">{fmtMoney(o.total_amount)}</span>
                        <StatusChip status={o.status} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-8">
            <Reveal delay={120}>
              <div className="card p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="eyebrow">Producción</p>
                    <h3 className="font-display text-xl font-bold">Capacidad · próximos 14 días</h3>
                  </div>
                  <div className="flex gap-3 text-[11px] text-crema/45">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pistacho" /> libre</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-caramelo" /> alto</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fresa" /> lleno</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {days14.map((d) => {
                    const sl = slots.find((s) => s.date === d);
                    const booked = sl?.booked_count ?? 0;
                    const max = sl?.max_capacity ?? settings.max_capacity;
                    const ratio = Math.min(1.15, booked / max);
                    return (
                      <div key={d} className={cx("shrink-0 w-[72px] rounded-lg border p-2 text-center", isToday(d) ? "border-fresa/50 bg-fresa/6" : "border-crema/8 bg-cocoa-900/50")}>
                        <p className="text-[10px] uppercase font-bold text-crema/45">{isToday(d) ? "hoy" : fmtWeekday(d)}</p>
                        <p className="font-mono text-xs mt-0.5">{d.slice(8)}/{d.slice(5, 7)}</p>
                        <div className="h-14 flex items-end justify-center gap-0.5 mt-1.5">
                          {Array.from({ length: Math.min(max, 10) }, (_, i) => {
                            const filled = i < Math.round((booked / max) * Math.min(max, 10));
                            return (
                              <span
                                key={i}
                                className={cx(
                                  "w-1.5 rounded-sm transition-all",
                                  filled ? (ratio >= 1 ? "bg-fresa" : ratio >= 0.85 ? "bg-caramelo" : "bg-pistacho") : "bg-crema/10"
                                )}
                                style={{ height: `${14 + i * 3}px` }}
                              />
                            );
                          })}
                        </div>
                        <p className="font-mono text-[10px] mt-1.5 text-crema/50">{booked}/{max}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
          <div className="col-span-12 xl:col-span-4">
            <Reveal delay={180}>
              <div className="card p-5 h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Alertas</p>
                    <h3 className="font-display text-xl font-bold">Stock bajo mínimo</h3>
                  </div>
                  <Btn small variant="ghost" onClick={() => setView("inventario")}>Inventario <I n="arrow" className="w-3.5 h-3.5" /></Btn>
                </div>
                <div className="mt-4 space-y-2.5">
                  {lowStock.length === 0 && <Empty icon="check" title="Sin alertas" body="Ningún insumo está por debajo del mínimo." />}
                  {lowStock.map((i) => {
                    const p = products.find((x) => x.id === i.product_id);
                    const pct = Math.min(100, Math.round((i.qty / i.min_qty) * 100));
                    return (
                      <div key={i.product_id} className="rounded-lg border border-fresa/20 bg-fresa/6 px-3.5 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold flex items-center gap-2">
                            <I n="alert" className="w-4 h-4 text-fresa" />
                            {p?.name}
                          </p>
                          <Chip className="bg-fresa/15 text-fresa border-fresa/30">{pct}% del mín.</Chip>
                        </div>
                        <p className="text-xs text-crema/50 mt-1 font-mono">
                          {fmtQty(i.qty, i.base_unit)} / mín. {fmtQty(i.min_qty, i.base_unit)}
                        </p>
                        <div className="h-1.5 rounded-full bg-cocoa-950 mt-2 overflow-hidden">
                          <div className="h-full rounded-full bg-fresa transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
