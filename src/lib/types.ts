/* ============================================================
   TORTAS DEMO ERP — Tipos y contratos (espejo del schema Prisma)
   Dinero: SIEMPRE en centavos (enteros). Cantidades: unidad base
   (g / ml / un) para evitar floats.
   ============================================================ */

export type Role = "admin" | "vendedor" | "cocinero" | "repartidor";
export type Unit = "kg" | "g" | "l" | "ml" | "un";
export type BaseUnit = "g" | "ml" | "un";
export type ProductCategory = "torta" | "postre" | "insumo" | "bebida";

export type OrderStatus =
  | "pendiente"
  | "confirmado_con_sena"
  | "en_preparacion"
  | "listo_para_retiro"
  | "en_camino"
  | "entregado"
  | "cancelado";

export type DeliveryStatus = "pendiente" | "asignado" | "en_camino" | "entregado" | "fallido";
export type PayMethod = "efectivo" | "transferencia" | "tarjeta_credito" | "tarjeta_debito" | "qr";
export type TxType = "ingreso" | "egreso";
export type OrderType = "reserva_futura" | "pedido_inmediato";

export type View =
  | "dashboard"
  | "pedidos"
  | "reservas"
  | "clientes"
  | "productos"
  | "inventario"
  | "caja"
  | "reparto"
  | "auditoria";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  loyalty_points: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  sale_price: number; // centavos
  cost_price: number; // centavos
  is_active: boolean;
}

export interface InventoryItem {
  product_id: string;
  qty: number; // en unidad base
  base_unit: BaseUnit;
  min_qty: number; // en unidad base
}

export interface RecipeRow {
  id: string;
  finished_product_id: string;
  ingredient_id: string;
  qty: number; // expresado en `unit`
  unit: Unit;
}

export interface OrderItemCustom {
  texto?: string;
  color?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  customizations?: OrderItemCustom;
}

export interface Order {
  id: string;
  code: string;
  client_id: string;
  user_id: string;
  order_type: OrderType;
  status: OrderStatus;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:MM
  subtotal: number;
  discount: number;
  total_amount: number;
  advance_payment: number;
  balance_due: number;
  internal_notes?: string;
  client_notes?: string;
  created_at: number;
  items: OrderItem[];
}

export interface Delivery {
  id: string;
  order_id: string;
  driver_id?: string;
  delivery_address: string;
  status: DeliveryStatus;
  proof_note?: string;
  delivered_at?: number;
}

export interface CashTx {
  id: string;
  type: TxType;
  amount: number;
  payment_method: PayMethod;
  category: string;
  description: string;
  order_id?: string;
  user_id: string;
  created_at: number;
}

export interface OrderLog {
  id: string;
  order_id: string;
  user_id: string;
  old_status: OrderStatus;
  new_status: OrderStatus;
  note?: string;
  created_at: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  detail: string;
  ip: string;
  created_at: number;
}

export interface AppNotification {
  id: string;
  channel: "whatsapp" | "sistema";
  title: string;
  body: string;
  read: boolean;
  created_at: number;
}

export interface Slot {
  date: string;
  max_capacity: number;
  booked_count: number;
}

export interface Settings {
  store_name: string;
  max_capacity: number;
  currency: string;
}

export interface ToastMsg {
  id: string;
  kind: "ok" | "error" | "info";
  msg: string;
}

/* ------------------- metadatos de UI ------------------- */

export const STATUS_META: Record<
  OrderStatus,
  { label: string; chip: string; dot: string; text: string }
> = {
  pendiente: {
    label: "Pendiente",
    chip: "bg-crema/10 text-crema/80 border-crema/20",
    dot: "bg-crema/60",
    text: "text-crema/80",
  },
  confirmado_con_sena: {
    label: "Confirmado",
    chip: "bg-caramelo/15 text-caramelo border-caramelo/30",
    dot: "bg-caramelo",
    text: "text-caramelo",
  },
  en_preparacion: {
    label: "En preparación",
    chip: "bg-fresa/15 text-fresa border-fresa/30",
    dot: "bg-fresa",
    text: "text-fresa",
  },
  listo_para_retiro: {
    label: "Listo p/ retiro",
    chip: "bg-pistacho/15 text-pistacho border-pistacho/30",
    dot: "bg-pistacho",
    text: "text-pistacho",
  },
  en_camino: {
    label: "En camino",
    chip: "bg-arandano/15 text-arandano border-arandano/30",
    dot: "bg-arandano",
    text: "text-arandano",
  },
  entregado: {
    label: "Entregado",
    chip: "bg-pistacho/10 text-pistacho/80 border-pistacho/20",
    dot: "bg-pistacho/70",
    text: "text-pistacho/80",
  },
  cancelado: {
    label: "Cancelado",
    chip: "bg-fresa/8 text-crema/45 border-crema/15",
    dot: "bg-crema/30",
    text: "text-crema/45",
  },
};

export const KANBAN_COLS: OrderStatus[] = [
  "pendiente",
  "confirmado_con_sena",
  "en_preparacion",
  "listo_para_retiro",
  "en_camino",
  "entregado",
];

export const ROLE_META: Record<Role, { label: string; chip: string }> = {
  admin: { label: "Admin", chip: "bg-fresa/15 text-fresa border-fresa/30" },
  vendedor: { label: "Vendedor", chip: "bg-caramelo/15 text-caramelo border-caramelo/30" },
  cocinero: { label: "Cocinero", chip: "bg-pistacho/15 text-pistacho border-pistacho/30" },
  repartidor: { label: "Repartidor", chip: "bg-arandano/15 text-arandano border-arandano/30" },
};

export const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "qr", label: "QR / Billetera" },
  { value: "tarjeta_debito", label: "Tarjeta débito" },
  { value: "tarjeta_credito", label: "Tarjeta crédito" },
];

export const CAT_META: Record<ProductCategory, { label: string; plural: string }> = {
  torta: { label: "Torta", plural: "Tortas" },
  postre: { label: "Postre", plural: "Postres" },
  insumo: { label: "Insumo", plural: "Insumos" },
  bebida: { label: "Bebida", plural: "Bebidas" },
};

/* ------------------- RBAC (matriz de la Sección 7) ------------------- */

export type PermKey =
  | "create_order"
  | "confirm_order"
  | "to_prep"
  | "to_ready"
  | "to_route"
  | "deliver"
  | "cancel_order"
  | "cash_in"
  | "cash_out"
  | "see_reports"
  | "adjust_stock"
  | "stock_purchase"
  | "manage_products"
  | "manage_clients"
  | "assign_driver"
  | "see_audit";

export const PERMS: Record<PermKey, Role[]> = {
  create_order: ["admin", "vendedor"],
  confirm_order: ["admin", "vendedor"],
  to_prep: ["admin", "cocinero"],
  to_ready: ["admin", "cocinero"],
  to_route: ["admin", "repartidor"],
  deliver: ["admin", "repartidor"],
  cancel_order: ["admin", "vendedor"],
  cash_in: ["admin", "vendedor"],
  cash_out: ["admin"],
  see_reports: ["admin"],
  adjust_stock: ["admin", "cocinero"],
  stock_purchase: ["admin"],
  manage_products: ["admin"],
  manage_clients: ["admin", "vendedor"],
  assign_driver: ["admin"],
  see_audit: ["admin"],
};

export const can = (role: Role | undefined, perm: PermKey): boolean =>
  !!role && PERMS[perm].includes(role);

/* transiciones válidas de la máquina de estados */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ["confirmado_con_sena", "cancelado"],
  confirmado_con_sena: ["en_preparacion", "cancelado"],
  en_preparacion: ["listo_para_retiro", "cancelado"],
  listo_para_retiro: ["en_camino", "entregado", "cancelado"],
  en_camino: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};
