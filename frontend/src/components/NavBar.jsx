// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/ingredients", label: "Añadir ingredientes" },
  { to: "/shopping", label: "Lista de la compra" },
  { to: "/despensa", label: "Despensa" },
  { to: "/recipes", label: "Recetas" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    // cierra el menú al navegar
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    // eleva la barra al hacer scroll
    const onScroll = () => setElevated(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-40 transition-all",
        elevated ? "backdrop-blur bg-white/70 shadow-md" : "backdrop-blur bg-white/40",
        "border-b border-white/30",
      ].join(" ")}
    >
      {/* Glow superior sutil */}
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-indigo-300/40 to-transparent blur-2xl"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="group flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-indigo-500/30 blur-md opacity-0 group-hover:opacity-100 transition" />
              <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                <span className="text-lg font-bold">🍳</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 tracking-tight">
              Cocina Planner
            </h1>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "relative px-3 py-2 rounded-md text-sm font-medium transition",
                    active
                      ? "text-indigo-700"
                      : "text-slate-700 hover:text-indigo-700",
                  ].join(" ")}
                >
                  {item.label}
                  {/* subrayado animado */}
                  <span
                    className={[
                      "absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-indigo-600 transition-transform duration-300 origin-left",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    ].join(" ")}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Actions (puedes poner avatar, etc.) */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/recipes/new"
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-600/20 bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:shadow transition hover:border-indigo-600/40"
            >
              <span className="text-lg leading-none">＋</span> Nueva receta
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden relative h-10 w-10 grid place-items-center rounded-lg border border-slate-300/70 bg-white/70 hover:bg-white transition"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <div className="relative h-4 w-5">
              <span
                className={[
                  "absolute inset-x-0 top-0 h-0.5 bg-slate-700 transition-transform",
                  open ? "translate-y-1.5 rotate-45" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "absolute inset-x-0 top-1.5 h-0.5 bg-slate-700 transition-opacity",
                  open ? "opacity-0" : "opacity-100",
                ].join(" ")}
              />
              <span
                className={[
                  "absolute inset-x-0 top-3 h-0.5 bg-slate-700 transition-transform",
                  open ? "-translate-y-1.5 -rotate-45" : "",
                ].join(" ")}
              />
            </div>
          </button>
        </div>

        {/* Mobile nav panel */}
        <div
          className={[
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-300",
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <nav className="mt-2 grid gap-1 pb-3">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      : "text-slate-700 hover:bg-slate-50 border border-transparent",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  <span className="text-slate-400">›</span>
                </Link>
              );
            })}
            <Link
              to="/recipes/new"
              className="mt-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white text-center shadow hover:shadow-md transition"
            >
              ＋ Nueva receta
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
