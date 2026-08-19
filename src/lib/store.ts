import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed } from "./seed";
import type { DB } from "./seed";
import { can, STATUS_META, TRANSITIONS } from "./types";
import type {
  AppNotification,
  AuditLog,
  CashTx,
  Client,
  Order,
  OrderItem,
  OrderStatus,
  PayMethod,
  Product,
  RecipeRow,
  Settings,
  Slot,
  ToastMsg,
  TxType,
  Unit,
  View,
} from "./types";
import { convertToBase, fmtQty, todayISO, uid } from "./format";

export type Result = { ok: true; code?: string } | { ok: false; error: string };

interface NewOrderInput {
  clientId: string;
  date: string;
  time: string;
  type: Order["order_type"];
  items: { productId: string; qty: number; custom?: OrderItem["customizations"] }[];
  discount: number;
  advance: number;
  method: PayMethod;
  clientNotes?: string;
  internalNotes?: string;
}

interface AppState extends DB {
  view: View;
  currentUserId: string | null;
  selectedOrderId: string | null;
  orderModal: { open: boolean; clientId?: string };
  toasts: ToastMsg[];

  toast: (kind: ToastMsg["kind"], msg: string) => void;
  setView: (v: View) => void;
  login: (userId: string) => void;
  logout: () => void;
  openOrder: (id: string | null) => void;
  openNewOrder: (clientId?: string) => void;
  closeNewOrder: () => void;
  markNotifsRead: () => void;
  resetDemo: () => void;
  saveSettings: (p: Partial<Settings>) => void;

  createOrder: (input: NewOrderInput) => Result;
  registerAdvance: (orderId: string, cents: number, method: PayMethod) => Result;
  transition: (orderId: string, next: OrderStatus) => Result;
  completeOrder: (orderId: string, method: PayMethod | null) => Result;
  cancelOrder: (orderId: string, revertStock: boolean) => Result;

  createDelivery: (orderId: string, address: string) => Result;
  assignDriver: (deliveryId: string, driverId: string) => Result;
  startDelivery: (deliveryId: string) => Result;
  finishDelivery: (deliveryId: string, method: PayMethod | null, note: string) => Result;

  adjustInventory: (productId: string, kind: "compra" | "merma", qtyBase: number, reason: string) => Result;
  saveProduct: (p: Product) => Result;
  toggleProduct: (id: string) => void;
  saveRecipe: (productId: string, rows: { ingredientId: string; qty: number; unit: Unit }[]) => Result;
  saveClient: (c: Client) => Result;
  deleteClient: (id: string) => Result;
  addTransaction: (tx: {
    type: TxType;
    amount: number;
    method: PayMethod;
    category: string;
    description: string;
    orderId?: string;
  }) => Result;
}

/* ---------------- helpers puros ---------------- */

const now = () => Date.now();

function computeNeeds(items: OrderItem[], recipes: RecipeRow[]): Map<string, number> {
  const needs = new Map<string, number>();
  for (const it of items) {
    for (const r of recipes.filter((r) => r.finished_product_id === it.product_id)) {
      const base = convertToBase(r.qty, r.unit) * it.quantity;
      needs.set(r.ingredient_id, (needs.get(r.ingredient_id) ?? 0) + base);
    }
  }
  return needs;
}

function shortages(needs: Map<string, number>, inv: DB["inventory"], products: Product[]) {
  const out: { name: string; need: number; have: number; unit: "g" | "ml" | "un" }[] = [];
  for (const [pid, need] of needs) {
    const stock = inv.find((i) => i.product_id === pid);
    const prod = products.find((p) => p.id === pid);
    if (!stock || !prod) continue;
    if (stock.qty < need) out.push({ name: prod.name, need, have: stock.qty, unit: stock.base_unit });
  }
  return out;
}

function applyDelta(inv: DB["inventory"], needs: Map<string, number>, sign: 1 | -1): DB["inventory"] {
  return inv.map((i) =>
    needs.has(i.product_id) ? { ...i, qty: Math.max(0, i.qty + sign * needs.get(i.product_id)!) } : i
  );
}

function lowStockNotifs(oldInv: DB["inventory"], newInv: DB["inventory"], products: Product[]): AppNotification[] {
  const out: AppNotification[] = [];
  for (const ni of newInv) {
    const oi = oldInv.find((o) => o.product_id === ni.product_id);
    if (oi && oi.qty > oi.min_qty && ni.qty <= ni.min_qty) {
      const name = products.find((p) => p.id === ni.product_id)?.name ?? ni.product_id;
      out.push({
        id: uid(), channel: "sistema", read: false, created_at: now(),
        title: "Stock bajo detectado",
        body: `${name}: quedan ${fmtQty(ni.qty, ni.base_unit)} (mínimo ${fmtQty(ni.min_qty, ni.base_unit)}).`,
      });
    }
  }
  return out;
}

function upsertSlot(slots: Slot[], date: string, delta: number, maxCap: number): Slot[] {
  const found = slots.find((s) => s.date === date);
  if (found)
    return slots.map((s) =>
      s.date === date ? { ...s, booked_count: Math.max(0, s.booked_count + delta) } : s
    );
  return [...slots, { date, max_capacity: maxCap, booked_count: Math.max(0, delta) }];
}

const nextCode = (orders: Order[]) => {
  const maxN = orders.reduce((m, o) => Math.max(m, parseInt(o.code.replace("PD-", ""), 10) || 1000), 1030);
  return `PD-${maxN + 1}`;
};

const wa = (title: string, body: string): AppNotification => ({
  id: uid(), channel: "whatsapp", title, body, read: false, created_at: now(),
});
const sys = (title: string, body: string): AppNotification => ({
  id: uid(), channel: "sistema", title, body, read: false, created_at: now(),
});

const audit = (userId: string | null, action: string, entity: string, entityId: string | undefined, detail: string): AuditLog => ({
  id: uid(), user_id: userId ?? undefined, action, entity, entity_id: entityId, detail, ip: "190.245.12.8", created_at: now(),
});

/* ---------------- store ---------------- */

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      view: "dashboard",
      currentUserId: null,
      selectedOrderId: null,
      orderModal: { open: false },
      toasts: [],

      toast: (kind, msg) => {
        const id = uid();
        set((s) => ({ toasts: [...s.toasts, { id, kind, msg }] }));
        window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4600);
      },

      setView: (v) => {
        const me = get().users.find((u) => u.id === get().currentUserId);
        if (v === "auditoria" && !can(me?.role, "see_audit")) {
          get().toast("error", "Acceso denegado: Auditoría requiere rol Admin (403).");
          return;
        }
        set({ view: v, selectedOrderId: null });
      },

      login: (userId) => {
        set((s) => ({
          currentUserId: userId,
          view: "dashboard",
          auditLogs: [audit(userId, "LOGIN", "User", userId, "Inicio de sesión exitoso"), ...s.auditLogs],
        }));
        const u = get().users.find((x) => x.id === userId);
        if (u) get().toast("ok", `Turno abierto. ¡Hola, ${u.full_name.split(" ")[0]}!`);
      },

      logout: () => set({ currentUserId: null, selectedOrderId: null, orderModal: { open: false } }),

      openOrder: (id) => set({ selectedOrderId: id }),
      openNewOrder: (clientId) => set({ orderModal: { open: true, clientId } }),
      closeNewOrder: () => set({ orderModal: { open: false } }),
      markNotifsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      resetDemo: () => {
        set({ ...buildSeed(), view: "dashboard", selectedOrderId: null, orderModal: { open: false }, toasts: [] });
        get().toast("info", "Datos demo restablecidos al estado inicial.");
      },
      saveSettings: (p) => {
        set((s) => ({
          settings: { ...s.settings, ...p },
          auditLogs: [audit(s.currentUserId, "SETTINGS_CHANGED", "Settings", undefined, JSON.stringify(p)), ...s.auditLogs],
        }));
        get().toast("ok", "Ajustes guardados.");
      },

      /* ============ PEDIDOS ============ */

      createOrder: (input) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "create_order")) return { ok: false, error: "Tu rol no permite crear pedidos (403)." };
        if (!input.clientId) return { ok: false, error: "Seleccioná un cliente." };
        if (!input.items.length) return { ok: false, error: "Agregá al menos un producto." };
        if (!input.date) return { ok: false, error: "Elegí la fecha de entrega / retiro." };
        if (input.date < todayISO()) return { ok: false, error: "La fecha programada no puede estar en el pasado." };
        if (!input.time) return { ok: false, error: "Elegí una franja horaria." };

        const units = input.items.reduce((a, i) => a + i.qty, 0);
        const slot = s.slots.find((sl) => sl.date === input.date) ?? {
          date: input.date, max_capacity: s.settings.max_capacity, booked_count: 0,
        };
        if (slot.booked_count + units > slot.max_capacity)
          return {
            ok: false,
            error: `CAPACITY_EXCEEDED: capacidad ${slot.max_capacity} un., ocupado ${slot.booked_count}, tu pedido suma ${units}. Sugerí otra fecha al cliente.`,
          };

        const items: OrderItem[] = [];
        for (const i of input.items) {
          const p = s.products.find((x) => x.id === i.productId);
          if (!p) return { ok: false, error: "Producto no encontrado." };
          items.push({ id: uid(), product_id: p.id, quantity: i.qty, unit_price: p.sale_price, subtotal: p.sale_price * i.qty, customizations: i.custom });
        }
        const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
        const total = Math.max(0, subtotal - input.discount);
        if (input.advance > total) return { ok: false, error: "La seña no puede superar el total del pedido." };

        const status: OrderStatus = input.advance > 0 ? "confirmado_con_sena" : "pendiente";
        let inv = s.inventory;
        if (input.advance > 0) {
          const needs = computeNeeds(items, s.recipes);
          const short = shortages(needs, inv, s.products);
          if (short.length)
            return {
              ok: false,
              error: "STOCK_INSUFFICIENT: " + short.map((x) => `${x.name} (necesitás ${fmtQty(x.need, x.unit)}, hay ${fmtQty(x.have, x.unit)})`).join(" · "),
            };
          inv = applyDelta(inv, needs, -1);
        }

        const code = nextCode(s.orders);
        const order: Order = {
          id: uid(), code, client_id: input.clientId, user_id: me.id, order_type: input.type, status,
          scheduled_date: input.date, scheduled_time: input.time, subtotal, discount: input.discount,
          total_amount: total, advance_payment: input.advance, balance_due: total - input.advance,
          client_notes: input.clientNotes, internal_notes: input.internalNotes, created_at: now(), items,
        };
        const client = s.clients.find((c) => c.id === input.clientId);
        const txs: CashTx[] = input.advance > 0
          ? [{ id: uid(), type: "ingreso", amount: input.advance, payment_method: input.method, category: "Seña", description: `Seña ${code} · ${client?.full_name ?? ""}`, order_id: order.id, user_id: me.id, created_at: now() }]
          : [];
        const notifs: AppNotification[] = [
          sys(`Pedido ${code} creado`, `${client?.full_name} · ${units} un. para el ${input.date} ${input.time}.`),
        ];
        if (input.advance > 0)
          notifs.unshift(wa(`Seña recibida · ${code}`, `WhatsApp enviado a ${client?.full_name}: “Reserva confirmada. Saldo pendiente: $ ${Math.round(order.balance_due / 100)}”`));

        set({
          orders: [order, ...s.orders],
          inventory: inv,
          slots: upsertSlot(s.slots, input.date, units, s.settings.max_capacity),
          transactions: [...txs, ...s.transactions],
          orderLogs: [{ id: uid(), order_id: order.id, user_id: me.id, old_status: "pendiente", new_status: status, note: input.advance > 0 ? "Creado y confirmado con seña" : "Pedido creado", created_at: now() }, ...s.orderLogs],
          notifications: [...lowStockNotifs(s.inventory, inv, s.products), ...notifs, ...s.notifications].slice(0, 40),
          auditLogs: [audit(me.id, "ORDER_CREATED", "Order", order.id, `${code} · total $ ${Math.round(total / 100)} · seña $ ${Math.round(input.advance / 100)}`), ...s.auditLogs],
        });
        return { ok: true, code };
      },

      registerAdvance: (orderId, cents, method) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "confirm_order")) return { ok: false, error: "Tu rol no permite confirmar pedidos (403)." };
        const order = s.orders.find((o) => o.id === orderId);
        if (!order) return { ok: false, error: "Pedido no encontrado." };
        if (order.status !== "pendiente") return { ok: false, error: "Solo los pedidos pendientes se confirman con seña." };
        if (cents <= 0) return { ok: false, error: "Ingresá un monto de seña mayor a cero." };
        if (cents > order.balance_due) return { ok: false, error: "La seña supera el saldo del pedido." };

        const needs = computeNeeds(order.items, s.recipes);
        const short = shortages(needs, s.inventory, s.products);
        if (short.length)
          return {
            ok: false,
            error: "STOCK_INSUFFICIENT: " + short.map((x) => `${x.name} (necesitás ${fmtQty(x.need, x.unit)}, hay ${fmtQty(x.have, x.unit)})`).join(" · "),
          };
        const inv = applyDelta(s.inventory, needs, -1);
        const client = s.clients.find((c) => c.id === order.client_id);
        set({
          inventory: inv,
          orders: s.orders.map((o) => o.id === orderId ? { ...o, status: "confirmado_con_sena", advance_payment: o.advance_payment + cents, balance_due: o.balance_due - cents } : o),
          transactions: [{ id: uid(), type: "ingreso", amount: cents, payment_method: method, category: "Seña", description: `Seña ${order.code} · ${client?.full_name ?? ""}`, order_id: order.id, user_id: me.id, created_at: now() }, ...s.transactions],
          orderLogs: [{ id: uid(), order_id: orderId, user_id: me.id, old_status: "pendiente", new_status: "confirmado_con_sena", note: `Seña $ ${Math.round(cents / 100)} · insumos descontados`, created_at: now() }, ...s.orderLogs],
          notifications: [wa(`Seña recibida · ${order.code}`, `WhatsApp enviado a ${client?.full_name}: reserva confirmada.`), ...lowStockNotifs(s.inventory, inv, s.products), ...s.notifications].slice(0, 40),
        });
        return { ok: true };
      },

      transition: (orderId, next) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        const order = s.orders.find((o) => o.id === orderId);
        if (!order) return { ok: false, error: "Pedido no encontrado." };
        if (order.status === next) return { ok: false, error: "El pedido ya está en ese estado." };
        if (!TRANSITIONS[order.status].includes(next))
          return { ok: false, error: `Transición inválida: ${STATUS_META[order.status].label} → ${STATUS_META[next].label}.` };
        if (next === "confirmado_con_sena") return { ok: false, error: "Para confirmar, registrá una seña primero." };
        if (next === "entregado") return { ok: false, error: "Usá la acción «Cobrar y entregar»." };
        if (next === "cancelado") return { ok: false, error: "Usá la acción «Cancelar pedido»." };

        const perm = next === "en_preparacion" ? "to_prep" : next === "listo_para_retiro" ? "to_ready" : "to_route";
        if (!can(me.role, perm))
          return { ok: false, error: `Tu rol (${me.role}) no puede mover a «${STATUS_META[next].label}» (403).` };

        let deliveries = s.deliveries;
        if (next === "en_camino") {
          const dv = deliveries.find((d) => d.order_id === orderId);
          if (!dv) return { ok: false, error: "Primero asigná un reparto a este pedido." };
          if (!dv.driver_id) return { ok: false, error: "Asigná un repartidor antes de iniciar la entrega." };
          deliveries = deliveries.map((d) => (d.id === dv.id ? { ...d, status: "en_camino" } : d));
        }

        const client = s.clients.find((c) => c.id === order.client_id);
        const notifs: AppNotification[] = [];
        if (next === "listo_para_retiro")
          notifs.push(wa(`Pedido listo · ${order.code}`, `WhatsApp enviado a ${client?.full_name}: “¡Tu pedido está listo para retirar!”`));
        if (next === "en_camino")
          notifs.push(wa(`Pedido en camino · ${order.code}`, `WhatsApp enviado a ${client?.full_name}: “Tu pedido ya va en camino 🛵”`));

        set({
          deliveries,
          orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: next } : o)),
          orderLogs: [{ id: uid(), order_id: orderId, user_id: me.id, old_status: order.status, new_status: next, created_at: now() }, ...s.orderLogs],
          notifications: [...notifs, ...s.notifications].slice(0, 40),
        });
        return { ok: true };
      },

      completeOrder: (orderId, method) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "deliver") && !can(me.role, "cash_in"))
          return { ok: false, error: "Tu rol no permite entregar pedidos (403)." };
        const order = s.orders.find((o) => o.id === orderId);
        if (!order) return { ok: false, error: "Pedido no encontrado." };
        if (order.status === "entregado" || order.status === "cancelado")
          return { ok: false, error: "Este pedido ya está cerrado." };
        if (order.balance_due > 0 && !method) return { ok: false, error: "SALDO_PENDIENTE: falta cobrar el saldo." };

        const client = s.clients.find((c) => c.id === order.client_id);
        const points = Math.floor(order.total_amount / 100_000);
        const txs: CashTx[] = order.balance_due > 0 && method
          ? [{ id: uid(), type: "ingreso", amount: order.balance_due, payment_method: method, category: "Saldo", description: `Saldo ${order.code} · ${client?.full_name ?? ""}`, order_id: order.id, user_id: me.id, created_at: now() }]
          : [];
        set({
          transactions: [...txs, ...s.transactions],
          orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: "entregado", balance_due: 0 } : o)),
          deliveries: s.deliveries.map((d) => (d.order_id === orderId ? { ...d, status: "entregado", delivered_at: now() } : d)),
          clients: s.clients.map((c) => (c.id === order.client_id ? { ...c, loyalty_points: c.loyalty_points + points } : c)),
          orderLogs: [{ id: uid(), order_id: orderId, user_id: me.id, old_status: order.status, new_status: "entregado", note: order.balance_due > 0 ? `Saldo cobrado $ ${Math.round(order.balance_due / 100)}` : "Pagado en su totalidad", created_at: now() }, ...s.orderLogs],
          notifications: [wa(`Pedido entregado · ${order.code}`, `WhatsApp enviado a ${client?.full_name}: “¡Gracias por tu compra! Sumaste ${points} puntos.”`), ...s.notifications].slice(0, 40),
        });
        return { ok: true };
      },

      cancelOrder: (orderId, revertStock) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "cancel_order")) return { ok: false, error: "Tu rol no permite cancelar pedidos (403)." };
        const order = s.orders.find((o) => o.id === orderId);
        if (!order) return { ok: false, error: "Pedido no encontrado." };
        if (order.status === "entregado" || order.status === "cancelado")
          return { ok: false, error: "Este pedido ya está cerrado." };

        const hadStock = ["confirmado_con_sena", "en_preparacion", "listo_para_retiro", "en_camino"].includes(order.status);
        let inv = s.inventory;
        let notifs: AppNotification[] = [];
        if (hadStock && revertStock) {
          const needs = computeNeeds(order.items, s.recipes);
          inv = applyDelta(inv, needs, 1);
          notifs = [sys(`Stock repuesto · ${order.code}`, "Los insumos de la receta volvieron al inventario.")];
        }
        const units = order.items.reduce((a, i) => a + i.quantity, 0);
        set({
          inventory: inv,
          slots: upsertSlot(s.slots, order.scheduled_date, -units, s.settings.max_capacity),
          orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: "cancelado" } : o)),
          deliveries: s.deliveries.map((d) => (d.order_id === orderId && d.status !== "entregado" ? { ...d, status: "fallido" } : d)),
          orderLogs: [{ id: uid(), order_id: orderId, user_id: me.id, old_status: order.status, new_status: "cancelado", note: hadStock ? (revertStock ? "Cancelado con reposición de insumos" : "Cancelado sin reposición (pérdida de insumos)") : "Cancelado (sin efecto de stock)", created_at: now() }, ...s.orderLogs],
          notifications: [...notifs, ...s.notifications].slice(0, 40),
          auditLogs: [audit(me.id, "ORDER_CANCELLED", "Order", order.id, `${order.code} · reposición: ${revertStock && hadStock ? "sí" : "no"} · cupo liberado: ${units} un.`), ...s.auditLogs],
        });
        return { ok: true };
      },

      /* ============ REPARTO ============ */

      createDelivery: (orderId, address) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "create_order")) return { ok: false, error: "Tu rol no permite gestionar repartos (403)." };
        const order = s.orders.find((o) => o.id === orderId);
        if (!order) return { ok: false, error: "Pedido no encontrado." };
        if (s.deliveries.some((d) => d.order_id === orderId)) return { ok: false, error: "Este pedido ya tiene un reparto asignado." };
        if (!address.trim()) return { ok: false, error: "Ingresá la dirección de entrega." };
        set({
          deliveries: [...s.deliveries, { id: uid(), order_id: orderId, delivery_address: address.trim(), status: "pendiente" }],
          orderLogs: [{ id: uid(), order_id: orderId, user_id: me.id, old_status: order.status, new_status: order.status, note: "Reparto solicitado", created_at: now() }, ...s.orderLogs],
        });
        return { ok: true };
      },

      assignDriver: (deliveryId, driverId) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "assign_driver")) return { ok: false, error: "Solo Admin asigna repartidores (403)." };
        const dv = s.deliveries.find((d) => d.id === deliveryId);
        if (!dv) return { ok: false, error: "Entrega no encontrada." };
        if (dv.status === "entregado") return { ok: false, error: "Esta entrega ya finalizó." };
        set({
          deliveries: s.deliveries.map((d) => (d.id === deliveryId ? { ...d, driver_id: driverId, status: d.status === "pendiente" ? "asignado" : d.status } : d)),
        });
        return { ok: true };
      },

      startDelivery: (deliveryId) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "to_route")) return { ok: false, error: "Tu rol no puede iniciar entregas (403)." };
        const dv = s.deliveries.find((d) => d.id === deliveryId);
        if (!dv) return { ok: false, error: "Entrega no encontrada." };
        if (!dv.driver_id) return { ok: false, error: "Asigná un repartidor primero." };
        return get().transition(dv.order_id, "en_camino");
      },

      finishDelivery: (deliveryId, method, note) => {
        const s = get();
        const dv = s.deliveries.find((d) => d.id === deliveryId);
        if (!dv) return { ok: false, error: "Entrega no encontrada." };
        const res = get().completeOrder(dv.order_id, method);
        if (!res.ok) return res;
        set((st) => ({
          deliveries: st.deliveries.map((d) => (d.id === deliveryId ? { ...d, proof_note: note || "Comprobante registrado" } : d)),
        }));
        return { ok: true };
      },

      /* ============ INVENTARIO / PRODUCTOS ============ */

      adjustInventory: (productId, kind, qtyBase, reason) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "adjust_stock")) return { ok: false, error: "Tu rol no permite ajustar inventario (403)." };
        if (kind === "compra" && !can(me.role, "stock_purchase"))
          return { ok: false, error: "El rol Cocinero solo puede registrar mermas (403)." };
        if (qtyBase <= 0) return { ok: false, error: "La cantidad debe ser mayor a cero." };
        const stock = s.inventory.find((i) => i.product_id === productId);
        const prod = s.products.find((p) => p.id === productId);
        if (!stock || !prod) return { ok: false, error: "Insumo no encontrado." };
        if (kind === "merma" && qtyBase > stock.qty)
          return { ok: false, error: `La merma supera el stock actual (${fmtQty(stock.qty, stock.base_unit)}).` };

        const newQty = kind === "compra" ? stock.qty + qtyBase : stock.qty - qtyBase;
        const inv = s.inventory.map((i) => (i.product_id === productId ? { ...i, qty: newQty } : i));
        set({
          inventory: inv,
          notifications: [...lowStockNotifs(s.inventory, inv, s.products), ...s.notifications].slice(0, 40),
          auditLogs: [audit(me.id, "MANUAL_STOCK_ADJUSTMENT", "Inventory", productId, `${kind === "compra" ? "Compra +" : "Merma −"}${fmtQty(qtyBase, stock.base_unit)} ${prod.name} · motivo: ${reason || "—"}`), ...s.auditLogs],
        });
        return { ok: true };
      },

      saveProduct: (p) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "manage_products")) return { ok: false, error: "Solo Admin gestiona productos (403)." };
        if (!p.name.trim()) return { ok: false, error: "El nombre es obligatorio." };
        if (p.sale_price < 0 || p.cost_price < 0) return { ok: false, error: "Los precios no pueden ser negativos." };
        const prev = s.products.find((x) => x.id === p.id);
        const aud = prev && prev.sale_price !== p.sale_price
          ? [audit(me.id, "PRICE_CHANGE", "Product", p.id, `${p.name}: $ ${Math.round(prev.sale_price / 100)} → $ ${Math.round(p.sale_price / 100)}`)]
          : prev ? [] : [audit(me.id, "PRODUCT_CREATED", "Product", p.id, p.name)];
        const inv = !prev && p.category === "insumo"
          ? [...s.inventory, { product_id: p.id, qty: 0, base_unit: "g" as const, min_qty: 0 }]
          : s.inventory;
        set({
          products: prev ? s.products.map((x) => (x.id === p.id ? p : x)) : [...s.products, p],
          inventory: inv,
          auditLogs: [...aud, ...s.auditLogs],
        });
        return { ok: true };
      },

      toggleProduct: (id) => {
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)) }));
      },

      saveRecipe: (productId, rows) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "manage_products")) return { ok: false, error: "Solo Admin edita recetas (403)." };
        const prod = s.products.find((p) => p.id === productId);
        if (!prod) return { ok: false, error: "Producto no encontrado." };
        const seen = new Set<string>();
        const clean: RecipeRow[] = [];
        for (const r of rows) {
          const ing = s.products.find((p) => p.id === r.ingredientId);
          if (!ing || ing.category !== "insumo") return { ok: false, error: "Cada fila necesita un insumo válido." };
          if (r.qty <= 0) return { ok: false, error: `Cantidad inválida para ${ing.name}.` };
          if (seen.has(r.ingredientId)) return { ok: false, error: `${ing.name} está duplicado en la receta.` };
          const stock = s.inventory.find((i) => i.product_id === r.ingredientId);
          if (stock) {
            const compat = stock.base_unit === "g" ? ["g", "kg"] : stock.base_unit === "ml" ? ["ml", "l"] : ["un"];
            if (!compat.includes(r.unit))
              return { ok: false, error: `Unidad incompatible para ${ing.name} (usa ${compat.join(" o ")}).` };
          }
          seen.add(r.ingredientId);
          clean.push({ id: uid(), finished_product_id: productId, ingredient_id: r.ingredientId, qty: r.qty, unit: r.unit });
        }
        set({
          recipes: [...s.recipes.filter((r) => r.finished_product_id !== productId), ...clean],
          auditLogs: [audit(me.id, "RECIPE_UPDATED", "ProductRecipe", productId, `${prod.name}: receta con ${clean.length} insumos`), ...s.auditLogs],
        });
        return { ok: true };
      },

      saveClient: (c) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "manage_clients")) return { ok: false, error: "Tu rol no gestiona clientes (403)." };
        if (!c.full_name.trim()) return { ok: false, error: "El nombre es obligatorio." };
        if (!c.phone.trim()) return { ok: false, error: "El teléfono es obligatorio." };
        if (s.clients.some((x) => x.phone === c.phone && x.id !== c.id))
          return { ok: false, error: "Ya existe un cliente con ese teléfono (UNIQUE)." };
        const prev = s.clients.find((x) => x.id === c.id);
        set({ clients: prev ? s.clients.map((x) => (x.id === c.id ? c : x)) : [...s.clients, c] });
        return { ok: true };
      },

      deleteClient: (id) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (!can(me.role, "manage_clients")) return { ok: false, error: "Tu rol no gestiona clientes (403)." };
        if (s.orders.some((o) => o.client_id === id))
          return { ok: false, error: "No se puede eliminar: el cliente tiene pedidos asociados (FK)." };
        set({ clients: s.clients.filter((c) => c.id !== id) });
        return { ok: true };
      },

      addTransaction: (t) => {
        const s = get();
        const me = s.users.find((u) => u.id === s.currentUserId);
        if (!me) return { ok: false, error: "Sesión vencida." };
        if (t.type === "ingreso" && !can(me.role, "cash_in")) return { ok: false, error: "Tu rol no registra ingresos (403)." };
        if (t.type === "egreso" && !can(me.role, "cash_out")) return { ok: false, error: "Solo Admin registra egresos (403)." };
        if (t.amount <= 0) return { ok: false, error: "El monto debe ser mayor a cero." };
        set({
          transactions: [{ id: uid(), type: t.type, amount: t.amount, payment_method: t.method, category: t.category, description: t.description, order_id: t.orderId, user_id: me.id, created_at: now() }, ...s.transactions],
        });
        return { ok: true };
      },
    }),
    {
      name: "tortas-demo-erp-v2",
      version: 2,
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        if (p && p.seedDay === todayISO()) {
          return { ...current, ...p, toasts: [], selectedOrderId: null, orderModal: { open: false } };
        }
        return current;
      },
    }
  )
);
