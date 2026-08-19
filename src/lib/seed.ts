import type {
  AuditLog,
  AppNotification,
  CashTx,
  Client,
  Delivery,
  InventoryItem,
  Order,
  OrderItem,
  OrderLog,
  OrderStatus,
  Product,
  RecipeRow,
  Settings,
  Slot,
  User,
} from "./types";
import { addDaysISO, todayISO } from "./format";

export interface DB {
  seedDay: string;
  settings: Settings;
  users: User[];
  clients: Client[];
  products: Product[];
  inventory: InventoryItem[];
  recipes: RecipeRow[];
  slots: Slot[];
  orders: Order[];
  deliveries: Delivery[];
  transactions: CashTx[];
  orderLogs: OrderLog[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
}

const NOW = Date.now();
const MIN = 60_000;
const H = 60 * MIN;
const d = (n: number) => addDaysISO(todayISO(), n);

const item = (
  id: string,
  product_id: string,
  quantity: number,
  unit_price: number,
  customizations?: OrderItem["customizations"]
): OrderItem => ({
  id,
  product_id,
  quantity,
  unit_price,
  subtotal: unit_price * quantity,
  customizations,
});

function mkOrder(o: {
  id: string;
  n: number;
  client_id: string;
  user_id?: string;
  type?: Order["order_type"];
  status: OrderStatus;
  day: number;
  time: string;
  advance: number;
  items: OrderItem[];
  discount?: number;
  client_notes?: string;
  internal_notes?: string;
  createdAgoMin: number;
}): Order {
  const subtotal = o.items.reduce((s, i) => s + i.subtotal, 0);
  const discount = o.discount ?? 0;
  const total = subtotal - discount;
  return {
    id: o.id,
    code: `PD-${o.n}`,
    client_id: o.client_id,
    user_id: o.user_id ?? "u-vend",
    order_type: o.type ?? "reserva_futura",
    status: o.status,
    scheduled_date: d(o.day),
    scheduled_time: o.time,
    subtotal,
    discount,
    total_amount: total,
    advance_payment: o.advance,
    balance_due: total - o.advance,
    client_notes: o.client_notes,
    internal_notes: o.internal_notes,
    created_at: NOW - o.createdAgoMin * MIN,
    items: o.items,
  };
}

function chainLogs(orderId: string, userId: string, chain: OrderStatus[], startAgoMin: number): OrderLog[] {
  const out: OrderLog[] = [];
  chain.forEach((st, i) => {
    out.push({
      id: `lg-${orderId}-${i}`,
      order_id: orderId,
      user_id: i === 0 ? "u-vend" : userId,
      old_status: i === 0 ? "pendiente" : chain[i - 1],
      new_status: st,
      note: i === 0 ? "Pedido creado" : undefined,
      created_at: NOW - (startAgoMin - i * 37) * MIN,
    });
  });
  return out;
}

export function buildSeed(): DB {
  const users: User[] = [
    { id: "u-admin", full_name: "Valentina Ríos", email: "valen@tortasdemo.ar", role: "admin", phone: "+54 9 11 6034-2211" },
    { id: "u-vend", full_name: "Marcos Leiva", email: "marcos@tortasdemo.ar", role: "vendedor", phone: "+54 9 11 5911-0342" },
    { id: "u-coc", full_name: "Sofía Paredes", email: "sofi@tortasdemo.ar", role: "cocinero", phone: "+54 9 11 4402-8876" },
    { id: "u-rep", full_name: "Bruno Cabral", email: "bruno@tortasdemo.ar", role: "repartidor", phone: "+54 9 11 3320-9714" },
  ];

  const clients: Client[] = [
    { id: "c1", full_name: "Ana Beltrán", phone: "+54 9 11 5321-8890", email: "ana.beltran@mail.com", address: "Av. Rivadavia 4521, CABA", notes: "Alergia a nueces. Contactar solo por WhatsApp.", loyalty_points: 24 },
    { id: "c2", full_name: "Jorge Sosa", phone: "+54 9 11 6100-4532", address: "Güemes 890, Quilmes", notes: "Retira en camioneta — pedidos grandes.", loyalty_points: 41 },
    { id: "c3", full_name: "Lucía Ferraro", phone: "+54 9 11 5548-2210", address: "Mitre 1204, Banfield", notes: "Pide siempre velas y topper dorado.", loyalty_points: 18 },
    { id: "c4", full_name: "Clara Ibáñez", phone: "+54 9 221 503-9981", address: "Calle 9 n.º 340, La Plata", loyalty_points: 7 },
    { id: "c5", full_name: "Rodrigo Paz", phone: "+54 9 11 4902-3345", address: "Olazábal 2211, CABA", notes: "Prefiere entrega antes de las 18 h.", loyalty_points: 33 },
    { id: "c6", full_name: "Marta Domínguez", phone: "+54 9 11 6722-9084", address: "San Martín 556, Lanús", notes: "Paga siempre en efectivo.", loyalty_points: 12 },
    { id: "c7", full_name: "Federico Luna", phone: "+54 9 11 5188-7420", address: "H. Yrigoyen 3020, CABA", loyalty_points: 56 },
    { id: "c8", full_name: "Paula Vega", phone: "+54 9 11 4409-1265", address: "Alsina 77, Avellaneda", notes: "Celíaca: evitar contaminación cruzada.", loyalty_points: 29 },
  ];

  const products: Product[] = [
    { id: "p-choco", name: "Torta de Chocolate 2 kg", description: "Bizcocho húmedo de cacao, relleno de dulce de leche y ganache.", category: "torta", sale_price: 32_000, cost_price: 12_500, is_active: true },
    { id: "p-rogel", name: "Rogel 1,8 kg", description: "Ocho capas de hojaldre caramelizado y dulce de leche repostero.", category: "torta", sale_price: 28_000, cost_price: 11_000, is_active: true },
    { id: "p-chocotorta", name: "Chocotorta Familiar", description: "La clásica: galletitas de chocolate, dulce de leche y queso crema.", category: "torta", sale_price: 24_000, cost_price: 9_800, is_active: true },
    { id: "p-redvelvet", name: "Red Velvet 2 kg", description: "Migas rojas aterciopeladas con frosting de queso crema.", category: "torta", sale_price: 30_000, cost_price: 12_000, is_active: true },
    { id: "p-lemon", name: "Lemon Pie 1,5 kg", description: "Curd de limón exprimido al momento y merengue italiano flameado.", category: "torta", sale_price: 18_000, cost_price: 7_200, is_active: true },
    { id: "p-coco", name: "Torta de Coco 2 kg", description: "Bizcocho de coco con dulce de leche y nube de coco rallado.", category: "torta", sale_price: 26_000, cost_price: 10_400, is_active: true },
    { id: "p-tiramisu", name: "Tiramisú Familiar", description: "Vainillas embebidas en café de especialidad y mascarpone.", category: "postre", sale_price: 19_000, cost_price: 7_600, is_active: true },
    { id: "p-alfajores", name: "Alfajores Artesanales x12", description: "Dulce de leche repostero, bañados en coco.", category: "postre", sale_price: 9_000, cost_price: 3_200, is_active: true },
    { id: "p-budin", name: "Budín de Limón y Amapolas", description: "Glaseado cítrico, ideal para la merienda.", category: "postre", sale_price: 8_500, cost_price: 3_000, is_active: true },
    { id: "p-cafe", name: "Café de Especialidad 1 L", description: "Tostado medio, para acompañar la merienda.", category: "bebida", sale_price: 7_000, cost_price: 2_800, is_active: true },
    { id: "i-harina", name: "Harina 0000", category: "insumo", sale_price: 0, cost_price: 1_400, is_active: true },
    { id: "i-azucar", name: "Azúcar", category: "insumo", sale_price: 0, cost_price: 1_100, is_active: true },
    { id: "i-cacao", name: "Cacao Amargo", category: "insumo", sale_price: 0, cost_price: 6_800, is_active: true },
    { id: "i-huevos", name: "Huevos", category: "insumo", sale_price: 0, cost_price: 380, is_active: true },
    { id: "i-manteca", name: "Manteca", category: "insumo", sale_price: 0, cost_price: 4_200, is_active: true },
    { id: "i-ddl", name: "Dulce de Leche Repostero", category: "insumo", sale_price: 0, cost_price: 3_900, is_active: true },
    { id: "i-choco-semi", name: "Chocolate Semiamargo", category: "insumo", sale_price: 0, cost_price: 9_500, is_active: true },
    { id: "i-leche", name: "Leche Entera", category: "insumo", sale_price: 0, cost_price: 1_200, is_active: true },
    { id: "i-queso", name: "Queso Crema", category: "insumo", sale_price: 0, cost_price: 4_600, is_active: true },
    { id: "i-galletitas", name: "Galletitas de Chocolate", category: "insumo", sale_price: 0, cost_price: 90, is_active: true },
    { id: "i-discos", name: "Discos de Hojaldre", category: "insumo", sale_price: 0, cost_price: 620, is_active: true },
    { id: "i-coco", name: "Coco Rallado", category: "insumo", sale_price: 0, cost_price: 3_400, is_active: true },
    { id: "i-cafe-grano", name: "Café en Grano", category: "insumo", sale_price: 0, cost_price: 11_000, is_active: true },
    { id: "i-vainillas", name: "Vainillas", category: "insumo", sale_price: 0, cost_price: 260, is_active: true },
    { id: "i-limones", name: "Limones", category: "insumo", sale_price: 0, cost_price: 450, is_active: true },
    { id: "i-crema", name: "Crema de Leche", category: "insumo", sale_price: 0, cost_price: 2_900, is_active: true },
  ];

  const inventory: InventoryItem[] = [
    { product_id: "i-harina", qty: 12_500, base_unit: "g", min_qty: 5_000 },
    { product_id: "i-azucar", qty: 8_000, base_unit: "g", min_qty: 4_000 },
    { product_id: "i-cacao", qty: 900, base_unit: "g", min_qty: 1_500 },
    { product_id: "i-huevos", qty: 48, base_unit: "un", min_qty: 36 },
    { product_id: "i-manteca", qty: 2_400, base_unit: "g", min_qty: 2_000 },
    { product_id: "i-ddl", qty: 6_200, base_unit: "g", min_qty: 3_000 },
    { product_id: "i-choco-semi", qty: 1_100, base_unit: "g", min_qty: 1_500 },
    { product_id: "i-leche", qty: 6_000, base_unit: "ml", min_qty: 3_000 },
    { product_id: "i-queso", qty: 2_800, base_unit: "g", min_qty: 1_500 },
    { product_id: "i-galletitas", qty: 480, base_unit: "un", min_qty: 200 },
    { product_id: "i-discos", qty: 22, base_unit: "un", min_qty: 12 },
    { product_id: "i-coco", qty: 700, base_unit: "g", min_qty: 500 },
    { product_id: "i-cafe-grano", qty: 1_800, base_unit: "g", min_qty: 1_000 },
    { product_id: "i-vainillas", qty: 90, base_unit: "un", min_qty: 60 },
    { product_id: "i-limones", qty: 30, base_unit: "un", min_qty: 12 },
    { product_id: "i-crema", qty: 2_200, base_unit: "ml", min_qty: 2_000 },
  ];

  const rc = (finished: string, ingredient: string, qty: number, unit: RecipeRow["unit"], i: number): RecipeRow => ({
    id: `r-${finished}-${i}`,
    finished_product_id: finished,
    ingredient_id: ingredient,
    qty,
    unit,
  });

  const recipes: RecipeRow[] = [
    rc("p-choco", "i-harina", 450, "g", 1), rc("p-choco", "i-azucar", 400, "g", 2), rc("p-choco", "i-cacao", 250, "g", 3),
    rc("p-choco", "i-huevos", 8, "un", 4), rc("p-choco", "i-manteca", 200, "g", 5), rc("p-choco", "i-ddl", 800, "g", 6),
    rc("p-choco", "i-choco-semi", 300, "g", 7),
    rc("p-rogel", "i-discos", 8, "un", 1), rc("p-rogel", "i-ddl", 1200, "g", 2), rc("p-rogel", "i-manteca", 100, "g", 3),
    rc("p-chocotorta", "i-galletitas", 36, "un", 1), rc("p-chocotorta", "i-ddl", 700, "g", 2), rc("p-chocotorta", "i-queso", 500, "g", 3),
    rc("p-chocotorta", "i-leche", 200, "ml", 4), rc("p-chocotorta", "i-cacao", 20, "g", 5),
    rc("p-redvelvet", "i-harina", 400, "g", 1), rc("p-redvelvet", "i-azucar", 350, "g", 2), rc("p-redvelvet", "i-huevos", 6, "un", 3),
    rc("p-redvelvet", "i-manteca", 250, "g", 4), rc("p-redvelvet", "i-queso", 500, "g", 5), rc("p-redvelvet", "i-leche", 250, "ml", 6),
    rc("p-redvelvet", "i-cacao", 60, "g", 7),
    rc("p-lemon", "i-harina", 300, "g", 1), rc("p-lemon", "i-manteca", 250, "g", 2), rc("p-lemon", "i-azucar", 300, "g", 3),
    rc("p-lemon", "i-huevos", 8, "un", 4), rc("p-lemon", "i-leche", 400, "ml", 5), rc("p-lemon", "i-limones", 6, "un", 6),
    rc("p-coco", "i-harina", 400, "g", 1), rc("p-coco", "i-coco", 350, "g", 2), rc("p-coco", "i-azucar", 350, "g", 3),
    rc("p-coco", "i-huevos", 6, "un", 4), rc("p-coco", "i-manteca", 200, "g", 5), rc("p-coco", "i-leche", 300, "ml", 6),
    rc("p-coco", "i-ddl", 400, "g", 7),
    rc("p-tiramisu", "i-vainillas", 24, "un", 1), rc("p-tiramisu", "i-queso", 600, "g", 2), rc("p-tiramisu", "i-cafe-grano", 50, "g", 3),
    rc("p-tiramisu", "i-azucar", 150, "g", 4), rc("p-tiramisu", "i-crema", 400, "ml", 5), rc("p-tiramisu", "i-cacao", 30, "g", 6),
    rc("p-alfajores", "i-harina", 350, "g", 1), rc("p-alfajores", "i-ddl", 500, "g", 2), rc("p-alfajores", "i-coco", 100, "g", 3),
    rc("p-alfajores", "i-manteca", 200, "g", 4), rc("p-alfajores", "i-azucar", 150, "g", 5), rc("p-alfajores", "i-huevos", 3, "un", 6),
    rc("p-budin", "i-harina", 300, "g", 1), rc("p-budin", "i-azucar", 250, "g", 2), rc("p-budin", "i-manteca", 150, "g", 3),
    rc("p-budin", "i-huevos", 4, "un", 4), rc("p-budin", "i-limones", 2, "un", 5), rc("p-budin", "i-leche", 100, "ml", 6),
    rc("p-cafe", "i-cafe-grano", 60, "g", 1),
  ];

  const orders: Order[] = [
    mkOrder({ id: "o-1031", n: 1031, client_id: "c4", status: "entregado", day: 0, time: "09:30", advance: 12_000, type: "pedido_inmediato", createdAgoMin: 26 * 60, items: [item("it-1031-1", "p-chocotorta", 1, 24_000, { texto: "Feliz cumple Teo", color: "celeste" })] }),
    mkOrder({ id: "o-1032", n: 1032, client_id: "c2", status: "en_camino", day: 0, time: "11:00", advance: 16_000, createdAgoMin: 25 * 60, client_notes: "Llamar 30 min antes de entregar.", internal_notes: "Cliente mayorista, revisar caja antes de salir.", items: [item("it-1032-1", "p-choco", 1, 32_000, { texto: "Gracias por tanto", color: "negro" })] }),
    mkOrder({ id: "o-1033", n: 1033, client_id: "c3", status: "en_preparacion", day: 0, time: "15:00", advance: 28_000, createdAgoMin: 9 * 60, client_notes: "Velas número 30 y topper dorado.", items: [item("it-1033-1", "p-rogel", 2, 28_000)] }),
    mkOrder({ id: "o-1034", n: 1034, client_id: "c4", status: "listo_para_retiro", day: 0, time: "17:30", advance: 30_000, createdAgoMin: 7 * 60, items: [item("it-1034-1", "p-redvelvet", 1, 30_000, { texto: "Feliz cumple Clara", color: "rojo" })] }),
    mkOrder({ id: "o-1035", n: 1035, client_id: "c5", status: "confirmado_con_sena", day: 0, time: "18:00", advance: 18_000, createdAgoMin: 5 * 60, items: [item("it-1035-1", "p-lemon", 2, 18_000)] }),
    mkOrder({ id: "o-1036", n: 1036, client_id: "c6", status: "pendiente", day: 0, time: "19:00", advance: 0, createdAgoMin: 3 * 60, internal_notes: "Confirmar por teléfono antes de producir.", items: [item("it-1036-1", "p-alfajores", 2, 9_000), item("it-1036-2", "p-tiramisu", 1, 19_000)] }),
    mkOrder({ id: "o-1037", n: 1037, client_id: "c7", status: "confirmado_con_sena", day: 1, time: "12:00", advance: 48_000, createdAgoMin: 24 * 60, items: [item("it-1037-1", "p-choco", 3, 32_000, { texto: "Feliz aniversario", color: "dorado" })] }),
    mkOrder({ id: "o-1038", n: 1038, client_id: "c8", status: "pendiente", day: 1, time: "16:30", advance: 0, createdAgoMin: 2 * 60, client_notes: "Apta celíacos: verificar insumos.", items: [item("it-1038-1", "p-rogel", 1, 28_000)] }),
    mkOrder({ id: "o-1039", n: 1039, client_id: "c1", status: "confirmado_con_sena", day: 2, time: "11:30", advance: 39_000, createdAgoMin: 4 * 60, items: [item("it-1039-1", "p-redvelvet", 1, 30_000), item("it-1039-2", "p-chocotorta", 2, 24_000)] }),
    mkOrder({ id: "o-1040", n: 1040, client_id: "c3", status: "pendiente", day: 3, time: "17:00", advance: 0, createdAgoMin: 60, items: [item("it-1040-1", "p-tiramisu", 2, 19_000)] }),
    mkOrder({ id: "o-1041", n: 1041, client_id: "c2", status: "confirmado_con_sena", day: 5, time: "13:00", advance: 13_000, createdAgoMin: 8 * 60, items: [item("it-1041-1", "p-coco", 1, 26_000, { texto: "Feliz cumple Mía", color: "rosa" })] }),
    mkOrder({ id: "o-1042", n: 1042, client_id: "c5", status: "pendiente", day: 6, time: "18:00", advance: 0, createdAgoMin: 30, items: [item("it-1042-1", "p-lemon", 1, 18_000)] }),
    mkOrder({ id: "o-1028", n: 1028, client_id: "c4", status: "entregado", day: -1, time: "17:00", advance: 28_000, createdAgoMin: 30 * 60, items: [item("it-1028-1", "p-rogel", 1, 28_000)] }),
    mkOrder({ id: "o-1026", n: 1026, client_id: "c6", status: "entregado", day: -2, time: "12:30", advance: 32_000, createdAgoMin: 54 * 60, items: [item("it-1026-1", "p-choco", 1, 32_000)] }),
    mkOrder({ id: "o-1024", n: 1024, client_id: "c8", status: "entregado", day: -3, time: "16:00", advance: 48_000, createdAgoMin: 78 * 60, items: [item("it-1024-1", "p-chocotorta", 2, 24_000)] }),
  ];

  const slots: Slot[] = [
    { date: d(0), max_capacity: 20, booked_count: 10 },
    { date: d(1), max_capacity: 20, booked_count: 18 },
    { date: d(2), max_capacity: 20, booked_count: 18 },
    { date: d(3), max_capacity: 20, booked_count: 6 },
    { date: d(4), max_capacity: 20, booked_count: 21 },
    { date: d(5), max_capacity: 20, booked_count: 8 },
    { date: d(6), max_capacity: 20, booked_count: 5 },
    { date: d(7), max_capacity: 20, booked_count: 12 },
  ];

  const deliveries: Delivery[] = [
    { id: "dv-1", order_id: "o-1032", driver_id: "u-rep", delivery_address: "Güemes 890, Quilmes", status: "en_camino" },
    { id: "dv-2", order_id: "o-1035", driver_id: "u-rep", delivery_address: "Olazábal 2211, CABA", status: "asignado" },
    { id: "dv-3", order_id: "o-1037", delivery_address: "H. Yrigoyen 3020, CABA", status: "pendiente" },
  ];

  const tx = (
    id: string,
    day: number,
    hAgo: number,
    type: CashTx["type"],
    amount: number,
    method: CashTx["payment_method"],
    category: string,
    description: string,
    userId: string,
    orderId?: string
  ): CashTx => ({
    id,
    type,
    amount,
    payment_method: method,
    category,
    description,
    order_id: orderId,
    user_id: userId,
    created_at: NOW - hAgo * H - (day < 0 ? 0 : 0),
  });

  const transactions: CashTx[] = [
    // hoy
    tx("t-h1", 0, 6.5, "ingreso", 12_000, "transferencia", "Seña", "Seña PD-1031 · Clara Ibáñez", "u-vend", "o-1031"),
    tx("t-h2", 0, 5.2, "ingreso", 28_000, "efectivo", "Seña", "Seña PD-1033 · Lucía Ferraro", "u-vend", "o-1033"),
    tx("t-h3", 0, 4.8, "ingreso", 30_000, "transferencia", "Seña", "Seña PD-1034 · Clara Ibáñez", "u-vend", "o-1034"),
    tx("t-h4", 0, 3.1, "ingreso", 18_000, "qr", "Seña", "Seña PD-1035 · Rodrigo Paz", "u-vend", "o-1035"),
    tx("t-h5", 0, 1.6, "ingreso", 12_000, "qr", "Saldo", "Saldo PD-1031 · Clara Ibáñez", "u-vend", "o-1031"),
    tx("t-h6", 0, 2.2, "egreso", 8_400, "efectivo", "Compra insumos", "Compra 2 docenas de huevos", "u-admin"),
    tx("t-h7", 0, 4.2, "ingreso", 16_000, "transferencia", "Seña", "Seña PD-1032 · Jorge Sosa", "u-vend", "o-1032"),
    // días anteriores (alimentan el gráfico de 7 días)
    tx("t-1a", -1, 26, "ingreso", 28_000, "efectivo", "Saldo", "Saldo PD-1028 · Clara Ibáñez", "u-vend", "o-1028"),
    tx("t-1b", -1, 28, "ingreso", 45_000, "transferencia", "Venta", "Venta mostrador · Rogel + café", "u-vend"),
    tx("t-1c", -1, 30, "ingreso", 14_500, "qr", "Venta", "Venta mostrador · alfajores", "u-vend"),
    tx("t-2a", -2, 50, "ingreso", 32_000, "tarjeta_debito", "Saldo", "Saldo PD-1026 · Marta Domínguez", "u-vend", "o-1026"),
    tx("t-2b", -2, 52, "ingreso", 26_000, "efectivo", "Venta", "Venta mostrador · torta coco", "u-vend"),
    tx("t-2c", -2, 55, "egreso", 34_000, "transferencia", "Compra insumos", "Proveedor dulce de leche", "u-admin"),
    tx("t-3a", -3, 74, "ingreso", 48_000, "transferencia", "Saldo", "Saldo PD-1024 · Paula Vega", "u-vend", "o-1024"),
    tx("t-3b", -3, 76, "ingreso", 19_000, "efectivo", "Venta", "Venta mostrador · tiramisú", "u-vend"),
    tx("t-4a", -4, 98, "ingreso", 76_000, "transferencia", "Venta", "Pedido corporativo · 2 tortas", "u-admin"),
    tx("t-4b", -4, 101, "ingreso", 14_000, "qr", "Venta", "Venta mostrador", "u-vend"),
    tx("t-4c", -4, 103, "egreso", 9_800, "efectivo", "Pago servicios", "Gas — factura mensual", "u-admin"),
    tx("t-5a", -5, 122, "ingreso", 32_500, "efectivo", "Venta", "Venta mostrador · chocotorta", "u-vend"),
    tx("t-5b", -5, 125, "ingreso", 64_000, "tarjeta_credito", "Venta", "Evento · mesa dulce", "u-admin"),
    tx("t-6a", -6, 146, "ingreso", 45_000, "transferencia", "Venta", "Venta mayorista · Jorge Sosa", "u-vend"),
    tx("t-6b", -6, 149, "ingreso", 28_000, "efectivo", "Venta", "Venta mostrador", "u-vend"),
    tx("t-6c", -6, 150, "ingreso", 15_000, "qr", "Venta", "Venta mostrador · café", "u-vend"),
    tx("t-6d", -6, 152, "egreso", 12_500, "efectivo", "Compra insumos", "Manteca y crema", "u-admin"),
  ];

  const orderLogs: OrderLog[] = [
    ...chainLogs("o-1031", "u-rep", ["confirmado_con_sena", "en_preparacion", "listo_para_retiro", "entregado"], 26 * 60),
    ...chainLogs("o-1032", "u-rep", ["confirmado_con_sena", "en_preparacion", "listo_para_retiro", "en_camino"], 25 * 60),
    ...chainLogs("o-1033", "u-coc", ["confirmado_con_sena", "en_preparacion"], 9 * 60),
    ...chainLogs("o-1034", "u-coc", ["confirmado_con_sena", "en_preparacion", "listo_para_retiro"], 7 * 60),
    ...chainLogs("o-1035", "u-vend", ["confirmado_con_sena"], 5 * 60),
    ...chainLogs("o-1036", "u-vend", ["pendiente"], 3 * 60),
    ...chainLogs("o-1038", "u-vend", ["pendiente"], 2 * 60),
    ...chainLogs("o-1040", "u-vend", ["pendiente"], 60),
    ...chainLogs("o-1042", "u-vend", ["pendiente"], 30),
    ...chainLogs("o-1037", "u-vend", ["confirmado_con_sena"], 24 * 60),
    ...chainLogs("o-1039", "u-vend", ["confirmado_con_sena"], 4 * 60),
    ...chainLogs("o-1041", "u-vend", ["confirmado_con_sena"], 8 * 60),
    ...chainLogs("o-1028", "u-rep", ["confirmado_con_sena", "en_preparacion", "listo_para_retiro", "entregado"], 30 * 60),
    ...chainLogs("o-1026", "u-rep", ["confirmado_con_sena", "en_preparacion", "listo_para_retiro", "entregado"], 54 * 60),
    ...chainLogs("o-1024", "u-rep", ["confirmado_con_sena", "en_preparacion", "listo_para_retiro", "entregado"], 78 * 60),
  ];

  const auditLogs: AuditLog[] = [
    { id: "au-1", user_id: "u-admin", action: "LOGIN", entity: "User", entity_id: "u-admin", detail: "Inicio de sesión exitoso", ip: "190.245.12.8", created_at: NOW - 9 * H },
    { id: "au-2", user_id: "u-coc", action: "MANUAL_STOCK_ADJUSTMENT", entity: "Inventory", entity_id: "i-manteca", detail: "Merma −250 g · motivo: vencimiento parcial", ip: "190.245.12.11", created_at: NOW - 6 * H },
    { id: "au-3", user_id: "u-admin", action: "PRICE_CHANGE", entity: "Product", entity_id: "p-chocotorta", detail: "Precio de venta $ 22.000 → $ 24.000", ip: "190.245.12.8", created_at: NOW - 49 * H },
    { id: "au-4", user_id: "u-admin", action: "RECIPE_UPDATED", entity: "ProductRecipe", entity_id: "p-chocotorta", detail: "Receta actualizada: 5 insumos", ip: "190.245.12.8", created_at: NOW - 50 * H },
  ];

  const notifications: AppNotification[] = [
    { id: "nf-1", channel: "whatsapp", title: "Pedido listo · PD-1034", body: "WhatsApp enviado a Clara Ibáñez: “Tu Red Velvet está lista para retirar”.", read: false, created_at: NOW - 40 * MIN },
    { id: "nf-2", channel: "sistema", title: "Stock bajo detectado", body: "Cacao Amargo: quedan 900 g (mínimo 1,5 kg).", read: false, created_at: NOW - 2 * H },
    { id: "nf-3", channel: "whatsapp", title: "Seña recibida · PD-1035", body: "WhatsApp enviado a Rodrigo Paz con el comprobante de la reserva.", read: true, created_at: NOW - 3 * H },
    { id: "nf-4", channel: "sistema", title: "Capacidad casi llena", body: `Mañana ${d(1)}: 18/20 unidades reservadas.`, read: true, created_at: NOW - 5 * H },
  ];

  return {
    seedDay: todayISO(),
    settings: { store_name: "Tortas Demo — Casa de Ventas", max_capacity: 20, currency: "ARS" },
    users,
    clients,
    products,
    inventory,
    recipes,
    slots,
    orders,
    deliveries,
    transactions,
    orderLogs,
    auditLogs,
    notifications,
  };
}
