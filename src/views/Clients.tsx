import { useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { can } from "../lib/types";
import type { Client } from "../lib/types";
import { uid } from "../lib/format";
import { I } from "../components/icons";
import { Btn, Chip, Empty, Field, Modal, cx, inputCls, taCls, tdCls, thCls } from "../components/ui";
import { useMe } from "../components/layout";

function ClientModal({ initial, onClose }: { initial: Client | null; onClose: () => void }) {
  const saveClient = useApp((s) => s.saveClient);
  const toast = useApp((s) => s.toast);
  const [f, setF] = useState<Client>(
    initial ?? { id: uid(), full_name: "", phone: "", email: "", address: "", notes: "", loyalty_points: 0 }
  );
  const set = (k: keyof Client, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Modal open onClose={onClose} sub="CRM" title={initial ? `Editar a ${initial.full_name}` : "Nuevo cliente"} w="max-w-md">
      <div className="space-y-4">
        <Field label="Nombre completo *">
          <input className={inputCls} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Ana Beltrán" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono * (único)">
            <input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+54 9 11 …" />
          </Field>
          <Field label="Email">
            <input className={inputCls} value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="ana@mail.com" />
          </Field>
        </div>
        <Field label="Dirección">
          <input className={inputCls} value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Calle, número, localidad" />
        </Field>
        <Field label="Notas" hint="Alergias, preferencias de contacto, etc.">
          <textarea className={taCls} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Ej: alergia a nueces, prefiere WhatsApp" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="primary"
            icon="check"
            onClick={() => {
              const res = saveClient({ ...f, email: f.email || undefined, address: f.address || undefined, notes: f.notes || undefined });
              if (res.ok) {
                toast("ok", initial ? "Cliente actualizado." : `Cliente ${f.full_name} creado.`);
                onClose();
              } else toast("error", res.error);
            }}
          >
            Guardar
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function Clients() {
  const clients = useApp((s) => s.clients);
  const orders = useApp((s) => s.orders);
  const deleteClient = useApp((s) => s.deleteClient);
  const openNewOrder = useApp((s) => s.openNewOrder);
  const toast = useApp((s) => s.toast);
  const me = useMe();
  const manage = can(me?.role, "manage_clients");

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Client | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return clients
      .filter((c) => !s || c.full_name.toLowerCase().includes(s) || c.phone.includes(s))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [clients, q]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <I n="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-crema/35" />
          <input className={cx(inputCls, "pl-10")} placeholder="Buscar por nombre o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Chip className="bg-crema/8 text-crema/60 border-crema/15">{clients.length} clientes</Chip>
        <div className="flex-1" />
        {manage && (
          <Btn variant="primary" icon="plus" onClick={() => setCreating(true)}>Nuevo cliente</Btn>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-cocoa-900/70">
              <tr>
                <th className={thCls}>Cliente</th>
                <th className={thCls}>Contacto</th>
                <th className={thCls}>Notas</th>
                <th className={cx(thCls, "text-center")}>Pedidos</th>
                <th className={cx(thCls, "text-center")}>Puntos</th>
                <th className={cx(thCls, "text-right")}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const nOrders = orders.filter((o) => o.client_id === c.id).length;
                return (
                  <tr key={c.id} className="hover:bg-crema/4 transition-colors group">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-caramelo/12 border border-caramelo/25 text-caramelo flex items-center justify-center font-display font-bold text-xs shrink-0">
                          {c.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </div>
                        <p className="font-bold">{c.full_name}</p>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <p className="text-crema/70 text-sm flex items-center gap-1.5"><I n="phone" className="w-3.5 h-3.5 text-pistacho/70" />{c.phone}</p>
                      {c.address && <p className="text-xs text-crema/40 mt-0.5 flex items-center gap-1.5"><I n="pin" className="w-3.5 h-3.5" />{c.address}</p>}
                    </td>
                    <td className={cx(tdCls, "max-w-[220px]")}>
                      {c.notes ? <p className="text-xs text-arandano/85 truncate" title={c.notes}>📌 {c.notes}</p> : <span className="text-crema/20 text-xs">—</span>}
                    </td>
                    <td className={cx(tdCls, "text-center")}>
                      <Chip className="bg-crema/8 text-crema/70 border-crema/12 font-mono">{nOrders}</Chip>
                    </td>
                    <td className={cx(tdCls, "text-center")}>
                      <span className="inline-flex items-center gap-1 text-caramelo font-bold text-sm"><I n="star" className="w-3.5 h-3.5" />{c.loyalty_points}</span>
                    </td>
                    <td className={cx(tdCls, "text-right")}>
                      <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Btn small variant="soft" icon="plus" onClick={() => openNewOrder(c.id)}>Pedido</Btn>
                        {manage && (
                          <>
                            <Btn small variant="ghost" icon="edit" onClick={() => setEditing(c)} aria-label="Editar" />
                            <Btn small variant="ghost" icon="trash" onClick={() => setConfirmDel(c)} aria-label="Eliminar" className="hover:text-fresa" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <Empty icon="users" title="Sin resultados" body={`Ningún cliente coincide con “${q}”.`} />}
      </div>

      {(creating || editing) && <ClientModal initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />}

      {confirmDel && (
        <Modal open onClose={() => setConfirmDel(null)} sub="Confirmar" title={`¿Eliminar a ${confirmDel.full_name}?`} w="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-crema/60">Si tiene pedidos asociados, el sistema rechazará la eliminación (integridad referencial).</p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmDel(null)}>Volver</Btn>
              <Btn
                variant="danger"
                icon="trash"
                onClick={() => {
                  const res = deleteClient(confirmDel.id);
                  if (res.ok) toast("ok", "Cliente eliminado.");
                  else toast("error", res.error);
                  setConfirmDel(null);
                }}
              >
                Eliminar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
