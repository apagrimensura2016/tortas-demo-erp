import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useApp } from "../lib/store";
import { I, type IconName } from "./icons";
import { ROLE_META, STATUS_META } from "../lib/types";
import type { OrderStatus, Role } from "../lib/types";

export const cx = (...p: (string | false | null | undefined)[]) => p.filter(Boolean).join(" ");

export const inputCls =
  "w-full rounded-lg bg-cocoa-900 border border-crema/12 px-3.5 py-2.5 text-sm text-crema placeholder:text-crema/30 outline-none focus:border-fresa/60 focus:ring-2 focus:ring-fresa/20 transition";
export const taCls = inputCls + " min-h-[84px] resize-y";

/* ---------------- Botones ---------------- */

type BtnVariant = "primary" | "amber" | "green" | "soft" | "ghost" | "danger" | "outline";

const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-fresa text-cocoa-950 hover:brightness-110 font-bold shadow-[0_8px_24px_-10px_rgba(251,94,140,0.7)]",
  amber: "bg-caramelo text-cocoa-950 hover:brightness-110 font-bold",
  green: "bg-pistacho text-cocoa-950 hover:brightness-110 font-bold",
  soft: "bg-crema/8 text-crema border border-crema/12 hover:bg-crema/14",
  ghost: "text-crema/70 hover:bg-crema/8 hover:text-crema",
  danger: "bg-fresa/12 text-fresa border border-fresa/25 hover:bg-fresa/20",
  outline: "border border-crema/20 text-crema hover:bg-crema/8",
};

export function Btn({
  variant = "soft",
  icon,
  className,
  children,
  small,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: IconName; small?: boolean }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-35 disabled:pointer-events-none select-none cursor-pointer",
        small ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        btnVariants[variant],
        className
      )}
      {...rest}
    >
      {icon && <I n={icon} className={small ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}

/* ---------------- Modal / Drawer ---------------- */

export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  w = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: string;
  children: ReactNode;
  w?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-6">
      <div className="absolute inset-0 bg-cocoa-950/80" onClick={onClose} />
      <div className={cx("relative card w-full anim-pop max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-[14px]", w)}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 pt-5 pb-4 bg-cocoa-850/95 border-b border-crema/8">
          <div>
            {sub && <p className="eyebrow mb-1">{sub}</p>}
            <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-crema/50 hover:text-crema hover:bg-crema/8 transition cursor-pointer" aria-label="Cerrar">
            <I n="x" className="w-5 h-5" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-cocoa-950/75" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-cocoa-850 border-l border-crema/10 anim-slide-right overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/* ---------------- Chips y badges ---------------- */

export function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold", className)}>
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return (
    <Chip className={m.chip}>
      <span className={cx("w-1.5 h-1.5 rounded-full", m.dot)} />
      {m.label}
    </Chip>
  );
}

export function RoleChip({ role }: { role: Role }) {
  return <Chip className={ROLE_META[role].chip}>{ROLE_META[role].label}</Chip>;
}

/* ---------------- Formularios ---------------- */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-crema/40">{hint}</span>}
    </label>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-crema/15 bg-cocoa-900 overflow-hidden">
      <button
        className="px-2.5 py-1.5 text-crema/60 hover:text-fresa hover:bg-crema/6 transition cursor-pointer"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Restar"
      >
        <I n="minus" className="w-3.5 h-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums">{value}</span>
      <button
        className="px-2.5 py-1.5 text-crema/60 hover:text-pistacho hover:bg-crema/6 transition cursor-pointer"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Sumar"
      >
        <I n="plus" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative w-10 h-[22px] rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40",
        checked ? "bg-pistacho" : "bg-crema/15"
      )}
    >
      <span
        className={cx(
          "absolute top-[3px] w-4 h-4 rounded-full bg-cocoa-950 transition-all duration-200",
          checked ? "left-[21px]" : "left-[3px] bg-crema/70"
        )}
      />
    </button>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-crema/10 bg-cocoa-900 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cx(
            "px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer",
            value === o.v ? "bg-crema/14 text-crema" : "text-crema/45 hover:text-crema/80"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Animaciones ---------------- */

export function CountUp({ to, fmt, className }: { to: number; fmt: (n: number) => string; className?: string }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current;
    prev.current = to;
    if (reduce) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    const dur = 950;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className={className}>{fmt(v)}</span>;
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          ob.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------- Varios ---------------- */

export function Empty({ icon = "box", title, body }: { icon?: IconName; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-xl bg-crema/6 border border-crema/10 flex items-center justify-center text-crema/35 mb-3">
        <I n={icon} className="w-6 h-6" />
      </div>
      <p className="font-display text-lg text-crema/70">{title}</p>
      {body && <p className="text-sm text-crema/40 mt-1 max-w-xs">{body}</p>}
    </div>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[min(92vw,400px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "anim-slide-right card px-4 py-3 flex items-start gap-3 border-l-4 text-sm",
            t.kind === "ok" && "border-l-pistacho",
            t.kind === "error" && "border-l-fresa",
            t.kind === "info" && "border-l-caramelo"
          )}
        >
          <span
            className={cx(
              "mt-0.5 shrink-0",
              t.kind === "ok" && "text-pistacho",
              t.kind === "error" && "text-fresa",
              t.kind === "info" && "text-caramelo"
            )}
          >
            <I n={t.kind === "ok" ? "check" : t.kind === "error" ? "alert" : "spark"} className="w-4.5 h-4.5" />
          </span>
          <p className="leading-snug text-crema/90">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}

export const thCls = "px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-crema/40 font-bold";
export const tdCls = "px-3 py-3 text-sm border-t border-crema/6";
