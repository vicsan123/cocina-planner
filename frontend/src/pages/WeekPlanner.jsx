import { useEffect, useMemo, useState, useRef } from "react";
import { Meals, Recipes } from "../api";
import { Link } from "react-router-dom";

// --- helpers ---
function fmtISO(d) {
  return d.toISOString().slice(0, 10);
}
function mondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function WeekPlanner() {
  const [start, setStart] = useState(() => mondayOfWeek(new Date()));
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [shopping, setShopping] = useState(null);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [error, setError] = useState("");

  const end = useMemo(() => addDays(start, 6), [start]);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(start, i)), [start]);

  // Panel "añadir" por día (usa fecha ISO como key)
  const [openForDate, setOpenForDate] = useState(null); // string ISO o null
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  const refreshMeals = async () => {
    setLoadingMeals(true);
    setError("");
    try {
      const data = await Meals.range(fmtISO(start), fmtISO(end));
      setMeals(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el plan semanal");
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await Recipes.list();
        setRecipes(Array.isArray(r) ? r : []);
      } finally {
        setLoadingRecipes(false);
      }
    })();
  }, []);

  useEffect(() => {
    refreshMeals();
  }, [start]);

  const assign = async (dateISO, recipeId) => {
    try {
      await Meals.create({ date: dateISO, recipe: recipeId });
      await refreshMeals();
      setOpenForDate(null);
      setQuery("");
    } catch (e) {
      alert(e?.message || "No se pudo asignar la receta");
    }
  };

  const remove = async (meal) => {
    if (!confirm("¿Quitar esta receta del día?")) return;
    try {
      await Meals.remove(meal.id);
      refreshMeals();
    } catch (e) {
      alert(e?.message || "No se pudo quitar");
    }
  };

  const generateList = async () => {
    try {
      const res = await Meals.shoppingList(fmtISO(start), fmtISO(end), 1);
      setShopping(res?.missing || []);
    } catch (e) {
      alert(e?.message || "No se pudo generar la lista");
    }
  };

  const niceRange = useMemo(() => {
    try {
      const opts = { day: "2-digit", month: "short" };
      const a = start.toLocaleDateString(undefined, opts);
      const b = end.toLocaleDateString(undefined, opts);
      return `${a} – ${b}`;
    } catch {
      return `${fmtISO(start)} – ${fmtISO(end)}`;
    }
  }, [start, end]);

  const mealsByISO = useMemo(() => {
    const map = new Map();
    meals.forEach((m) => {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date).push(m);
    });
    return map;
  }, [meals]);

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes.slice(0, 12);
    return recipes
      .filter((r) => (r.title || "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, recipes]);

  // Foco automático al abrir el panel
  useEffect(() => {
    if (openForDate && searchRef.current) {
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [openForDate]);

  return (
    <section className="relative">
      {/* fondo decorativo */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-gradient-to-b from-indigo-300/30 to-transparent blur-2xl" />

      {/* Header */}
      <div className="mb-6 rounded-2xl border border-white/40 bg-white/70 backdrop-blur shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              className="group inline-flex items-center gap-2 rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => setStart(addDays(start, -7))}
              title="Semana anterior"
            >
              <ArrowLeftIcon />
              <span className="hidden sm:inline">Semana</span>
            </button>
            <div className="text-xl font-semibold tabular-nums">Semana: {niceRange}</div>
            <button
              className="group inline-flex items-center gap-2 rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => setStart(addDays(start, +7))}
              title="Semana siguiente"
            >
              <span className="hidden sm:inline">Semana</span>
              <ArrowRightIcon />
            </button>
            <button
              className="ml-2 hidden sm:inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100"
              onClick={() => setStart(mondayOfWeek(new Date()))}
              title="Volver a esta semana"
            >
              <SparklesIcon /> Hoy
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/recipes/new"
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-600/20 bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:border-indigo-600/40 hover:shadow"
            >
              <PlusIcon /> Nueva receta
            </Link>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow hover:shadow-md"
              onClick={generateList}
            >
              <CartIcon /> Generar lista de la compra
            </button>
          </div>
        </div>
        {error && <div className="px-4 pb-3 text-sm text-red-600">{error}</div>}
      </div>

      {/* Grid de días */}
      <div className="space-y-4">
        {/* Fila 1: Lunes–Jueves (4 columnas en desktop) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {days.slice(0, 4).map((d) => {
            const iso = fmtISO(d);
            const list = mealsByISO.get(iso) || [];
            const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
            const dateNum = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
            const isToday = fmtISO(new Date()) === iso;

            return (
              <div
                key={iso}
                className={`group relative rounded-2xl border bg-white p-3 shadow-sm transition ${
                  isToday ? "border-indigo-300" : "border-slate-200"
                }`}
              >
                {/* Encabezado del día */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{weekday}</div>
                    <div className="text-lg font-semibold tabular-nums">{dateNum}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {list.length} {list.length === 1 ? "receta" : "recetas"}
                  </span>
                </div>

                {/* Lista de recetas del día */}
                <div className="mt-3 space-y-2">
                  {loadingMeals ? (
                    <DaySkeleton />
                  ) : list.length === 0 ? (
                    <p className="text-sm text-slate-400">Sin recetas</p>
                  ) : (
                    list.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-sm hover:bg-slate-50"
                      >
                        <span className="mr-2 truncate" title={m?.recipe_detail?.title}>
                          {m?.recipe_detail?.title || "Receta"}
                        </span>
                        <button
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                          onClick={() => remove(m)}
                          title="Quitar"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Botón añadir / Panel de búsqueda */}
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setOpenForDate((prev) => (prev === iso ? null : iso));
                      setQuery("");
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <PlusIcon /> Añadir receta…
                  </button>

                  <div
                    className={`transition-[max-height,opacity] ${
                      openForDate === iso ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    } overflow-hidden`}
                  >
                    {openForDate === iso && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="relative">
                          <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar…"
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                          />
                          <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">
                            <SearchIcon />
                          </span>
                        </div>
                        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-100">
                          {loadingRecipes ? (
                            <div className="p-3 text-sm text-slate-400">Cargando recetas…</div>
                          ) : filteredRecipes.length === 0 ? (
                            <div className="p-3 text-sm text-slate-400">No hay coincidencias</div>
                          ) : (
                            <ul className="divide-y">
                              {filteredRecipes.map((r) => (
                                <li key={r.id}>
                                  <button
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                                    onClick={() => assign(iso, r.id)}
                                  >
                                    <span className="truncate">{r.title}</span>
                                    <span className="text-slate-400">›</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="mt-2 text-right">
                          <Link to="/recipes" className="text-xs text-indigo-600 hover:underline">
                            Ver todas las recetas
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fila 2: Viernes–Domingo (3 columnas en desktop) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {days.slice(4).map((d) => {
            const iso = fmtISO(d);
            const list = mealsByISO.get(iso) || [];
            const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
            const dateNum = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
            const isToday = fmtISO(new Date()) === iso;

            return (
              <div
                key={iso}
                className={`group relative rounded-2xl border bg-white p-3 shadow-sm transition ${
                  isToday ? "border-indigo-300" : "border-slate-200"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{weekday}</div>
                    <div className="text-lg font-semibold tabular-nums">{dateNum}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {list.length} {list.length === 1 ? "receta" : "recetas"}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {loadingMeals ? (
                    <DaySkeleton />
                  ) : list.length === 0 ? (
                    <p className="text-sm text-slate-400">Sin recetas</p>
                  ) : (
                    list.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-sm hover:bg-slate-50"
                      >
                        <span className="mr-2 truncate" title={m?.recipe_detail?.title}>
                          {m?.recipe_detail?.title || "Receta"}
                        </span>
                        <button
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                          onClick={() => remove(m)}
                          title="Quitar"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => {
                      setOpenForDate((prev) => (prev === iso ? null : iso));
                      setQuery("");
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <PlusIcon /> Añadir receta…
                  </button>

                  <div
                    className={`transition-[max-height,opacity] ${
                      openForDate === iso ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    } overflow-hidden`}
                  >
                    {openForDate === iso && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="relative">
                          <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar…"
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                          />
                          <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">
                            <SearchIcon />
                          </span>
                        </div>
                        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-100">
                          {loadingRecipes ? (
                            <div className="p-3 text-sm text-slate-400">Cargando recetas…</div>
                          ) : filteredRecipes.length === 0 ? (
                            <div className="p-3 text-sm text-slate-400">No hay coincidencias</div>
                          ) : (
                            <ul className="divide-y">
                              {filteredRecipes.map((r) => (
                                <li key={r.id}>
                                  <button
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                                    onClick={() => assign(iso, r.id)}
                                  >
                                    <span className="truncate">{r.title}</span>
                                    <span className="text-slate-400">›</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="mt-2 text-right">
                          <Link to="/recipes" className="text-xs text-indigo-600 hover:underline">
                            Ver todas las recetas
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de lista de la compra */}
      {shopping && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShopping(null)}
          />
          <div className="relative w-full max-w-xl rounded-2xl border border-white/30 bg-white/90 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Lista de la compra</h3>
              <button
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setShopping(null)}
                aria-label="Cerrar"
              >
                <CloseIcon />
              </button>
            </div>

            {shopping.length === 0 ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                ¡Todo cubierto con lo que hay en la despensa! ✅
              </div>
            ) : (
              <ul className="max-h-[50vh] overflow-auto rounded-lg border border-slate-100">
                {shopping.map((it, idx) => (
                  <li key={idx} className="flex items-center justify-between px-3 py-2 text-sm odd:bg-slate-50/40">
                    <span>{it.ingredient_name}</span>
                    <span className="font-medium tabular-nums">
                      {Math.round(Number(it.quantity_needed) * 100) / 100}
                      {it.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-500">{shopping.length} artículos</div>
              <div className="flex gap-2">
                <Link
                  to="/shopping"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => setShopping(null)}
                >
                  Abrir lista completa
                </Link>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  onClick={() => setShopping(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// --- UI bits ---
function DaySkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-7 rounded-md bg-slate-200/70" />
      <div className="h-7 rounded-md bg-slate-200/70" />
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-slate-700">
      <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-slate-700">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-1 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-slate-400">
      <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-600">
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-current">
      <path d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13l-1.2 6h12.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="19" r="1.5" fill="currentColor"/>
      <circle cx="17" cy="19" r="1.5" fill="currentColor"/>
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-indigo-700">
      <path d="M5 3l1.5 3L10 7l-3.5 1L5 11l-1.5-3L0 7l3.5-1L5 3zm14 6l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM9 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  );
}