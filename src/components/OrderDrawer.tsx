import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { can, PAY_METHODS, STATUS_META } from "../lib/types";
import type { Order, PayMethod } from "../lib/types";
import { fmtDateLong, fmtDateTime, fmtMoney } from "../lib/format";
import { I } from "./icons";
import { Btn, Chip, Drawer, Field, Modal, StatusChip, cx, inputCls, taCls } from "./ui";
import { useMe } from "./layout";

function PayModal({ mode, order, onClose }: { mode: "sena" | "entrega"; order: Order; onClose: () => void }) {
  const registerAdvance = useApp((s) => s.registerAdvance);
  const completeOrder = useApp((s) => s.completeOrder);
  const toast = useApp((s) => s.toast);
  const [amount, setAmount] = useState(String(Math.round(order.balance_due / 2 / 100)));
  const [method, setMethod] = useState<PayMethod>("efectivo");

  const cents = Math.max(0, Math.round((parseFloat(amount) || 0) * 100));
  const confirm = () => {
    const res = mode === "sena" ? registerAdvance(order.id, cents, method) : completeOrder(order.id, method);
    if (res.ok) {
      toast("ok", mode === "sena" ? `Seña registrada: ${order.code} confirmado e insumos descontados.` : `${order.code} entregado. ¡Caja actualizada!`);
      onClose();
    } else toast("error", res.error);
  };

  return (
    <Modal open onClose={onClose} sub={mode === "sena" ? "Confirmar pedido" : "Cerrar pedido"} title={mode === "sena" ? "Registrar seña" : "Cobrar saldo y entregar"} w="max-w-md">
      <div className="space-y-4">
        <div className="rounded-lg border border-crema/10 bg-cocoa-900 px-4 py-3 text-sm flex justify-between">
          <span className="text-crema/55">Saldo actual de {order.code}</span>
          <span className="font-mono font-bold">{fmtMoney(order.balance_due)}</span>
        </div>
        {mode === "sena" ? (
          <Field label="Monto de la seña ($)" hint={`Sugerido 50%: $ ${Math.round(order.balance_due / 2 / 100)}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <input className={cx(inputCls, "w-32")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              {[25, 50, 100].map((pc) => (
                <Btn key={pc} small variant={cents === Math.round((order.balance_due * pc) / 100) ? "amber" : "soft"} onClick={() => setAmount(String(Math.round((order.balance_due * pc) / 100 / 100)))}>
                  {pc}%
                </Btn>
              ))}
            </div>
          </Field>
        ) : (
          <p className="text-sm text-crema/60">
            Se cobrará <strong className="text-crema font-mono">{fmtMoney(order.balance_due)}</strong>
            {order.balance_due === 0 && " (ya está pago en su totalidad)"} y el pedido pasará a <strong>Entregado</strong>.
          </p>
        )}
        {!(mode === "entrega" && order.balance_due === 0) && (
          <Field label="Método de pago">
            <div className="flex flex-wrap gap-2">
              {PAY_METHODS.map((m) => (
                <Btn key={m.value} small variant={method === m.value ? "green" : "soft"} onClick={() => setMethod(m.value)}>{m.label}</Btn>
              ))}
            </div>
          </Field>
        )}
        {mode === "sena" && (
          <p className="text-xs text-caramelo flex items-start gap-2">
            <I n="alert" className="w-4 h-4 shrink-0 mt-0.5" />
            Al confirmar se descuentan los insumos según receta y se registra el ingreso en caja. Si falta stock, la operación se rechaza.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Volver</Btn>
          <Btn variant={mode === "sena" ? "amber" : "green"} icon="check" onClick={confirm} disabled={mode === "sena" && cents <= 0}>
            {mode === "sena" ? "Confirmar con seña" : "Entregar"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function CancelModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const cancelOrder = useApp((s) => s.cancelOrder);
  const toast = useApp((s) => s.toast);
  const hadStock = ["confirmado_con_sena", "en_preparacion", "listo_para_retiro", "en_camino"].includes(order.status);
  const [revert, setRevert] = useState(true);
  return (
    <Modal open onClose={onClose} sub="Acción irreversible" title={`Cancelar ${order.code}`} w="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-crema/65 leading-relaxed">
          Se liberará el cupo de producción del {fmtDateLong(order.scheduled_date)}
          {order.advance_payment > 0 && <> · la seña de <strong className="font-mono text-caramelo">{fmtMoney(order.advance_payment)}</strong> queda registrada en caja (política de devolución manual)</>}.
        </p>
        {hadStock && (
          <label className="flex items-start gap-3 rounded-lg border border-crema/12 bg-cocoa-900 px-4 py-3 cursor-pointer hover:border-crema/25 transition">
            <input type="checkbox" checked={revert} onChange={(e) => setRevert(e.target.checked)} className="mt-1 accent-[#a6c954]" />
            <span className="text-sm">
              <strong>Reponer insumos al inventario</strong>
              <span className="block text-xs text-crema/45 mt-0.5">Revierte el descuento de receta (revert_stock = true). Si ya se usaron, dejalo desmarcado.</span>
            </span>
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Volver</Btn>
          <Btn
            variant="danger"
            icon="ban"
            onClick={() => {
              const res = cancelOrder(order.id, revert);
              if (res.ok) toast("ok", `${order.code} cancelado${hadStock && revert ? " con reposición de insumos" : ""}.`);
              else toast("error", res.error);
              onClose();
            }}
          >
            Cancelar pedido
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function WaModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const clients = useApp((s) => s.clients);
  const toast = useApp((s) => s.toast);
  const c = clients.find((x) => x.id === order.client_id);
  const msg = useMemo(() => {
    const statusTxt: Record<string, string> = {
      pendiente: "está pendiente de confirmación",
      confirmado_con_sena: "fue confirmado ¡ya está reservado!",
      en_preparacion: "está en preparación 👩‍🍳",
      listo_para_retiro: "¡está LISTO para retirar! 🎂",
      en_camino: "ya va en camino 🛵",
      entregado: "fue entregado. ¡Gracias por tu compra!",
      cancelado: "lamentablemente fue cancelado.",
    };
    return `¡Hola ${c?.full_name.split(" ")[0] ?? ""}! 👋 Te escribimos de *Tortas Demo*.\n\nTu pedido *${order.code}* ${statusTxt[order.status]}\n📅 ${fmtDateLong(order.scheduled_date)} · ${order.scheduled_time} h\n💰 Total: ${fmtMoney(order.total_amount)}${order.balance_due > 0 ? `\n👉 Saldo pendiente: *${fmtMoney(order.balance_due)}*` : "\n✅ Está pago en su totalidad."}\n\n¡Gracias por elegirnos! 🍰`;
  }, [c, order]);

  return (
    <Modal open onClose={onClose} sub="Plantilla de notificación" title="Mensaje de WhatsApp" w="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl border border-pistacho/25 bg-[#0b141a] p-4 text-sm leading-relaxed whitespace-pre-wrap text-[#e9edef] font-body">
          {msg}
        </div>
        <p className="text-xs text-crema/40 flex items-center gap-2">
          <I n="wa" className="w-4 h-4 text-pistacho" />
          Demo sin credenciales: en producción sale vía Meta Cloud API (plantilla <code className="font-mono text-pistacho">pedido_listo_tortas_demo</code>).
        </p>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
          <Btn
            variant="green"
            icon="copy"
            onClick={() => {
              navigator.clipboard?.writeText(msg).then(
                () => toast("ok", "Mensaje copiado al portapapeles."),
                () => toast("error", "No se pudo copiar automáticamente.")
              );
            }}
          >
            Copiar mensaje
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function DeliveryModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const clients = useApp((s) => s.clients);
  const createDelivery = useApp((s) => s.createDelivery);
  const toast = useApp((s) => s.toast);
  const c = clients.find((x) => x.id === order.client_id);
  const [addr, setAddr] = useState(c?.address ?? "");
  return (
    <Modal open onClose={onClose} sub="Logística" title="Asignar reparto" w="max-w-md">
      <div className="space-y-4">
        <Field label="Dirección de entrega">
          <textarea className={taCls} value={addr} onChange={(e) => setAddr(e.target.value)} />
        </Field>
        <p className="text-xs text-crema/45">La entrega queda pendiente hasta que Admin asigne un repartidor.</p>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Volver</Btn>
          <Btn
            variant="primary"
            icon="scooter"
            onClick={() => {
              const res = createDelivery(order.id, addr);
              if (res.ok) toast("ok", "Reparto creado. Asigná un repartidor desde el módulo Reparto.");
              else toast("error", res.error);
              onClose();
            }}
          >
            Crear entrega
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function OrderDrawer() {
  const id = useApp((s) => s.selectedOrderId);
  const open = useApp((s) => s.openOrder);
  const order = useApp((s) => s.orders.find((o) => o.id === s.selectedOrderId));
  const clients = useApp((s) => s.clients);
  const products = useApp((s) => s.products);
  const users = useApp((s) => s.users);
  const deliveries = useApp((s) => s.deliveries);
  const logs = useApp((s) => s.orderLogs);
  const txs = useApp((s) => s.transactions);
  const transition = useApp((s) => s.transition);
  const completeOrder = useApp((s) => s.completeOrder);
  const toast = useApp((s) => s.toast);
  const me = useMe();

  const [pay, setPay] = useState<null | "sena" | "entrega">(null);
  const [canceling, setCanceling] = useState(false);
  const [wa, setWa] = useState(false);
  const [assigning, setAssigning] = useState(false);

  if (!id || !order) return null;
  const c = clients.find((x) => x.id === order.client_id);
  const dv = deliveries.find((d) => d.order_id === order.id);
  const timeline = logs.filter((l) => l.order_id === order.id).sort((a, b) => a.created_at - b.created_at);
  const orderTxs = txs.filter((t) => t.order_id === order.id);
  const role = me?.role;
  const closed = order.status === "entregado" || order.status === "cancelado";

  const act = (next: Parameters<typeof transition>[1]) => {
    const res = transition(order.id, next);
    if (res.ok) toast("ok", `${order.code} → ${STATUS_META[next].label}.`);
    else toast("error", res.error);
  };

  return (
    <Drawer open onClose={() => open(null)}>
      {/* header */}
      <header className="sticky top-0 z-10 bg-cocoa-850/95 border-b border-crema/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-caramelo">{order.code}</span>
          <StatusChip status={order.status} />
          {order.advance_payment > 0 && !closed && <Chip className="bg-caramelo/12 text-caramelo border-caramelo/25">seña {fmtMoney(order.advance_payment)}</Chip>}
          <div className="flex-1" />
          <Btn small variant="ghost" icon="wa" onClick={() => setWa(true)}>WhatsApp</Btn>
          <button onClick={() => open(null)} className="p-1.5 rounded-lg text-crema/50 hover:text-crema hover:bg-crema/8 transition cursor-pointer" aria-label="Cerrar">
            <I n="x" className="w-5 h-5" />
          </button>
        </div>
        <p className="eyebrow mt-2">{fmtDateLong(order.scheduled_date)} · {order.scheduled_time} h · {order.order_type === "reserva_futura" ? "reserva futura" : "pedido inmediato"}</p>
      </header>

      <div className="p-5 space-y-5">
        {/* acciones */}
        {!closed && (
          <section>
            <p className="eyebrow mb-2">Acciones</p>
            <div className="flex flex-wrap gap-2">
              {order.status === "pendiente" && can(role, "confirm_order") && (
                <Btn variant="amber" icon="wallet" onClick={() => setPay("sena")}>Registrar seña</Btn>
              )}
              {order.status === "confirmado_con_sena" && can(role, "to_prep") && (
                <Btn variant="primary" icon="flame" onClick={() => act("en_preparacion")}>Pasar a preparación</Btn>
              )}
              {order.status === "en_preparacion" && can(role, "to_ready") && (
                <Btn variant="green" icon="check" onClick={() => act("listo_para_retiro")}>Marcar listo</Btn>
              )}
              {order.status === "listo_para_retiro" && !dv && can(role, "create_order") && (
                <Btn variant="soft" icon="scooter" onClick={() => setAssigning(true)}>Asignar reparto</Btn>
              )}
              {order.status === "listo_para_retiro" && dv && dv.driver_id && can(role, "to_route") && (
                <Btn variant="primary" icon="scooter" onClick={() => act("en_camino")}>Iniciar entrega</Btn>
              )}
              {(order.status === "listo_para_retiro" || order.status === "en_camino") && (can(role, "deliver") || can(role, "cash_in")) && (
                <Btn
                  variant="green"
                  icon="check"
                  onClick={() => {
                    if (order.balance_due > 0) setPay("entrega");
                    else {
                      const res = completeOrder(order.id, null);
                      if (res.ok) toast("ok", `${order.code} entregado.`);
                      else toast("error", res.error);
                    }
                  }}
                >
                  {order.balance_due > 0 ? `Cobrar ${fmtMoney(order.balance_due)} y entregar` : "Marcar entregado"}
                </Btn>
              )}
              {can(role, "cancel_order") && (
                <Btn variant="danger" icon="ban" onClick={() => setCanceling(true)}>Cancelar pedido</Btn>
              )}
              {!can(role, "create_order") && !can(role, "to_prep") && !can(role, "to_ready") && !can(role, "deliver") && !can(role, "cancel_order") && (
                <p className="text-xs text-crema/40 flex items-center gap-2"><I n="shield" className="w-4 h-4" /> Tu rol ({role}) es de solo lectura para este pedido.</p>
              )}
            </div>
          </section>
        )}

        {/* cliente */}
        <section className="card p-4">
          <p className="eyebrow mb-2">Cliente</p>
          <p className="font-display text-lg font-bold">{c?.full_name}</p>
          <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm text-crema/60">
            <span className="flex items-center gap-2"><I n="phone" className="w-4 h-4 text-pistacho" />{c?.phone}</span>
            {c?.address && <span className="flex items-center gap-2"><I n="pin" className="w-4 h-4 text-caramelo" />{c.address}</span>}
          </div>
          {c?.notes && <p className="mt-2.5 text-xs text-arandano/90 bg-arandano/8 border border-arandano/20 rounded-lg px-3 py-2">📌 {c.notes}</p>}
          {order.client_notes && (
            <p className="mt-2 text-xs bg-cocoa-900 border border-crema/10 rounded-lg px-3 py-2">
              <span className="eyebrow block mb-0.5">Notas del cliente</span>
              {order.client_notes}
            </p>
          )}
          {order.internal_notes && (
            <p className="mt-2 text-xs bg-fresa/6 border border-fresa/20 rounded-lg px-3 py-2 text-crema/70">
              <span className="eyebrow block mb-0.5 text-fresa/70">Interno (solo personal)</span>
              {order.internal_notes}
            </p>
          )}
        </section>

        {/* items */}
        <section className="card p-4">
          <p className="eyebrow mb-2">Detalle</p>
          <div className="space-y-2.5">
            {order.items.map((i) => {
              const p = products.find((x) => x.id === i.product_id);
              return (
                <div key={i.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{i.quantity}× {p?.name}</p>
                    {i.customizations && (i.customizations.texto || i.customizations.color) && (
                      <p className="text-xs text-arandano mt-0.5 flex items-center gap-1.5">
                        <I n="spark" className="w-3.5 h-3.5" />
                        {i.customizations.texto && <>“{i.customizations.texto}”</>}
                        {i.customizations.color && <>· frosting {i.customizations.color}</>}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums">{fmtMoney(i.subtotal)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-dashed border-crema/12 space-y-1 text-sm">
            <div className="flex justify-between text-crema/55"><span>Subtotal</span><span className="font-mono">{fmtMoney(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-fresa"><span>Descuento</span><span className="font-mono">−{fmtMoney(order.discount)}</span></div>}
            <div className="flex justify-between font-bold text-base"><span>Total</span><span className="font-display font-black text-lg tabular-nums">{fmtMoney(order.total_amount)}</span></div>
            <div className="flex justify-between text-caramelo"><span>Seña</span><span className="font-mono">{fmtMoney(order.advance_payment)}</span></div>
            <div className={cx("flex justify-between font-bold", order.balance_due > 0 ? "text-fresa" : "text-pistacho")}>
              <span>Saldo</span><span className="font-mono">{fmtMoney(order.balance_due)}</span>
            </div>
          </div>
        </section>

        {/* reparto */}
        {dv && (
          <section className="card p-4">
            <p className="eyebrow mb-2">Reparto</p>
            <div className="flex items-center gap-3 text-sm">
              <I n="scooter" className="w-5 h-5 text-arandano" />
              <div className="flex-1">
                <p className="font-bold">{dv.delivery_address}</p>
                <p className="text-xs text-crema/45 mt-0.5">
                  {dv.driver_id ? `Repartidor: ${users.find((u) => u.id === dv.driver_id)?.full_name}` : "Sin repartidor asignado"}
                  {dv.delivered_at && <> · entregado {fmtDateTime(dv.delivered_at)}</>}
                </p>
              </div>
              <Chip className={
                dv.status === "entregado" ? "bg-pistacho/12 text-pistacho border-pistacho/25" :
                dv.status === "en_camino" ? "bg-arandano/12 text-arandano border-arandano/25" :
                dv.status === "fallido" ? "bg-fresa/12 text-fresa border-fresa/25" :
                "bg-crema/8 text-crema/60 border-crema/15"
              }>
                {dv.status.replace("_", " ")}
              </Chip>
            </div>
            {dv.proof_note && <p className="mt-2 text-xs text-crema/50 bg-cocoa-900 rounded-lg px-3 py-2">Comprobante: {dv.proof_note}</p>}
          </section>
        )}

        {/* pagos */}
        {orderTxs.length > 0 && (
          <section className="card p-4">
            <p className="eyebrow mb-2">Pagos vinculados</p>
            <div className="space-y-1.5">
              {orderTxs.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-crema/60">{t.category} · {t.payment_method.replace("_", " ")}</span>
                  <span className={cx("font-mono font-bold", t.type === "ingreso" ? "text-pistacho" : "text-fresa")}>
                    {t.type === "ingreso" ? "+" : "−"}{fmtMoney(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* timeline */}
        <section className="card p-4">
          <p className="eyebrow mb-3">Historial de estados (OrderLog)</p>
          <div className="space-y-0">
            {timeline.map((l, ix) => {
              const u = users.find((x) => x.id === l.user_id);
              return (
                <div key={l.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cx("w-2.5 h-2.5 rounded-full mt-1 shrink-0", STATUS_META[l.new_status].dot)} />
                    {ix < timeline.length - 1 && <span className="w-px flex-1 bg-crema/12 my-1" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-sm font-bold">{STATUS_META[l.new_status].label}</p>
                    <p className="text-xs text-crema/45">{u?.full_name ?? "Sistema"} · {fmtDateTime(l.created_at)}{l.note && <> · <span className="text-crema/60">{l.note}</span></>}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-center text-[11px] text-crema/25 pb-2 font-mono">
          creado {fmtDateTime(order.created_at)} · atendido por {users.find((u) => u.id === order.user_id)?.full_name}
        </p>
      </div>

      {pay && <PayModal mode={pay} order={order} onClose={() => setPay(null)} />}
      {canceling && <CancelModal order={order} onClose={() => setCanceling(false)} />}
      {wa && <WaModal order={order} onClose={() => setWa(false)} />}
      {assigning && <DeliveryModal order={order} onClose={() => setAssigning(false)} />}
    </Drawer>
  );
}
