import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { can, PAY_METHODS, STATUS_META } from "../lib/types";
import type { Delivery as DeliveryT, PayMethod } from "../lib/types";
import { fmtMoney, todayISO } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, Empty, Field, Modal, StatusChip, cx, inputCls, taCls } from "../components/ui";
import { useMe } from "../components/layout";

function FinishModal({ dv, onClose }: { dv: DeliveryT; onClose: () => void }) {
  const orders = useApp((s) => s.orders);
  const clients = useApp((s) => s.clients);
  const finishDelivery = useApp((s) => s.finishDelivery);
  const toast = useApp((s) => s.toast);
  const order = orders.find((o) => o.id === dv.order_id);
  const [note, setNote] = useState("");
  const [file, setFile] = useState("");
  const [method, setMethod] = useState<PayMethod>("efectivo");
  if (!order) return null;
  const c = clients.find((x) => x.id === order.client_id);
  const needsPay = order.balance_due > 0;

  return (
    <Modal open onClose={onClose} sub={`Entrega ${order.code}`} title="Finalizar entrega" w="max-w-md">
      <div className="space-y-4">
        <div className="rounded-lg border border-crema/10 bg-cocoa-900 px-4 py-3 text-sm space-y-1">
          <p className="font-bold">{c?.full_name}</p>
          <p className="text-crema/55 text-xs flex items-center gap-1.5"><I n="pin" className="w-3.5 h-3.5 text-caramelo" />{dv.delivery_address}</p>
          {needsPay && (
            <p className="text-fresa text-xs font-mono pt-1">Saldo a cobrar: {fmtMoney(order.balance_due)}</p>
          )}
        </div>
        {needsPay && (
          <Field label="Método de cobro del saldo">
            <div className="flex flex-wrap gap-2">
              {PAY_METHODS.map((m) => (
                <Btn key={m.value} small variant={method === m.value ? "green" : "soft"} onClick={() => setMethod(m.value)}>{m.label}</Btn>
              ))}
            </div>
          </Field>
        )}
        <Field label="Comprobante / observaciones" hint="Foto o firma — en esta demo se guarda la referencia">
          <textarea className={taCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Entregado en portería, recibió la hermana…" />
        </Field>
        <label className="flex items-center gap-3 rounded-lg border border-dashed border-crema/20 px-4 py-3 cursor-pointer hover:border-arandano/50 transition text-sm text-crema/55">
          <I n="copy" className="w-4.5 h-4.5 text-arandano" />
          <span className="truncate">{file || "Adjuntar foto del comprobante (opcional)"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
        </label>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Volver</Btn>
          <Btn
            variant="green"
            icon="check"
            onClick={() => {
              const res = finishDelivery(dv.id, needsPay ? method : null, note + (file ? ` · foto: ${file}` : ""));
              if (res.ok) toast("ok", `Entrega de ${order.code} finalizada${needsPay ? " y saldo cobrado" : ""}.`);
              else toast("error", res.error);
              onClose();
            }}
          >
            Confirmar entrega
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

const STEPS = ["pendiente", "asignado", "en_camino", "entregado"] as const;

export default function Delivery() {
  const deliveries = useApp((s) => s.deliveries);
  const orders = useApp((s) => s.orders);
  const clients = useApp((s) => s.clients);
  const users = useApp((s) => s.users);
  const assignDriver = useApp((s) => s.assignDriver);
  const startDelivery = useApp((s) => s.startDelivery);
  const openOrder = useApp((s) => s.openOrder);
  const toast = useApp((s) => s.toast);
  const me = useMe();
  const isAdmin = me?.role === "admin";
  const canRoute = can(me?.role, "to_route");
  const canDeliver = can(me?.role, "deliver");

  const t = todayISO();
  const [finishing, setFinishing] = useState<DeliveryT | null>(null);

  const todays = useMemo(
    () =>
      deliveries
        .map((d) => ({ d, o: orders.find((o) => o.id === d.order_id) }))
        .filter((x) => x.o && x.o.scheduled_date === t && x.o.status !== "cancelado")
        .sort((a, b) => a.o!.scheduled_time.localeCompare(b.o!.scheduled_time)),
    [deliveries, orders, t]
  );

  const retiros = useMemo(
    () =>
      orders
        .filter((o) => o.scheduled_date === t && !["entregado", "cancelado"].includes(o.status) && !deliveries.some((d) => d.order_id === o.id))
        .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
    [orders, deliveries, t]
  );

  const drivers = users.filter((u) => u.role === "repartidor");

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1300px] mx-auto grid lg:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="space-y-4">
        <p className="text-sm text-crema/50">
          {todays.filter((x) => x.d.status !== "entregado").length} entrega(s) pendientes hoy · ordenadas por franja horaria
        </p>
        {todays.length === 0 && (
          <div className="card"><Empty icon="scooter" title="Sin entregas hoy" body="Cuando un pedido tenga reparto asignado para hoy, aparecerá acá." /></div>
        )}
        {todays.map(({ d, o }) => {
          const c = clients.find((x) => x.id === o!.client_id);
          const stepIx = d.status === "fallido" ? -1 : STEPS.indexOf(d.status as (typeof STEPS)[number]);
          return (
            <div key={d.id} className={cx("card p-4 card-hover anim-fade-up", d.status === "entregado" && "opacity-70")}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={cx("w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0", d.status === "en_camino" ? "border-arandano/40 bg-arandano/10 text-arandano" : "border-crema/12 bg-cocoa-900 text-crema/70")}>
                    <span className="font-mono text-xs font-bold">{o!.scheduled_time}</span>
                    <I n="scooter" className="w-4 h-4 mt-0.5" />
                  </div>
                  <div>
                    <button onClick={() => openOrder(o!.id)} className="font-mono text-[11px] font-bold text-caramelo hover:underline cursor-pointer">{o!.code}</button>
                    <p className="font-bold">{c?.full_name}</p>
                    <p className="text-xs text-crema/45 flex items-center gap-1.5 mt-0.5"><I n="pin" className="w-3.5 h-3.5 text-caramelo/70" />{d.delivery_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={o!.status} />
                  {o!.balance_due > 0 && <Chip className="bg-fresa/12 text-fresa border-fresa/25 font-mono">cobra {fmtMoney(o!.balance_due)}</Chip>}
                </div>
              </div>

              {/* stepper */}
              <div className="flex items-center gap-1 mt-4">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
                    <span className={cx("w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center border shrink-0", i <= stepIx ? "bg-arandano/20 border-arandano/50 text-arandano" : "border-crema/15 text-crema/30")}>
                      {i + 1}
                    </span>
                    <span className={cx("text-[10px] font-bold hidden sm:block", i <= stepIx ? "text-arandano" : "text-crema/30")}>{s.replace("_", " ")}</span>
                    {i < STEPS.length - 1 && <span className={cx("h-px flex-1 mx-1", i < stepIx ? "bg-arandano/50" : "bg-crema/10")} />}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {d.driver_id ? (
                  <Chip className="bg-crema/8 text-crema/75 border-crema/15">
                    <I n="users" className="w-3 h-3" />
                    {users.find((u) => u.id === d.driver_id)?.full_name}
                  </Chip>
                ) : (
                  <Chip className="bg-caramelo/12 text-caramelo border-caramelo/25">sin repartidor</Chip>
                )}
                <div className="flex-1" />
                {isAdmin && !d.driver_id && d.status !== "entregado" && (
                  <select
                    className={cx(inputCls, "w-44 py-1.5 text-xs")}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const res = assignDriver(d.id, e.target.value);
                      if (res.ok) toast("ok", "Repartidor asignado.");
                      else toast("error", res.error);
                    }}
                  >
                    <option value="">Asignar repartidor…</option>
                    {drivers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                )}
                {isAdmin && d.driver_id && d.status === "asignado" && (
                  <select
                    className={cx(inputCls, "w-44 py-1.5 text-xs")}
                    value={d.driver_id}
                    onChange={(e) => {
                      const res = assignDriver(d.id, e.target.value);
                      if (res.ok) toast("ok", "Repartidor actualizado.");
                    }}
                  >
                    {drivers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                )}
                {canRoute && d.driver_id && ["pendiente", "asignado"].includes(d.status) && o!.status !== "en_camino" && (
                  <Btn small variant="primary" icon="scooter" onClick={() => {
                    const res = startDelivery(d.id);
                    if (res.ok) toast("ok", `${o!.code} en camino. Cliente notificado por WhatsApp.`);
                    else toast("error", res.error);
                  }}>
                    Iniciar entrega
                  </Btn>
                )}
                {canDeliver && d.status === "en_camino" && (
                  <Btn small variant="green" icon="check" onClick={() => setFinishing(d)}>Finalizar entrega</Btn>
                )}
                {d.proof_note && (
                  <span className="text-[11px] text-crema/40 truncate max-w-[220px]" title={d.proof_note}>📎 {d.proof_note}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* retiros en tienda */}
      <div className="card p-5 lg:sticky lg:top-20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="eyebrow">En tienda</p>
            <h3 className="font-display text-lg font-bold">Retiros de hoy</h3>
          </div>
          <Chip className="bg-crema/8 text-crema/60 border-crema/12 font-mono">{retiros.length}</Chip>
        </div>
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {retiros.length === 0 && <Empty icon="cake" title="Sin retiros" body="Todos los pedidos de hoy tienen reparto o ya se entregaron." />}
          {retiros.map((o) => {
            const c = clients.find((x) => x.id === o.client_id);
            return (
              <button key={o.id} onClick={() => openOrder(o.id)} className="w-full text-left rounded-lg border border-crema/8 bg-cocoa-900/60 px-3.5 py-2.5 hover:border-pistacho/40 transition-all duration-200 cursor-pointer group">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-caramelo">{o.scheduled_time} h · {o.code}</span>
                  <span className={cx("w-2 h-2 rounded-full", STATUS_META[o.status].dot)} />
                </div>
                <p className="text-sm font-bold mt-1 group-hover:text-pistacho transition-colors">{c?.full_name}</p>
                <p className="text-[11px] text-crema/40">{o.items.reduce((a, i) => a + i.quantity, 0)} un. · {fmtMoney(o.total_amount)}{o.balance_due > 0 && <span className="text-fresa"> · cobra {fmtMoney(o.balance_due)}</span>}</p>
              </button>
            );
          })}
        </div>
      </div>

      {finishing && <FinishModal dv={finishing} onClose={() => setFinishing(null)} />}
    </div>
  );
}
