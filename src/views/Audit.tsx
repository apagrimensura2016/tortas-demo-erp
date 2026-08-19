import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { PERMS, ROLE_META } from "../lib/types";
import type { PermKey, Role } from "../lib/types";
import { fmtDateTime } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, Empty, Field, Modal, Seg, cx, inputCls, tdCls, thCls } from "../components/ui";

const PERM_LABELS: Record<PermKey, string> = {
  create_order: "Crear / editar pedidos",
  confirm_order: "Confirmar con seña (descuenta stock)",
  to_prep: "Pasar a «En preparación»",
  to_ready: "Marcar «Listo para retiro»",
  to_route: "Iniciar entrega (en camino)",
  deliver: "Finalizar entrega / entregar",
  cancel_order: "Cancelar pedidos",
  cash_in: "Registrar ingresos de caja",
  cash_out: "Registrar egresos de caja",
  see_reports: "Ver reportes financieros",
  adjust_stock: "Ajustar inventario (mermas)",
  stock_purchase: "Registrar compras de insumos",
  manage_products: "Gestionar productos y recetas",
  manage_clients: "Gestionar clientes",
  assign_driver: "Asignar repartidores",
  see_audit: "Ver auditoría y ajustes",
};

const ROLES: Role[] = ["admin", "vendedor", "cocinero", "repartidor"];

const ACTION_TONES: Record<string, string> = {
  LOGIN: "bg-pistacho/12 text-pistacho border-pistacho/25",
  MANUAL_STOCK_ADJUSTMENT: "bg-caramelo/12 text-caramelo border-caramelo/25",
  PRICE_CHANGE: "bg-fresa/12 text-fresa border-fresa/25",
  RECIPE_UPDATED: "bg-arandano/12 text-arandano border-arandano/25",
  ORDER_CREATED: "bg-pistacho/12 text-pistacho border-pistacho/25",
  ORDER_CANCELLED: "bg-fresa/12 text-fresa border-fresa/25",
};

export default function Audit() {
  const auditLogs = useApp((s) => s.auditLogs);
  const users = useApp((s) => s.users);
  const settings = useApp((s) => s.settings);
  const saveSettings = useApp((s) => s.saveSettings);
  const resetDemo = useApp((s) => s.resetDemo);

  const [tab, setTab] = useState<"registro" | "permisos" | "ajustes">("registro");
  const [cap, setCap] = useState(String(settings.max_capacity));
  const [name, setName] = useState(settings.store_name);
  const [confirmReset, setConfirmReset] = useState(false);

  const logs = useMemo(() => [...auditLogs].sort((a, b) => b.created_at - a.created_at).slice(0, 80), [auditLogs]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <Seg
          options={[{ v: "registro", label: "Registro de auditoría" }, { v: "permisos", label: "Matriz de permisos" }, { v: "ajustes", label: "Ajustes" }]}
          value={tab}
          onChange={setTab}
        />
        <Chip className="bg-fresa/12 text-fresa border-fresa/25"><I n="shield" className="w-3 h-3" /> Solo rol Admin</Chip>
      </div>

      {tab === "registro" && (
        <div className="card overflow-hidden anim-fade-up">
          <header className="px-4 py-3.5 border-b border-crema/8 flex items-center justify-between">
            <h3 className="font-display font-bold">AuditLog · acciones críticas</h3>
            <span className="text-xs text-crema/40 font-mono">{logs.length} eventos</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-cocoa-900/70">
                <tr>
                  <th className={thCls}>Fecha</th>
                  <th className={thCls}>Usuario</th>
                  <th className={thCls}>Acción</th>
                  <th className={thCls}>Entidad</th>
                  <th className={thCls}>Detalle</th>
                  <th className={thCls}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-crema/4 transition-colors">
                    <td className={cx(tdCls, "font-mono text-xs text-crema/50 whitespace-nowrap")}>{fmtDateTime(l.created_at)}</td>
                    <td className={cx(tdCls, "text-sm font-bold")}>{users.find((u) => u.id === l.user_id)?.full_name ?? "Sistema"}</td>
                    <td className={tdCls}>
                      <Chip className={ACTION_TONES[l.action] ?? "bg-crema/8 text-crema/60 border-crema/12"}>{l.action}</Chip>
                    </td>
                    <td className={cx(tdCls, "text-xs text-crema/50")}>{l.entity}{l.entity_id && <span className="font-mono"> · {l.entity_id.slice(0, 12)}</span>}</td>
                    <td className={cx(tdCls, "text-xs text-crema/65 max-w-[320px]")}>{l.detail}</td>
                    <td className={cx(tdCls, "font-mono text-xs text-crema/40")}>{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && <Empty icon="shield" title="Sin eventos" />}
        </div>
      )}

      {tab === "permisos" && (
        <div className="card overflow-hidden anim-fade-up">
          <header className="px-4 py-3.5 border-b border-crema/8">
            <h3 className="font-display font-bold">RBAC aplicado en la API (y reflejado en la UI)</h3>
            <p className="text-xs text-crema/40 mt-0.5">Aunque la UI oculte botones, el store rechaza la acción con error 403 — probá cambiando de rol.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-cocoa-900/70">
                <tr>
                  <th className={thCls}>Permiso / acción</th>
                  {ROLES.map((r) => (
                    <th key={r} className={cx(thCls, "text-center")}>
                      <Chip className={ROLE_META[r].chip}>{ROLE_META[r].label}</Chip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PERM_LABELS) as PermKey[]).map((k) => (
                  <tr key={k} className="hover:bg-crema/4 transition-colors">
                    <td className={cx(tdCls, "font-semibold text-sm")}>{PERM_LABELS[k]}</td>
                    {ROLES.map((r) => (
                      <td key={r} className={cx(tdCls, "text-center")}>
                        {PERMS[k].includes(r) ? (
                          <span className="inline-flex text-pistacho"><I n="check" className="w-4 h-4" /></span>
                        ) : (
                          <span className="inline-flex text-crema/20"><I n="x" className="w-4 h-4" /></span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ajustes" && (
        <div className="grid md:grid-cols-2 gap-4 anim-fade-up">
          <div className="card p-5">
            <p className="eyebrow">Producción</p>
            <h3 className="font-display text-lg font-bold mb-4">Capacidad diaria</h3>
            <Field label="Unidades máximas por día" hint="Se valida al crear reservas (CAPACITY_EXCEEDED).">
              <input className={cx(inputCls, "w-28")} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
            </Field>
            <div className="mt-4">
              <Field label="Nombre del local">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <Btn
              variant="primary"
              icon="check"
              className="mt-5"
              onClick={() => {
                const n = parseInt(cap, 10);
                saveSettings({ max_capacity: isFinite(n) && n > 0 ? n : settings.max_capacity, store_name: name.trim() || settings.store_name });
              }}
            >
              Guardar ajustes
            </Btn>
          </div>
          <div className="card p-5 border-fresa/20">
            <p className="eyebrow text-fresa/70">Zona de riesgo</p>
            <h3 className="font-display text-lg font-bold mb-2">Datos de la demo</h3>
            <p className="text-sm text-crema/55 leading-relaxed">
              Todo el estado vive en <code className="font-mono text-caramelo">localStorage</code> y se re-siembra cada día con fechas relativas a hoy.
              Podés forzar el restablecimiento ahora.
            </p>
            <Btn variant="danger" icon="trash" className="mt-4" onClick={() => setConfirmReset(true)}>
              Restablecer datos demo
            </Btn>
            <div className="mt-5 pt-4 border-t border-crema/8 space-y-1.5 text-xs text-crema/40">
              <p className="flex items-center gap-2"><I n="check" className="w-3.5 h-3.5 text-pistacho" /> Transacciones de stock en una sola mutación atómica</p>
              <p className="flex items-center gap-2"><I n="check" className="w-3.5 h-3.5 text-pistacho" /> OrderLog en cada cambio de estado</p>
              <p className="flex items-center gap-2"><I n="check" className="w-3.5 h-3.5 text-pistacho" /> Cancelación libera cupo y (opcional) repone insumos</p>
            </div>
          </div>
        </div>
      )}

      {confirmReset && (
        <Modal open onClose={() => setConfirmReset(false)} sub="Confirmar" title="¿Restablecer toda la demo?" w="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-crema/60">Se perderán los cambios locales y se regenerará el escenario inicial (pedidos de hoy, stock, caja).</p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmReset(false)}>Volver</Btn>
              <Btn variant="danger" icon="trash" onClick={() => { setConfirmReset(false); resetDemo(); }}>Sí, restablecer</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
