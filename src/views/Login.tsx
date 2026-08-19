import { useState } from "react";
import { useApp } from "../lib/store";
import { PERMS, ROLE_META } from "../lib/types";
import type { User } from "../lib/types";
import { fmtDateLong, todayISO } from "../lib/format";
import { I } from "../components/icons";
import { RoleChip, cx } from "../components/ui";
import { Brand } from "../components/layout";

const HERO_IMG = "https://image.qwenlm.ai/generated-images/a45f0b84-424a-4784-a526-69fcccefd696/_result.png";

function permSummary(u: User): string {
  switch (u.role) {
    case "admin":
      return "Acceso total · reportes · auditoría";
    case "vendedor":
      return `${PERMS.create_order.length ? "Pedidos · seña · cobros · caja (ingresos)" : ""}`;
    case "cocinero":
      return "Producción · estados de cocina · mermas";
    case "repartidor":
      return "Entregas del día · comprobantes";
  }
}

export default function Login() {
  const users = useApp((s) => s.users);
  const login = useApp((s) => s.login);
  const inventory = useApp((s) => s.inventory);
  const slots = useApp((s) => s.slots);
  const [opening, setOpening] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(true);

  const low = inventory.filter((i) => i.qty <= i.min_qty).length;
  const todaySlot = slots.find((s) => s.date === todayISO());

  const pick = (u: User) => {
    if (opening) return;
    setOpening(u.id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => login(u.id), reduce ? 60 : 750);
  };

  return (
    <div className="min-h-screen flex relative z-10">
      {/* panel de marca */}
      <div className="hidden md:flex w-[44%] xl:w-[40%] relative overflow-hidden border-r border-crema/10">
        {imgOk ? (
          <img src={HERO_IMG} alt="Torta de chocolate con frosting rosado" className="absolute inset-0 w-full h-full object-cover" onError={() => setImgOk(false)} />
        ) : (
          <div className="absolute inset-0 bg-cocoa-900 flex items-center justify-center">
            <I n="cake" className="w-40 h-40 text-fresa/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa-950 via-cocoa-950/45 to-cocoa-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-cocoa-950/70" />
        <div className="relative flex flex-col justify-between p-9 w-full">
          <Brand />
          <div>
            <p className="eyebrow mb-3">Sistema de gestión integral</p>
            <h1 className="font-display font-black text-4xl xl:text-5xl leading-[1.04] tracking-tight">
              El horno prende
              <br />
              cuando <em className="text-fresa not-italic font-display italic">abrís el turno</em>.
            </h1>
            <p className="text-crema/60 mt-4 max-w-sm text-sm leading-relaxed">
              Pedidos, reservas con capacidad diaria, recetas que descuentan insumos, caja con arqueo y reparto. Todo en un solo panel.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {[
                ["board", "Kanban de pedidos"],
                ["whisk", "Recetas → stock"],
                ["calendar", "Cupos diarios"],
                ["shield", "RBAC por rol"],
              ].map(([ic, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-crema/15 bg-cocoa-950/60 px-3 py-1.5 text-xs font-semibold text-crema/75">
                  <I n={ic as "board"} className="w-3.5 h-3.5 text-caramelo" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* selector de usuario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md anim-fade-up">
          <div className="md:hidden mb-8 flex justify-center">
            <Brand />
          </div>
          <p className="eyebrow">
            {fmtDateLong(todayISO())}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-2">
            ¿Quién abre <span className="text-caramelo italic">el local</span>?
          </h2>
          <p className="text-crema/50 text-sm mt-2">
            Demo con 4 roles (RBAC). Cada rol ve y puede hacer cosas distintas — probá todos.
          </p>

          <div className="mt-7 space-y-3">
            {users.map((u, ix) => (
              <button
                key={u.id}
                onClick={() => pick(u)}
                disabled={!!opening}
                style={{ animationDelay: `${ix * 70}ms` }}
                className={cx(
                  "anim-fade-up w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 cursor-pointer group",
                  opening === u.id
                    ? "border-fresa/60 bg-fresa/10"
                    : "border-crema/10 bg-cocoa-850 hover:border-crema/25 hover:bg-cocoa-800 hover:-translate-y-0.5"
                )}
              >
                <div
                  className={cx(
                    "w-11 h-11 rounded-full flex items-center justify-center font-display font-bold shrink-0 border",
                    u.role === "admin" && "bg-fresa/15 border-fresa/30 text-fresa",
                    u.role === "vendedor" && "bg-caramelo/15 border-caramelo/30 text-caramelo",
                    u.role === "cocinero" && "bg-pistacho/15 border-pistacho/30 text-pistacho",
                    u.role === "repartidor" && "bg-arandano/15 border-arandano/30 text-arandano"
                  )}
                >
                  {u.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold">{u.full_name}</p>
                    <RoleChip role={u.role} />
                  </div>
                  <p className="text-xs text-crema/45 mt-0.5 truncate">{permSummary(u)}</p>
                </div>
                <span className="text-crema/30 group-hover:text-fresa group-hover:translate-x-1 transition-all duration-200">
                  {opening === u.id ? (
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-fresa">
                      <I n="flame" className="w-4 h-4 anim-flame" />
                      Abriendo caja…
                    </span>
                  ) : (
                    <I n="arrow" className="w-5 h-5" />
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
            <div className="card px-4 py-3">
              <p className="eyebrow">Cupo de hoy</p>
              <p className="font-display text-xl font-bold mt-1">
                {todaySlot ? `${todaySlot.booked_count}/${todaySlot.max_capacity}` : "—"} <span className="text-xs text-crema/40 font-body">unidades</span>
              </p>
            </div>
            <div className="card px-4 py-3">
              <p className="eyebrow">Alertas de stock</p>
              <p className={cx("font-display text-xl font-bold mt-1", low > 0 ? "text-fresa" : "text-pistacho")}>
                {low} <span className="text-xs text-crema/40 font-body">insumos bajo mínimo</span>
              </p>
            </div>
          </div>
          <p className="text-center text-[11px] text-crema/30 mt-6">
            {ROLE_META.admin.label} · {ROLE_META.vendedor.label} · {ROLE_META.cocinero.label} · {ROLE_META.repartidor.label} — los datos viven en tu navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
