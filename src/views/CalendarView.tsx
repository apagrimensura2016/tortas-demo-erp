import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { STATUS_META } from "../lib/types";
import { fmtDateLong, fmtMoney, monthLabel, toISODate, todayISO } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, Empty, StatusChip, cx } from "../components/ui";
import { CapBadge, useMe } from "../components/layout";

function buildMonth(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarView() {
  const orders = useApp((s) => s.orders);
  const slots = useApp((s) => s.slots);
  const clients = useApp((s) => s.clients);
  const settings = useApp((s) => s.settings);
  const openOrder = useApp((s) => s.openOrder);
  const openNewOrder = useApp((s) => s.openNewOrder);
  const me = useMe();
  const canCreate = me?.role === "admin" || me?.role === "vendedor";

  const t = todayISO();
  const [cursor, setCursor] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [selected, setSelected] = useState(t);

  const cells = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor]);
  const move = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const dayOrders = (iso: string) =>
    orders.filter((o) => o.scheduled_date === iso && o.status !== "cancelado").sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

  const selOrders = dayOrders(selected);
  const selSlot = slots.find((s) => s.date === selected);
  const selUnits = selOrders.reduce((a, o) => a + o.items.reduce((x, i) => x + i.quantity, 0), 0);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="eyebrow">Capacidad máx: {settings.max_capacity} un/día</p>
            <h2 className="font-display text-2xl font-bold">{monthLabel(cursor.y, cursor.m)} <span className="text-crema/35">{cursor.y}</span></h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => move(-1)} className="p-2 rounded-lg border border-crema/12 text-crema/60 hover:text-crema hover:bg-crema/6 transition cursor-pointer" aria-label="Mes anterior"><I n="chevL" className="w-4 h-4" /></button>
            <Btn small variant="soft" onClick={() => { setCursor({ y: new Date().getFullYear(), m: new Date().getMonth() }); setSelected(t); }}>Hoy</Btn>
            <button onClick={() => move(1)} className="p-2 rounded-lg border border-crema/12 text-crema/60 hover:text-crema hover:bg-crema/6 transition cursor-pointer" aria-label="Mes siguiente"><I n="chevR" className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAYS.map((w) => (
            <p key={w} className="text-center text-[11px] font-bold uppercase tracking-wider text-crema/35 py-1">{w}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`x${i}`} />;
            const list = dayOrders(iso);
            const units = list.reduce((a, o) => a + o.items.reduce((x, it) => x + it.quantity, 0), 0);
            const sl = slots.find((s) => s.date === iso);
            const booked = sl?.booked_count ?? units;
            const max = sl?.max_capacity ?? settings.max_capacity;
            const full = booked >= max;
            const almost = !full && booked / max >= 0.85;
            const past = iso < t;
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={cx(
                  "relative rounded-lg border min-h-[74px] sm:min-h-[86px] p-1.5 sm:p-2 text-left transition-all duration-200 cursor-pointer group",
                  selected === iso ? "border-fresa/60 bg-fresa/8" : "border-crema/8 bg-cocoa-900/50 hover:border-crema/25 hover:bg-cocoa-900",
                  past && "opacity-45"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cx("text-xs font-bold font-mono", iso === t && "text-fresa")}>{Number(iso.slice(8))}</span>
                  {iso === t && <span className="w-1.5 h-1.5 rounded-full bg-fresa" style={{ animation: "ringPulse 2s infinite" }} />}
                </div>
                {(sl || list.length > 0) && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
                    <span className="flex gap-0.5 flex-wrap">
                      {list.slice(0, 4).map((o) => (
                        <span key={o.id} className={cx("w-1.5 h-1.5 rounded-full", STATUS_META[o.status].dot)} title={`${o.code} · ${o.scheduled_time}`} />
                      ))}
                      {list.length > 4 && <span className="text-[9px] text-crema/40 font-mono">+{list.length - 4}</span>}
                    </span>
                    <CapBadge booked={booked} max={max} />
                  </div>
                )}
                {full && <span className="absolute inset-0 rounded-lg border-2 border-fresa/50 pointer-events-none" />}
                {almost && <span className="absolute inset-0 rounded-lg border border-caramelo/40 pointer-events-none" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-crema/45">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-fresa" /> demanda al límite</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border border-caramelo/70" /> alta demanda (≥85%)</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-crema/25" /> punto = pedido (color = estado)</span>
        </div>
      </div>

      {/* panel del día */}
      <div className="card p-5 lg:sticky lg:top-20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Agenda del día</p>
            <h3 className="font-display text-xl font-bold leading-tight">{fmtDateLong(selected)}</h3>
          </div>
          {canCreate && <Btn small variant="primary" icon="plus" onClick={() => openNewOrder()}>Pedido</Btn>}
        </div>

        <div className="mt-4 rounded-lg border border-crema/10 bg-cocoa-900 p-3.5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-crema/55">Cupo de producción</span>
            <CapBadge booked={selSlot?.booked_count ?? selUnits} max={selSlot?.max_capacity ?? settings.max_capacity} />
          </div>
          <div className="h-2 rounded-full bg-cocoa-950 overflow-hidden">
            <div
              className={cx("h-full rounded-full transition-all duration-700", (selSlot?.booked_count ?? selUnits) >= (selSlot?.max_capacity ?? settings.max_capacity) ? "bg-fresa" : ((selSlot?.booked_count ?? selUnits) / (selSlot?.max_capacity ?? settings.max_capacity)) >= 0.85 ? "bg-caramelo" : "bg-pistacho")}
              style={{ width: `${Math.min(100, ((selSlot?.booked_count ?? selUnits) / (selSlot?.max_capacity ?? settings.max_capacity)) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-crema/40 mt-1.5">
            Incluye reservas telefónicas bloqueadas fuera del sistema.
          </p>
        </div>

        <div className="mt-4 space-y-2 max-h-[430px] overflow-y-auto pr-1">
          {selOrders.length === 0 && <Empty icon="calendar" title="Día libre" body="Sin pedidos programados para esta fecha." />}
          {selOrders.map((o) => {
            const c = clients.find((x) => x.id === o.client_id);
            return (
              <button
                key={o.id}
                onClick={() => openOrder(o.id)}
                className="w-full text-left rounded-lg border border-crema/8 bg-cocoa-900/60 px-3.5 py-3 hover:border-caramelo/40 hover:bg-cocoa-900 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-caramelo">{o.scheduled_time} h · {o.code}</span>
                  <StatusChip status={o.status} />
                </div>
                <p className="font-bold text-sm mt-1.5 group-hover:text-caramelo transition-colors">{c?.full_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-crema/40 truncate">{o.items.length} línea{o.items.length > 1 ? "s" : ""} · {o.items.reduce((a, i) => a + i.quantity, 0)} un.</p>
                  <span className="font-mono text-xs font-bold">{fmtMoney(o.total_amount)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
