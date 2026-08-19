import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useApp } from "../lib/store";
import { can, CAT_META, KANBAN_COLS, STATUS_META } from "../lib/types";
import type { Order, OrderStatus, PayMethod, ProductCategory } from "../lib/types";
import { fmtDateShort, fmtMoney, isToday, todayISO } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, Empty, Field, Modal, Seg, StatusChip, Stepper, cx, inputCls, taCls } from "../components/ui";
import { useMe } from "../components/layout";

/* ================= Nuevo pedido (wizard) ================= */

const TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "15:00", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"];
const pesos = (s: string) => Math.max(0, Math.round((parseFloat(s) || 0) * 100));

export function NewOrderModal() {
  const modal = useApp((s) => s.orderModal);
  const close = useApp((s) => s.closeNewOrder);
  const clients = useApp((s) => s.clients);
  const products = useApp((s) => s.products);
  const inventory = useApp((s) => s.inventory);
  const slots = useApp((s) => s.slots);
  const settings = useApp((s) => s.settings);
  const createOrder = useApp((s) => s.createOrder);
  const toast = useApp((s) => s.toast);
  const recipes = useApp((s) => s.recipes);

  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState(modal.clientId ?? "");
  const wasOpen = useRef(false);
  useEffect(() => {
    if (modal.open && !wasOpen.current) {
      setStep(1); setClientId(modal.clientId ?? ""); setQty({}); setCustoms({});
      setDiscount(""); setAdvance(""); setDate(todayISO()); setTime("11:00");
      setClientNotes(""); setInternalNotes(""); setMethod("efectivo"); setType("reserva_futura");
    }
    wasOpen.current = modal.open;
  }, [modal.open, modal.clientId]);
  const [type, setType] = useState<Order["order_type"]>("reserva_futura");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("11:00");
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [customs, setCustoms] = useState<Record<string, { texto: string; color: string }>>({});
  const [discount, setDiscount] = useState("");
  const [advance, setAdvance] = useState("");
  const [method, setMethod] = useState<PayMethod>("efectivo");

  const sellable = useMemo(() => products.filter((p) => p.category !== "insumo" && p.is_active), [products]);
  const chosen = sellable.filter((p) => (qty[p.id] ?? 0) > 0);
  const subtotal = chosen.reduce((a, p) => a + p.sale_price * (qty[p.id] ?? 0), 0);
  const total = Math.max(0, subtotal - pesos(discount));
  const units = chosen.reduce((a, p) => a + (qty[p.id] ?? 0), 0);
  const slot = slots.find((s) => s.date === date);
  const booked = slot?.booked_count ?? 0;
  const maxCap = slot?.max_capacity ?? settings.max_capacity;
  const capLeft = maxCap - booked;
  const adv = pesos(advance);

  const stockWarnings = useMemo(() => {
    if (!chosen.length) return [];
    const needs = new Map<string, number>();
    for (const p of chosen)
      for (const r of recipes.filter((r) => r.finished_product_id === p.id))
        needs.set(r.ingredient_id, (needs.get(r.ingredient_id) ?? 0) + r.qty * (qty[p.id] ?? 0) * (r.unit === "kg" || r.unit === "l" ? 1000 : 1));
    const warns: string[] = [];
    for (const [pid, need] of needs) {
      const st = inventory.find((i) => i.product_id === pid);
      const prod = products.find((p) => p.id === pid);
      if (st && prod && st.qty < need) warns.push(prod.name);
    }
    return warns;
  }, [chosen, recipes, inventory, products, qty]);

  const reset = () => {
    setStep(1); setClientId(""); setType("reserva_futura"); setDate(todayISO()); setTime("11:00");
    setClientNotes(""); setInternalNotes(""); setQty({}); setCustoms({}); setDiscount(""); setAdvance(""); setMethod("efectivo");
  };
  const onClose = () => { reset(); close(); };

  const submit = () => {
    const res = createOrder({
      clientId, date, time, type,
      items: chosen.map((p) => ({
        productId: p.id,
        qty: qty[p.id],
        custom: customs[p.id]?.texto || customs[p.id]?.color ? { texto: customs[p.id]?.texto || undefined, color: customs[p.id]?.color || undefined } : undefined,
      })),
      discount: pesos(discount), advance: adv, method,
      clientNotes: clientNotes || undefined, internalNotes: internalNotes || undefined,
    });
    if (res.ok) {
      toast("ok", `Pedido ${res.code} creado ${adv > 0 ? "y confirmado con seña · insumos descontados" : "(pendiente de seña)"}.`);
      onClose();
    } else {
      toast("error", res.error);
    }
  };

  const catGroups: ProductCategory[] = ["torta", "postre", "bebida"];

  return (
    <Modal open={modal.open} onClose={onClose} sub={`Paso ${step} de 3`} title={step === 1 ? "Cliente y fecha" : step === 2 ? "Productos del pedido" : "Seña y confirmación"} w="max-w-2xl">
      {/* pasos */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3].map((s) => (
          <div key={s} className={cx("h-1.5 rounded-full flex-1 transition-all duration-500", s <= step ? "bg-fresa" : "bg-crema/10")} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 anim-fade-up">
          <Field label="Cliente">
            <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Seleccionar cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} · {c.phone}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de entrega / retiro">
              <input type="date" min={todayISO()} className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Franja horaria">
              <select className={inputCls} value={time} onChange={(e) => setTime(e.target.value)}>
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t} h</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tipo de pedido">
            <Seg
              options={[{ v: "reserva_futura", label: "Reserva futura" }, { v: "pedido_inmediato", label: "Pedido inmediato" }]}
              value={type}
              onChange={(v) => setType(v)}
            />
          </Field>
          <div
            className={cx(
              "rounded-lg border px-4 py-3 text-sm flex items-center gap-3",
              capLeft - units < 0 ? "border-fresa/40 bg-fresa/8 text-fresa" : capLeft <= 3 ? "border-caramelo/40 bg-caramelo/8 text-caramelo" : "border-pistacho/30 bg-pistacho/6 text-pistacho"
            )}
          >
            <I n="calendar" className="w-5 h-5 shrink-0" />
            <p>
              Capacidad del {fmtDateShort(date)}: <strong className="font-mono">{booked}/{maxCap}</strong> unidades ocupadas
              {units > 0 && <> · tu pedido suma <strong>{units}</strong></>}
              {capLeft - units < 0 && <> · <strong>sin cupo suficiente</strong></>}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Notas del cliente" hint="Ej: escribir “Feliz cumple Ana”">
              <textarea className={taCls} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="Texto de la torta, velas, toppers…" />
            </Field>
            <Field label="Notas internas" hint="Solo las ve el personal">
              <textarea className={taCls} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Alergias, coordinación, cobros…" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn
              variant="primary"
              onClick={() => setStep(2)}
              disabled={!clientId || !date || date < todayISO() || !time}
            >
              Elegir productos <I n="arrow" className="w-4 h-4" />
            </Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 anim-fade-up">
          {catGroups.map((cat) => {
            const list = sellable.filter((p) => p.category === cat);
            if (!list.length) return null;
            return (
              <div key={cat}>
                <p className="eyebrow mb-2">{CAT_META[cat].plural}</p>
                <div className="space-y-2">
                  {list.map((p) => (
                    <div key={p.id} className={cx("rounded-lg border px-3.5 py-2.5 transition-all duration-200", (qty[p.id] ?? 0) > 0 ? "border-fresa/40 bg-fresa/6" : "border-crema/8 bg-cocoa-900/50")}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{p.name}</p>
                          <p className="text-xs text-crema/40 font-mono">{fmtMoney(p.sale_price)}</p>
                        </div>
                        <Stepper value={qty[p.id] ?? 0} onChange={(n) => setQty((q) => ({ ...q, [p.id]: n }))} />
                      </div>
                      {(qty[p.id] ?? 0) > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2.5 anim-fade-up">
                          <input className={cx(inputCls, "py-1.5 text-xs")} placeholder="Texto en la torta (ej: Feliz Cumple)" value={customs[p.id]?.texto ?? ""} onChange={(e) => setCustoms((c) => ({ ...c, [p.id]: { texto: e.target.value, color: c[p.id]?.color ?? "" } }))} />
                          <input className={cx(inputCls, "py-1.5 text-xs")} placeholder="Color de frosting" value={customs[p.id]?.color ?? ""} onChange={(e) => setCustoms((c) => ({ ...c, [p.id]: { texto: c[p.id]?.texto ?? "", color: e.target.value } }))} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-crema/10 bg-cocoa-900 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <Field label="Descuento ($)">
                <input className={cx(inputCls, "w-24 py-1.5")} inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </Field>
            </div>
            <div className="text-right">
              <p className="eyebrow">Subtotal {units > 0 && `· ${units} un.`}</p>
              <p className="font-display text-2xl font-black tabular-nums">{fmtMoney(total)}</p>
            </div>
          </div>
          {stockWarnings.length > 0 && (
            <p className="text-xs text-caramelo flex items-start gap-2">
              <I n="alert" className="w-4 h-4 shrink-0 mt-0.5" />
              Ojo: stock justo de {stockWarnings.join(", ")}. Al confirmar con seña, el sistema valida y descuenta insumos.
            </p>
          )}
          <div className="flex justify-between gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setStep(1)}><I n="chevL" className="w-4 h-4" /> Volver</Btn>
            <Btn variant="primary" onClick={() => setStep(3)} disabled={units === 0}>
              Ir a pago <I n="arrow" className="w-4 h-4" />
            </Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 anim-fade-up">
          <div className="rounded-lg border border-crema/10 bg-cocoa-900 divide-y divide-crema/6">
            {chosen.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-crema/70">{qty[p.id]}× {p.name}</span>
                <span className="font-mono font-bold">{fmtMoney(p.sale_price * (qty[p.id] ?? 0))}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-crema/70">Descuento</span>
              <span className="font-mono text-fresa">−{fmtMoney(pesos(discount))}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-bold">Total</span>
              <span className="font-display text-2xl font-black tabular-nums">{fmtMoney(total)}</span>
            </div>
          </div>

          <Field label="Seña (anticipo)" hint={adv > 0 && adv < total ? `El pedido se confirma y descuenta insumos. Saldo: ${fmtMoney(total - adv)}` : adv >= total && total > 0 ? "Pago completo: sin saldo pendiente" : "Sin seña, el pedido queda PENDIENTE y no toca el stock"}>
            <div className="flex gap-2 items-center flex-wrap">
              <input className={cx(inputCls, "w-32")} inputMode="decimal" placeholder="$ 0" value={advance} onChange={(e) => setAdvance(e.target.value)} />
              {[0, 50, 100].map((pc) => (
                <Btn key={pc} small variant={adv === Math.round((total * pc) / 100) ? "amber" : "soft"} onClick={() => setAdvance(String(Math.round((total * pc) / 100 / 100)))}>
                  {pc}%
                </Btn>
              ))}
            </div>
          </Field>

          {adv > 0 && (
            <Field label="Método de pago de la seña">
              <div className="flex flex-wrap gap-2">
                {(["efectivo", "transferencia", "qr", "tarjeta_debito", "tarjeta_credito"] as PayMethod[]).map((m) => (
                  <Btn key={m} small variant={method === m ? "green" : "soft"} onClick={() => setMethod(m)}>
                    {m.replace("_", " ")}
                  </Btn>
                ))}
              </div>
            </Field>
          )}

          <div className={cx("rounded-lg border px-4 py-3 text-sm flex items-center gap-3", adv > 0 ? "border-caramelo/35 bg-caramelo/8 text-caramelo" : "border-crema/12 bg-cocoa-900/60 text-crema/60")}>
            <I n={adv > 0 ? "check" : "clock"} className="w-5 h-5 shrink-0" />
            {adv > 0
              ? <>Se creará <strong>confirmado</strong>: ingreso en caja, descuento de insumos por receta y cupo de producción reservado.</>
              : <>Quedará <strong>pendiente</strong>: sin efecto en caja ni stock hasta registrar la seña.</>}
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setStep(2)}><I n="chevL" className="w-4 h-4" /> Volver</Btn>
            <Btn variant="primary" icon="check" onClick={submit}>
              {adv > 0 ? "Crear y confirmar" : "Crear pedido"}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ================= Kanban ================= */

function OrderCard({ o, onDragStart, onDragEnd, dragging }: { o: Order; onDragStart: (e: DragEvent<HTMLDivElement>) => void; onDragEnd: () => void; dragging: boolean }) {
  const clients = useApp((s) => s.clients);
  const products = useApp((s) => s.products);
  const openOrder = useApp((s) => s.openOrder);
  const c = clients.find((x) => x.id === o.client_id);
  const itemsTxt = o.items.map((i) => `${i.quantity}× ${products.find((p) => p.id === i.product_id)?.name?.replace(/\s\d+(,\d+)?\s?(kg|L|un|x\d+)/i, "") ?? "?"}`).join(" · ");

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => openOrder(o.id)}
      className={cx(
        "card card-hover p-3.5 cursor-grab active:cursor-grabbing select-none",
        dragging && "dragging",
        o.status === "cancelado" && "opacity-55"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold text-caramelo">{o.code}</span>
        {!isToday(o.scheduled_date) && (
          <Chip className="bg-crema/6 text-crema/60 border-crema/12 font-mono">{fmtDateShort(o.scheduled_date)} · {o.scheduled_time}</Chip>
        )}
        {isToday(o.scheduled_date) && (
          <Chip className="bg-caramelo/12 text-caramelo border-caramelo/25 font-mono">{o.scheduled_time} h</Chip>
        )}
      </div>
      <p className="font-bold text-sm mt-2 truncate">{c?.full_name ?? "Cliente"}</p>
      <p className="text-xs text-crema/45 mt-0.5 line-clamp-2 leading-snug">{itemsTxt}</p>
      {(o.client_notes || o.items.some((i) => i.customizations?.texto)) && (
        <p className="text-[11px] text-arandano/90 mt-1.5 flex items-center gap-1.5">
          <I n="note" className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{o.items.find((i) => i.customizations?.texto)?.customizations?.texto ?? o.client_notes}</span>
        </p>
      )}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-dashed border-crema/12">
        <span className="font-display font-black tabular-nums">{fmtMoney(o.total_amount)}</span>
        <div className="flex items-center gap-1.5">
          {o.advance_payment > 0 ? (
            <Chip className="bg-caramelo/12 text-caramelo border-caramelo/25">seña ✓</Chip>
          ) : (
            <Chip className="bg-crema/6 text-crema/45 border-crema/12">sin seña</Chip>
          )}
          {o.balance_due > 0 && o.status !== "cancelado" && (
            <Chip className="bg-fresa/12 text-fresa border-fresa/25 font-mono">{fmtMoney(o.balance_due)}</Chip>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const orders = useApp((s) => s.orders);
  const transition = useApp((s) => s.transition);
  const openOrder = useApp((s) => s.openOrder);
  const openNewOrder = useApp((s) => s.openNewOrder);
  const toast = useApp((s) => s.toast);
  const me = useMe();

  const [scope, setScope] = useState<"hoy" | "todos">("hoy");
  const [showCancelled, setShowCancelled] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<OrderStatus | null>(null);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (o.status === "cancelado" && !showCancelled) return false;
        if (scope === "hoy" && o.scheduled_date !== todayISO() && !["en_camino"].includes(o.status)) return false;
        return true;
      }),
    [orders, scope, showCancelled]
  );

  const cols = showCancelled ? [...KANBAN_COLS, "cancelado" as OrderStatus] : KANBAN_COLS;

  const handleDrop = (id: string | null, col: OrderStatus) => {
    if (!id) return;
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    if (o.status === col) return;
    if (col === "confirmado_con_sena") {
      toast("info", `${o.code}: para confirmar, registrá una seña desde el detalle del pedido.`);
      openOrder(id);
      return;
    }
    if (col === "entregado") {
      toast("info", `${o.code}: usá «Cobrar saldo y entregar» desde el detalle.`);
      openOrder(id);
      return;
    }
    if (col === "cancelado") {
      toast("info", `${o.code}: la cancelación se hace desde el detalle (decide si se repone stock).`);
      openOrder(id);
      return;
    }
    const res = transition(id, col);
    if (res.ok) toast("ok", `${o.code} → ${STATUS_META[col].label}.`);
    else toast("error", res.error);
  };

  return (
    <div className="px-4 sm:px-6 py-5 max-w-[1700px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Seg options={[{ v: "hoy", label: "Hoy" }, { v: "todos", label: "Todos" }]} value={scope} onChange={setScope} />
          <button
            onClick={() => setShowCancelled(!showCancelled)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition cursor-pointer",
              showCancelled ? "border-crema/30 text-crema bg-crema/8" : "border-crema/12 text-crema/45 hover:text-crema/80"
            )}
          >
            <I n="ban" className="w-3.5 h-3.5" />
            Cancelados
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-crema/40 hidden sm:block">
            Arrastrá tarjetas entre columnas — el sistema valida rol, stock y transiciones.
          </p>
          {can(me?.role, "create_order") && (
            <Btn variant="primary" icon="plus" onClick={() => openNewOrder()}>Nuevo pedido</Btn>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {cols.map((col) => {
          const list = filtered.filter((o) => o.status === col).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.scheduled_time.localeCompare(b.scheduled_time));
          const meta = STATUS_META[col];
          return (
            <div
              key={col}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
              onDragLeave={(e) => { if (e.target === e.currentTarget) setOverCol(null); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(e.dataTransfer.getData("text/plain") || dragId, col); setOverCol(null); setDragId(null); }}
              className={cx(
                "shrink-0 w-[290px] rounded-xl border border-crema/8 bg-cocoa-900/45 transition-all duration-200",
                overCol === col && dragId && "drop-hint"
              )}
            >
              <div className={cx("h-[3px] rounded-t-xl", meta.dot)} />
              <header className="flex items-center gap-2 px-3.5 py-3">
                <span className={cx("w-2 h-2 rounded-full", meta.dot)} />
                <h3 className="text-sm font-bold flex-1">{meta.label}</h3>
                <span className="min-w-6 h-6 px-1.5 rounded-full bg-crema/8 text-crema/60 text-xs font-bold flex items-center justify-center">{list.length}</span>
              </header>
              <div className="px-2.5 pb-2.5 space-y-2.5 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto">
                {list.length === 0 && (
                  <div className="rounded-lg border border-dashed border-crema/10 py-6 text-center text-xs text-crema/30">
                    {col === "pendiente" ? "Sin pedidos pendientes" : "Vacío"}
                  </div>
                )}
                {list.map((o) => (
                  <OrderCard
                    key={o.id}
                    o={o}
                    dragging={dragId === o.id}
                    onDragStart={(e) => { setDragId(o.id); e.dataTransfer.setData("text/plain", o.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card mt-2">
          <Empty icon="board" title="Nada por acá" body={scope === "hoy" ? "No hay pedidos para hoy con ese filtro. Probá «Todos»." : "Creá tu primer pedido para empezar el día."} />
        </div>
      )}
    </div>
  );
}
