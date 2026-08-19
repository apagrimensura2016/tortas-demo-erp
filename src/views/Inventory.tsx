import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { can } from "../lib/types";
import type { InventoryItem } from "../lib/types";
import { UNIT_FACTOR, fmtQty, parseQty } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, Empty, Field, Modal, Seg, cx, inputCls, tdCls, thCls } from "../components/ui";
import { useMe } from "../components/layout";

function AdjustModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const products = useApp((s) => s.products);
  const adjustInventory = useApp((s) => s.adjustInventory);
  const toast = useApp((s) => s.toast);
  const me = useMe();
  const onlyMerma = me?.role === "cocinero";

  const [kind, setKind] = useState<"compra" | "merma">(onlyMerma ? "merma" : "compra");
  const [qtyStr, setQtyStr] = useState("");
  const [reason, setReason] = useState("");

  const prod = products.find((p) => p.id === item.product_id);
  const dispUnit = item.base_unit === "un" ? "un" : item.base_unit === "ml" ? "L" : "kg";
  const factor = dispUnit === "un" ? 1 : UNIT_FACTOR[dispUnit === "kg" ? "kg" : "l"];

  return (
    <Modal open onClose={onClose} sub="Movimiento manual · queda en AuditLog" title={`Ajustar ${prod?.name}`} w="max-w-md">
      <div className="space-y-4">
        <div className="rounded-lg border border-crema/10 bg-cocoa-900 px-4 py-3 text-sm flex justify-between">
          <span className="text-crema/55">Stock actual</span>
          <span className="font-mono font-bold">{fmtQty(item.qty, item.base_unit)}</span>
        </div>
        <Field label="Tipo de ajuste">
          <Seg
            options={onlyMerma ? [{ v: "merma", label: "Merma / desperdicio" }] : [{ v: "compra", label: "Compra / reposición" }, { v: "merma", label: "Merma / desperdicio" }]}
            value={kind}
            onChange={setKind}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Cantidad (${dispUnit})`}>
            <input className={inputCls} inputMode="decimal" placeholder="0,0" value={qtyStr} onChange={(e) => setQtyStr(e.target.value)} autoFocus />
          </Field>
          <Field label="Motivo">
            <input className={inputCls} placeholder={kind === "compra" ? "Proveedor…" : "Vencimiento, rotura…"} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <p className={cx("text-xs flex items-start gap-2", kind === "compra" ? "text-pistacho" : "text-fresa")}>
          <I n={kind === "compra" ? "plus" : "minus"} className="w-4 h-4 shrink-0 mt-0.5" />
          {kind === "compra" ? "Suma al inventario y audita la compra." : "Descuenta del inventario (acción permitida a cocina)."}
        </p>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant={kind === "compra" ? "green" : "danger"}
            icon="scale"
            onClick={() => {
              const q = parseQty(qtyStr);
              const res = adjustInventory(item.product_id, kind, Math.round(q * factor), reason);
              if (res.ok) toast("ok", `${prod?.name}: ${kind === "compra" ? "+" : "−"}${fmtQty(Math.round(q * factor), item.base_unit)} registrado.`);
              else toast("error", res.error);
              onClose();
            }}
          >
            Registrar {kind}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function Inventory() {
  const inventory = useApp((s) => s.inventory);
  const products = useApp((s) => s.products);
  const recipes = useApp((s) => s.recipes);
  const me = useMe();
  const canAdjust = can(me?.role, "adjust_stock");

  const [filter, setFilter] = useState<"todos" | "bajos">("todos");
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);

  const rows = useMemo(
    () =>
      inventory
        .map((i) => ({ i, p: products.find((p) => p.id === i.product_id) }))
        .filter((x) => x.p)
        .filter((x) => (filter === "bajos" ? x.i.qty <= x.i.min_qty : true))
        .sort((a, b) => a.i.qty / Math.max(1, a.i.min_qty) - b.i.qty / Math.max(1, b.i.min_qty)),
    [inventory, products, filter]
  );

  const lows = inventory.filter((i) => i.qty <= i.min_qty);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1100px] mx-auto">
      {lows.length > 0 && (
        <div className="card p-4 mb-5 border-fresa/25 bg-fresa/6 flex items-center gap-4 flex-wrap anim-fade-up">
          <span className="w-10 h-10 rounded-lg bg-fresa/15 border border-fresa/30 text-fresa flex items-center justify-center shrink-0">
            <I n="alert" className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-[200px]">
            <p className="font-bold text-fresa">{lows.length} insumo{lows.length > 1 ? "s" : ""} bajo mínimo</p>
            <p className="text-xs text-crema/50 mt-0.5">
              {lows.map((l) => products.find((p) => p.id === l.product_id)?.name).join(" · ")}
            </p>
          </div>
          <Btn small variant="danger" onClick={() => setFilter("bajos")}>Ver solo bajos</Btn>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Seg options={[{ v: "todos", label: `Todos (${inventory.length})` }, { v: "bajos", label: `Bajo mínimo (${lows.length})` }]} value={filter} onChange={setFilter} />
        <p className="text-xs text-crema/40 flex items-center gap-2">
          <I n="shield" className="w-4 h-4" />
          {canAdjust ? (me?.role === "cocinero" ? "Rol cocina: solo mermas" : "Los ajustes manuales se auditan con IP") : "Tu rol no ajusta inventario (403 en API)"}
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-cocoa-900/70">
              <tr>
                <th className={thCls}>Insumo</th>
                <th className={thCls}>Stock / mínimo</th>
                <th className={cx(thCls, "w-56")}>Nivel</th>
                <th className={thCls}>Estado</th>
                <th className={thCls}>Usado en</th>
                <th className={cx(thCls, "text-right")}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ i, p }) => {
                const ratio = i.min_qty > 0 ? i.qty / i.min_qty : 2;
                const critical = ratio <= 0.5;
                const low = ratio <= 1;
                const usedIn = recipes.filter((r) => r.ingredient_id === i.product_id).length;
                return (
                  <tr key={i.product_id} className="hover:bg-crema/4 transition-colors">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <span className={cx("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", critical ? "bg-fresa/12 border-fresa/30 text-fresa" : low ? "bg-caramelo/12 border-caramelo/30 text-caramelo" : "bg-pistacho/10 border-pistacho/25 text-pistacho")}>
                          <I n="box" className="w-4 h-4" />
                        </span>
                        <p className="font-bold">{p?.name}</p>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <p className="font-mono text-sm font-bold">{fmtQty(i.qty, i.base_unit)}</p>
                      <p className="text-[11px] text-crema/40 font-mono">mín. {fmtQty(i.min_qty, i.base_unit)}</p>
                    </td>
                    <td className={tdCls}>
                      <div className="h-2 rounded-full bg-cocoa-950 overflow-hidden">
                        <div
                          className={cx("h-full rounded-full transition-all duration-700", critical ? "bg-fresa" : low ? "bg-caramelo" : "bg-pistacho")}
                          style={{ width: `${Math.min(100, ratio * 50)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-crema/35 font-mono mt-1">{Math.round(ratio * 100)}% del mínimo</p>
                    </td>
                    <td className={tdCls}>
                      <Chip className={critical ? "bg-fresa/15 text-fresa border-fresa/30" : low ? "bg-caramelo/15 text-caramelo border-caramelo/30" : "bg-pistacho/12 text-pistacho border-pistacho/25"}>
                        {critical ? "Crítico" : low ? "Bajo" : "OK"}
                      </Chip>
                    </td>
                    <td className={cx(tdCls, "text-crema/55 text-xs")}>{usedIn} receta{usedIn !== 1 && "s"}</td>
                    <td className={cx(tdCls, "text-right")}>
                      {canAdjust && <Btn small variant="soft" icon="scale" onClick={() => setAdjusting(i)}>Ajustar</Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty icon="check" title="Nada por debajo del mínimo" body="Todos los insumos están por encima del stock de seguridad." />}
      </div>

      <p className="text-[11px] text-crema/35 mt-4 flex items-center gap-2">
        <I n="whisk" className="w-4 h-4" />
        El stock se descuenta automáticamente al confirmar pedidos con seña, usando la receta × cantidad (transaccional, con conversión kg↔g y L↔ml).
      </p>

      {adjusting && <AdjustModal item={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  );
}
