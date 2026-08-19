import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { can, CAT_META } from "../lib/types";
import type { Product, ProductCategory, Unit } from "../lib/types";
import { convertToBase, fmtMoney, fmtQty, parseQty, uid, unitsForBase } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, Empty, Field, Modal, Seg, Toggle, cx, inputCls, taCls } from "../components/ui";
import { useMe } from "../components/layout";

/* ------------- constructor de recetas (UI maestro-detalle) ------------- */

interface RowState { key: string; ingredientId: string; qty: string; unit: Unit }

function RecipeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const recipes = useApp((s) => s.recipes);
  const products = useApp((s) => s.products);
  const inventory = useApp((s) => s.inventory);
  const saveRecipe = useApp((s) => s.saveRecipe);
  const toast = useApp((s) => s.toast);

  const insumos = products.filter((p) => p.category === "insumo" && p.is_active);
  const [rows, setRows] = useState<RowState[]>(() =>
    recipes.filter((r) => r.finished_product_id === product.id).map((r) => ({ key: r.id, ingredientId: r.ingredient_id, qty: String(r.qty), unit: r.unit }))
  );

  const costBase = (ingId: string) => {
    const ing = products.find((p) => p.id === ingId);
    const inv = inventory.find((i) => i.product_id === ingId);
    if (!ing) return 1000;
    return inv && inv.base_unit !== "un" ? 1000 : 1; // costo por kg / L / unidad
  };

  const recipeCost = rows.reduce((a, r) => {
    const q = parseQty(r.qty);
    if (!q) return a;
    const ing = products.find((p) => p.id === r.ingredientId);
    if (!ing) return a;
    return a + (convertToBase(q, r.unit) / costBase(r.ingredientId)) * ing.cost_price;
  }, 0);

  const setRow = (key: string, patch: Partial<RowState>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((rs) => [...rs, { key: uid(), ingredientId: insumos[0]?.id ?? "", qty: "", unit: unitsForBase(inventory.find((i) => i.product_id === insumos[0]?.id)?.base_unit ?? "g")[0] }]);

  const save = () => {
    const res = saveRecipe(
      product.id,
      rows.filter((r) => r.ingredientId && parseQty(r.qty) > 0).map((r) => ({ ingredientId: r.ingredientId, qty: parseQty(r.qty), unit: r.unit }))
    );
    if (res.ok) {
      toast("ok", `Receta de ${product.name} guardada (auditoría: RECIPE_UPDATED).`);
      onClose();
    } else toast("error", res.error);
  };

  return (
    <Modal open onClose={onClose} sub={`Escandallo · ${rows.length} insumos`} title={`Receta: ${product.name}`} w="max-w-2xl">
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-crema/15 py-6 text-center text-sm text-crema/40">
            Esta receta está vacía: sin insumos, confirmar pedidos no descuenta stock.
          </div>
        )}
        {rows.map((r, ix) => {
          const ing = products.find((p) => p.id === r.ingredientId);
          const inv = inventory.find((i) => i.product_id === r.ingredientId);
          const base = inv?.base_unit ?? "g";
          const compat = unitsForBase(base);
          const need = parseQty(r.qty) ? convertToBase(parseQty(r.qty), r.unit) : 0;
          const enough = inv ? inv.qty >= need : true;
          return (
            <div key={r.key} className="anim-fade-up rounded-lg border border-crema/10 bg-cocoa-900/60 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] text-crema/35 w-5">{ix + 1}.</span>
                <select
                  className={cx(inputCls, "flex-1 min-w-[160px] py-2")}
                  value={r.ingredientId}
                  onChange={(e) => {
                    const nb = inventory.find((i) => i.product_id === e.target.value)?.base_unit ?? "g";
                    setRow(r.key, { ingredientId: e.target.value, unit: unitsForBase(nb)[0] });
                  }}
                >
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <input
                  className={cx(inputCls, "w-24 py-2")}
                  inputMode="decimal"
                  placeholder="cant."
                  value={r.qty}
                  onChange={(e) => setRow(r.key, { qty: e.target.value })}
                />
                <select className={cx(inputCls, "w-20 py-2")} value={r.unit} onChange={(e) => setRow(r.key, { unit: e.target.value as Unit })}>
                  {compat.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="p-2 rounded-lg text-crema/35 hover:text-fresa hover:bg-fresa/10 transition cursor-pointer" aria-label="Quitar insumo">
                  <I n="trash" className="w-4 h-4" />
                </button>
              </div>
              {need > 0 && (
                <p className={cx("text-[11px] mt-1.5 pl-7 font-mono", enough ? "text-pistacho/75" : "text-fresa")}>
                  = {fmtQty(need, base)} por unidad vendida {inv && (enough ? `· stock actual ${fmtQty(inv.qty, base)}` : `· ¡stock insuficiente! hay ${fmtQty(inv.qty, base)}`)}
                </p>
              )}
            </div>
          );
        })}

        <Btn variant="soft" icon="plus" onClick={addRow} className="w-full">Agregar insumo</Btn>

        <div className="flex items-center justify-between rounded-lg border border-crema/10 bg-cocoa-900 px-4 py-3">
          <div>
            <p className="eyebrow">Costo estimado de receta</p>
            <p className="font-display text-xl font-black text-caramelo tabular-nums">{fmtMoney(Math.round(recipeCost))}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Costo cargado / precio venta</p>
            <p className="text-sm font-mono text-crema/70">{fmtMoney(product.cost_price)} / <span className="text-pistacho">{fmtMoney(product.sale_price)}</span></p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" icon="whisk" onClick={save}>Guardar receta</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ------------- alta / edición de producto ------------- */

function ProductModal({ initial, onClose }: { initial: Product | null; onClose: () => void }) {
  const saveProduct = useApp((s) => s.saveProduct);
  const toast = useApp((s) => s.toast);
  const [f, setF] = useState<Product>(
    initial ?? { id: uid(), name: "", description: "", category: "torta", sale_price: 0, cost_price: 0, is_active: true }
  );
  const [price, setPrice] = useState(String(Math.round((initial?.sale_price ?? 0) / 100)));
  const [cost, setCost] = useState(String(Math.round((initial?.cost_price ?? 0) / 100)));

  return (
    <Modal open onClose={onClose} sub="Catálogo" title={initial ? `Editar: ${initial.name}` : "Nuevo producto"} w="max-w-md">
      <div className="space-y-4">
        <Field label="Nombre *">
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Torta de Chocolate 2 kg" autoFocus />
        </Field>
        <Field label="Categoría">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CAT_META) as ProductCategory[]).map((c) => (
              <Btn key={c} small variant={f.category === c ? "amber" : "soft"} onClick={() => setF({ ...f, category: c })}>{CAT_META[c].label}</Btn>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio de venta ($)">
            <input className={inputCls} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Costo ($)">
            <input className={inputCls} inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        </div>
        <Field label="Descripción">
          <textarea className={taCls} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <Toggle checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} />
          Producto activo (visible en venta)
        </label>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="primary"
            icon="check"
            onClick={() => {
              const res = saveProduct({ ...f, sale_price: Math.max(0, Math.round((parseFloat(price) || 0) * 100)), cost_price: Math.max(0, Math.round((parseFloat(cost) || 0) * 100)) });
              if (res.ok) { toast("ok", "Producto guardado."); onClose(); }
              else toast("error", res.error);
            }}
          >
            Guardar
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ------------- vista ------------- */

export default function Products() {
  const products = useApp((s) => s.products);
  const recipes = useApp((s) => s.recipes);
  const inventory = useApp((s) => s.inventory);
  const toggleProduct = useApp((s) => s.toggleProduct);
  const me = useMe();
  const manage = can(me?.role, "manage_products");

  const [cat, setCat] = useState<"todas" | ProductCategory>("todas");
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(
    () => products.filter((p) => (cat === "todas" ? true : p.category === cat)).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
    [products, cat]
  );

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <Seg
          options={[{ v: "todas", label: "Todos" }, { v: "torta", label: "Tortas" }, { v: "postre", label: "Postres" }, { v: "bebida", label: "Bebidas" }, { v: "insumo", label: "Insumos" }]}
          value={cat}
          onChange={setCat}
        />
        {manage && <Btn variant="primary" icon="plus" onClick={() => setCreating(true)}>Nuevo producto</Btn>}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((p, ix) => {
          const nIng = recipes.filter((r) => r.finished_product_id === p.id).length;
          const inv = inventory.find((i) => i.product_id === p.id);
          const margin = p.sale_price > 0 ? Math.round(((p.sale_price - p.cost_price) / p.sale_price) * 100) : 0;
          return (
            <div key={p.id} className={cx("card card-hover p-4 anim-fade-up relative overflow-hidden", !p.is_active && "opacity-55")} style={{ animationDelay: `${Math.min(ix, 8) * 40}ms` }}>
              <span className={cx("absolute top-0 left-0 w-full h-[3px]", p.category === "torta" ? "bg-fresa" : p.category === "postre" ? "bg-caramelo" : p.category === "bebida" ? "bg-arandano" : "bg-pistacho")} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Chip className={cx(
                    p.category === "torta" ? "bg-fresa/12 text-fresa border-fresa/25" :
                    p.category === "postre" ? "bg-caramelo/12 text-caramelo border-caramelo/25" :
                    p.category === "bebida" ? "bg-arandano/12 text-arandano border-arandano/25" : "bg-pistacho/12 text-pistacho border-pistacho/25"
                  )}>
                    {CAT_META[p.category].label}
                  </Chip>
                  <h3 className="font-display text-lg font-bold leading-tight mt-2">{p.name}</h3>
                  {p.description && <p className="text-xs text-crema/45 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>}
                </div>
                {manage && <Toggle checked={p.is_active} onChange={() => toggleProduct(p.id)} />}
              </div>

              <div className="flex items-end justify-between mt-3">
                <div>
                  {p.category === "insumo" ? (
                    inv ? (
                      <>
                        <p className="eyebrow">Stock</p>
                        <p className={cx("font-display text-xl font-black tabular-nums", inv.qty <= inv.min_qty ? "text-fresa" : "text-crema")}>{fmtQty(inv.qty, inv.base_unit)}</p>
                      </>
                    ) : null
                  ) : (
                    <>
                      <p className="eyebrow">Precio</p>
                      <p className="font-display text-2xl font-black text-pistacho tabular-nums">{fmtMoney(p.sale_price)}</p>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-crema/40 font-mono text-right">
                  {p.category !== "insumo" && <>costo {fmtMoney(p.cost_price)} · margen {margin}%</>}
                </p>
              </div>

              {p.category !== "insumo" && (
                <div className="flex gap-2 mt-3.5 pt-3 border-t border-crema/8">
                  <Btn small variant="soft" icon="whisk" onClick={() => setRecipeFor(p)}>
                    Receta {nIng > 0 && <span className="font-mono text-caramelo">({nIng})</span>}
                  </Btn>
                  {manage && <Btn small variant="ghost" icon="edit" onClick={() => setEditing(p)}>Editar</Btn>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {list.length === 0 && <div className="card"><Empty icon="cake" title="Sin productos en esta categoría" /></div>}

      {recipeFor && <RecipeModal product={recipeFor} onClose={() => setRecipeFor(null)} />}
      {(creating || editing) && <ProductModal initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />}
    </div>
  );
}
