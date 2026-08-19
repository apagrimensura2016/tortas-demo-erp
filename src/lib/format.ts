import type { BaseUnit, Unit } from "./types";

export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

/* ---------- fechas (zona horaria local del negocio) ---------- */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = (): string => toISODate(new Date());

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function isoToDate(iso: string): Date {
  return new Date(iso + "T12:00:00");
}

export function fmtDateLong(iso: string): string {
  return isoToDate(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function fmtDateShort(iso: string): string {
  return isoToDate(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function fmtWeekday(iso: string): string {
  return isoToDate(iso).toLocaleDateString("es-AR", { weekday: "short" });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const isToday = (iso: string): boolean => iso === todayISO();

/* ---------- dinero (centavos → ARS) ---------- */

const moneyFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function fmtMoney(cents: number): string {
  return moneyFmt.format(Math.round(cents / 100));
}

export function parseMoney(raw: string): number {
  const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/* ---------- unidades (conversión g↔kg, ml↔l) ---------- */

export const UNIT_FACTOR: Record<Unit, number> = { kg: 1000, g: 1, l: 1000, ml: 1, un: 1 };

export function baseUnitOf(u: Unit): BaseUnit {
  if (u === "kg" || u === "g") return "g";
  if (u === "l" || u === "ml") return "ml";
  return "un";
}

export function convertToBase(qty: number, unit: Unit): number {
  return qty * UNIT_FACTOR[unit];
}

export function unitsCompatible(a: Unit, b: Unit): boolean {
  return baseUnitOf(a) === baseUnitOf(b);
}

export function unitsForBase(base: BaseUnit): Unit[] {
  if (base === "g") return ["g", "kg"];
  if (base === "ml") return ["ml", "l"];
  return ["un"];
}

export function fmtQty(baseQty: number, base: BaseUnit): string {
  const nf = (n: number, d: number) =>
    n.toLocaleString("es-AR", { maximumFractionDigits: d });
  if (base === "g") return baseQty >= 1000 ? `${nf(baseQty / 1000, 2)} kg` : `${nf(baseQty, 0)} g`;
  if (base === "ml") return baseQty >= 1000 ? `${nf(baseQty / 1000, 2)} L` : `${nf(baseQty, 0)} ml`;
  return `${nf(baseQty, 0)} un`;
}

export function parseQty(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  return isFinite(n) && n > 0 ? n : 0;
}

export function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buen día";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function monthLabel(year: number, month: number): string {
  const s = new Date(year, month, 1).toLocaleDateString("es-AR", { month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
