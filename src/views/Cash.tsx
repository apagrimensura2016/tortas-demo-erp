import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { can, PAY_METHODS } from "../lib/types";
import type { PayMethod, TxType } from "../lib/types";
import { fmtDateTime, fmtMoney, fmtTime, todayISO } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, CountUp, Empty, Field, Modal, cx, inputCls, tdCls, thCls } from "../components/ui";
import { useMe } from "../components/layout";

const CATEGORIES = ["Venta", "Seña", "Saldo", "Compra insumos", "Pago servicios", "Sueldos", "Devolución", "Otro"];

function TxModal({ preset, onClose }: { preset: TxType; onClose: () => void }) {
  const addTransaction = useApp((s) => s.addTransaction);
  const orders = useApp((s) => s.orders);
  const clients = useApp((s) => s.clients);
  const toast = useApp((s) => s.toast);
  const me = useMe();

  const [type, setType] = useState<TxType>(preset);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [category, setCategory] = useState(preset === "ingreso" ? "Venta" : "Compra insumos");
  const [desc, setDesc] = useState("");
  const [orderId, setOrderId] = useState("");

  const cents = Math.max(0, Math.round((parseFloat(amount) || 0) * 100));
  const canIn = can(me?.role, "cash_in");
  const canOut = can(me?.role, "cash_out");
  const activeOrders = orders.filter((o) => !["entregado", "cancelado"].includes(o.status));

  return (
    <Modal open onClose={onClose} sub="Movimiento de caja" title={type === "ingreso" ? "Registrar ingreso" : "Registrar egreso"} w="max-w-md">
      <div className="space-y-4">
        {canIn && canOut && (
          <div className="flex gap-2">
            <Btn small variant={type === "ingreso" ? "green" : "soft"} onClick={() => setType("ingreso")}>Ingreso</Btn>
            <Btn small variant={type === "egreso" ? "danger" : "soft"} onClick={() => setType("egreso")}>Egreso</Btn>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto ($)">
            <input className={inputCls} inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </Field>
          <Field label="Categoría">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Método de pago">
          <div className="flex flex-wrap gap-2">
            {PAY_METHODS.map((m) => (
              <Btn key={m.value} small variant={method === m.value ? (type === "ingreso" ? "green" : "danger") : "soft"} onClick={() => setMethod(m.value)}>{m.label}</Btn>
            ))}
          </div>
        </Field>
        <Field label="Descripción">
          <input className={inputCls} placeholder={type === "ingreso" ? "Venta mostrador · torta coco" : "Proveedor de dulce de leche"} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        {type === "ingreso" && (
          <Field label="Vincular a pedido (opcional)">
            <select className={inputCls} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">— Sin vínculo —</option>
              {activeOrders.map((o) => (
                <option key={o.id} value={o.id}>{o.code} · {clients.find((c) => c.id === o.client_id)?.full_name} · saldo {fmtMoney(o.balance_due)}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant={type === "ingreso" ? "green" : "danger"}
            icon={type === "ingreso" ? "plus" : "minus"}
            disabled={cents <= 0}
            onClick={() => {
              const res = addTransaction({ type, amount: cents, method, category, description: desc || category, orderId: orderId || undefined });
              if (res.ok) { toast("ok", `${type === "ingreso" ? "Ingreso" : "Egreso"} de ${fmtMoney(cents)} registrado.`); onClose(); }
              else toast("error", res.error);
            }}
          >
            Registrar
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function Cash() {
  const transactions = useApp((s) => s.transactions);
  const users = useApp((s) => s.users);
  const orders = useApp((s) => s.orders);
  const me = useMe();
  const reports = can(me?.role, "see_reports");
  const canIn = can(me?.role, "cash_in");
  const canOut = can(me?.role, "cash_out");

  const [date, setDate] = useState(todayISO());
  const [modal, setModal] = useState<null | TxType>(null);

  const dayTxs = useMemo(
    () =>
      transactions
        .filter((t) => {
          const d = new Date(t.created_at);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === date;
        })
        .sort((a, b) => b.created_at - a.created_at),
    [transactions, date]
  );

  const ing = dayTxs.filter((t) => t.type === "ingreso").reduce((a, t) => a + t.amount, 0);
  const egr = dayTxs.filter((t) => t.type === "egreso").reduce((a, t) => a + t.amount, 0);
  const byMethod = PAY_METHODS.map((m) => ({
    ...m,
    ing: dayTxs.filter((t) => t.type === "ingreso" && t.payment_method === m.value).reduce((a, t) => a + t.amount, 0),
    egr: dayTxs.filter((t) => t.type === "egreso" && t.payment_method === m.value).reduce((a, t) => a + t.amount, 0),
  }));
  const efectivoEsperado = byMethod.find((m) => m.value === "efectivo");

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1300px] mx-auto space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" max={todayISO()} className={cx(inputCls, "w-44")} value={date} onChange={(e) => setDate(e.target.value)} />
        {date === todayISO() && <Chip className="bg-fresa/12 text-fresa border-fresa/25">Jornada en curso</Chip>}
        <div className="flex-1" />
        {canIn && <Btn variant="green" icon="plus" onClick={() => setModal("ingreso")}>Ingreso</Btn>}
        {canOut && <Btn variant="danger" icon="minus" onClick={() => setModal("egreso")}>Egreso</Btn>}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-4">
          <div className="card p-5 border-t-[3px] border-t-pistacho">
            <p className="eyebrow">Ingresos del día</p>
            <CountUp to={ing} fmt={fmtMoney} className="font-display text-3xl font-black text-pistacho tabular-nums block mt-1" />
            <p className="text-xs text-crema/45 mt-1">{dayTxs.filter((t) => t.type === "ingreso").length} movimientos</p>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-4">
          <div className="card p-5 border-t-[3px] border-t-fresa">
            <p className="eyebrow">Egresos del día</p>
            <CountUp to={egr} fmt={fmtMoney} className="font-display text-3xl font-black text-fresa tabular-nums block mt-1" />
            <p className="text-xs text-crema/45 mt-1">{dayTxs.filter((t) => t.type === "egreso").length} movimientos</p>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-4">
          <div className="card p-5 border-t-[3px] border-t-caramelo relative overflow-hidden">
            <I n="register" className="w-20 h-20 absolute -right-4 -bottom-4 text-crema/5" />
            <p className="eyebrow">Balance neto</p>
            <CountUp to={ing - egr} fmt={(n) => (n < 0 ? "−" : "") + fmtMoney(Math.abs(n))} className="font-display text-3xl font-black text-caramelo tabular-nums block mt-1" />
            <p className="text-xs text-crema/45 mt-1">Ingresos − egresos</p>
          </div>
        </div>
      </div>

      {reports && (
        <div className="card p-5 anim-fade-up">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div>
              <p className="eyebrow">Arqueo de cierre</p>
              <h3 className="font-display text-xl font-bold">Desglose por método de pago</h3>
            </div>
            <Chip className="bg-fresa/12 text-fresa border-fresa/25"><I n="shield" className="w-3 h-3" /> Solo Admin</Chip>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {byMethod.map((m) => (
              <div key={m.value} className={cx("rounded-lg border px-3.5 py-3", m.ing + m.egr > 0 ? "border-crema/12 bg-cocoa-900" : "border-crema/6 bg-cocoa-900/40 opacity-60")}>
                <p className="text-xs font-bold text-crema/60 capitalize">{m.label}</p>
                <p className="font-mono text-sm font-bold text-pistacho mt-1">+{fmtMoney(m.ing)}</p>
                {m.egr > 0 && <p className="font-mono text-xs text-fresa">−{fmtMoney(m.egr)}</p>}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-caramelo/25 bg-caramelo/8 px-4 py-3 flex items-center gap-3 flex-wrap">
            <I n="wallet" className="w-5 h-5 text-caramelo shrink-0" />
            <p className="text-sm text-crema/75">
              Efectivo esperado en cajón: <strong className="font-mono text-caramelo">{fmtMoney((efectivoEsperado?.ing ?? 0) - (efectivoEsperado?.egr ?? 0))}</strong>
              <span className="text-crema/45"> — contá el cajón y compará al cerrar.</span>
            </p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <header className="px-4 py-3.5 border-b border-crema/8 flex items-center justify-between">
          <h3 className="font-display font-bold">Movimientos del {date === todayISO() ? "día" : date}</h3>
          <span className="text-xs text-crema/40 font-mono">{dayTxs.length} registros</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-cocoa-900/70">
              <tr>
                <th className={thCls}>Hora</th>
                <th className={thCls}>Tipo</th>
                <th className={thCls}>Categoría</th>
                <th className={thCls}>Descripción</th>
                <th className={thCls}>Método</th>
                <th className={thCls}>Usuario</th>
                <th className={cx(thCls, "text-right")}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {dayTxs.map((t) => {
                const o = t.order_id ? orders.find((x) => x.id === t.order_id) : null;
                return (
                  <tr key={t.id} className="hover:bg-crema/4 transition-colors">
                    <td className={cx(tdCls, "font-mono text-xs text-crema/50 whitespace-nowrap")}>{fmtTime(t.created_at)}</td>
                    <td className={tdCls}>
                      <Chip className={t.type === "ingreso" ? "bg-pistacho/12 text-pistacho border-pistacho/25" : "bg-fresa/12 text-fresa border-fresa/25"}>
                        <I n={t.type === "ingreso" ? "plus" : "minus"} className="w-3 h-3" />
                        {t.type}
                      </Chip>
                    </td>
                    <td className={cx(tdCls, "text-crema/70")}>{t.category}</td>
                    <td className={cx(tdCls, "text-crema/60 max-w-[260px]")}>
                      <p className="truncate">{t.description}</p>
                      {o && <p className="text-[10px] text-caramelo font-mono">↔ {o.code}</p>}
                    </td>
                    <td className={cx(tdCls, "text-crema/55 text-xs capitalize")}>{t.payment_method.replace("_", " ")}</td>
                    <td className={cx(tdCls, "text-crema/55 text-xs")}>{users.find((u) => u.id === t.user_id)?.full_name.split(" ")[0]}</td>
                    <td className={cx(tdCls, "text-right font-mono font-bold", t.type === "ingreso" ? "text-pistacho" : "text-fresa")}>
                      {t.type === "ingreso" ? "+" : "−"}{fmtMoney(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {dayTxs.length === 0 && <Empty icon="register" title="Caja sin movimientos" body="Registrá un ingreso o egreso para empezar la jornada." />}
      </div>

      <p className="text-[11px] text-crema/35 flex items-center gap-2">
        <I n="clock" className="w-4 h-4" />
        Último movimiento: {dayTxs[0] ? fmtDateTime(dayTxs[0].created_at) : "—"}. Las señas y saldos de pedidos se registran automáticamente aquí.
      </p>

      {modal && <TxModal preset={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
