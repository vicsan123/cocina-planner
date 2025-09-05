// src/pages/ShoppingListPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Meals, Pantry } from "../api"; // 👈 añadimos Pantry

function fmtISO(d) {
  return d.toISOString().slice(0, 10);
}

function mondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0=lunes
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function ShoppingListPage() {
  const [start, setStart] = useState(() => mondayOfWeek(new Date()));
  const [servings, setServings] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [meals, setMeals] = useState([]);
  const [items, setItems] = useState([]);

  const [checked, setChecked] = useState(() => new Set());
  const [bought, setBought] = useState({}); // 👈 key → cantidad comprada
  const [purchasing, setPurchasing] = useState(false); // 👈 spinner de compra

  const end = useMemo(() => addDays(start, 6), [start]);

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

  const keyFor = (it) => `${it.ingredient_id}-${it.unit}`;

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [planned, list] = await Promise.all([
        Meals.range(fmtISO(start), fmtISO(end)),
        Meals.shoppingList(fmtISO(start), fmtISO(end), Number(servings) || 1),
      ]);
      setMeals(Array.isArray(planned) ? planned : []);
      const miss = (list?.missing ?? []).map((it) => ({
        ...it,
        quantity_needed: Number(it.quantity_needed),
      }));
      miss.sort(
        (a, b) =>
          (a.ingredient_name || "").localeCompare(b.ingredient_name || "", undefined, {
            sensitivity: "base",
          }) || (a.unit || "").localeCompare(b.unit || "")
      );
      setItems(miss);

      // Rehidrata 'checked' válidos
      setChecked((prev) => {
        const next = new Set();
        const valid = new Set(miss.map(keyFor));
        prev.forEach((k) => {
          if (valid.has(k)) next.add(k);
        });
        return next;
      });

      // Inicializa 'bought' con la cantidad necesaria por defecto
      setBought(() => {
        const m = {};
        for (const it of miss) m[keyFor(it)] = Number(it.quantity_needed) || 0;
        return m;
      });
    } catch (e) {
      setError(e?.message || "No se pudo generar la lista de la compra");
      setMeals([]);
      setItems([]);
      setBought({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, servings]);

  const toggle = (k) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const markAll = () => setChecked(new Set(items.map(keyFor)));
  const unmarkAll = () => setChecked(new Set());

  const copyToClipboard = async () => {
    const lines = items
      .filter((it) => !checked.has(keyFor(it)))
      .map((it) => `• ${it.ingredient_name}: ${it.quantity_needed}${it.unit}`);
    const text = `Lista de la compra (${niceRange})\n` + lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Lista copiada al portapapeles ✅");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      alert("Lista copiada al portapapeles ✅");
    }
  };

  const downloadCSV = () => {
    const rows = [["Ingrediente", "Cantidad", "Unidad"]];
    items.forEach((it) => rows.push([it.ingredient_name, String(it.quantity_needed), it.unit]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-compra_${fmtISO(start)}_${fmtISO(end)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printList = () => window.print();

  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      const group = (it.ingredient_name?.[0] || "#").toUpperCase();
      if (!map.has(group)) map.set(group, []);
      map.get(group).push(it);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(start, i)), [start]);

  const mealsByDate = useMemo(() => {
    const map = new Map();
    meals.forEach((m) => {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date).push(m);
    });
    return map;
  }, [meals]);

  // ---- NUEVO: Añadir a despensa lo comprado ----
  // Reemplaza por completo esta función:
const addPurchasedToPantry = async ({ onlyChecked } = { onlyChecked: false }) => {
  const candidates = onlyChecked ? items.filter((it) => checked.has(keyFor(it))) : items;

  // 1) Agrupa por (ingredient_id, unit) y suma la cantidad comprada
  const grouped = new Map(); // key -> { ingredient, unit, qty, it }
  for (const it of candidates) {
    const k = keyFor(it);
    let qty = bought[k];
    qty = qty === "" ? 0 : Number(qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    if (!grouped.has(k)) {
      grouped.set(k, {
        ingredient: Number(it.ingredient_id),
        unit: it.unit,
        qty: 0,
        it,
      });
    }
    grouped.get(k).qty += qty;
  }

  if (grouped.size === 0) {
    alert("No hay cantidades válidas (> 0) para añadir.");
    return;
  }

  setPurchasing(true);
  setError("");
  const okKeys = [];
  const fails = [];

  // 2) Enviar SECUENCIALMENTE (evita carreras y violaciones de unique_together)
  for (const [k, g] of grouped.entries()) {
    try {
      await Pantry.upsert({
        ingredient: g.ingredient,
        unit: g.unit,
        quantity: g.qty, // suma total agrupada
        mode: "add",
      });
      okKeys.push(k);
    } catch (e) {
      fails.push({ k, name: g.it.ingredient_name, msg: e?.message || "Error" });
    }
  }

  // 3) Marcar como hechos los que se pudieron añadir
  if (okKeys.length) {
    setChecked((prev) => {
      const next = new Set(prev);
      okKeys.forEach((k) => next.add(k));
      return next;
    });
  }

  // 4) Feedback y fin
  if (fails.length) {
    alert(
      "Algunos artículos fallaron:\n" +
        fails.map((f) => `• ${f.name}: ${f.msg}`).join("\n")
    );
  } else {
    alert("Añadido a la despensa ✅");
  }

  setPurchasing(false);

  // Opcional: regenera la lista para que desaparezcan faltantes ya cubiertos
  await refresh();
};


  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header / controles */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 border rounded hover:bg-gray-50"
              onClick={() => setStart(addDays(start, -7))}
              title="Semana anterior"
            >
              ← Semana
            </button>
            <div className="text-xl font-semibold tabular-nums">Semana: {niceRange}</div>
            <button
              className="px-3 py-2 border rounded hover:bg-gray-50"
              onClick={() => setStart(addDays(start, +7))}
              title="Semana siguiente"
            >
              Semana →
            </button>
          </div>

          <div className="flex items-end gap-3">
            <label className="flex flex-col">
              <span className="text-sm text-gray-600">Raciones por comida</span>
              <input
                className="border rounded px-3 py-2 w-28"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>

            <button className="px-3 py-2 border rounded hover:bg-gray-50" onClick={refresh}>
              Regenerar
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 mt-3">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Resumen de comidas */}
        <div className="lg:col-span-2 bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-3">Menú planificado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {days.map((d, i) => {
              const iso = fmtISO(d);
              const list = mealsByDate.get(iso) || [];
              return (
                <div key={i} className="border rounded p-3">
                  <div className="text-sm text-gray-500">
                    {d.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </div>
                  {list.length === 0 ? (
                    <p className="text-gray-500 mt-2">—</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {list.map((m) => (
                        <li key={m.id} className="truncate">• {m.recipe_detail?.title || "Receta"}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de la compra */}
        <div className="lg:col-span-3 bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Lista de la compra {loading && <span className="text-sm text-gray-500">(generando…)</span>}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={markAll}>
                Marcar todo
              </button>
              <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={unmarkAll}>
                Desmarcar
              </button>
              <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={copyToClipboard}>
                Copiar
              </button>
              <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={downloadCSV}>
                Descargar CSV
              </button>
              <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={printList}>
                Imprimir
              </button>
            </div>
          </div>

          {/* Acciones de compra */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              className={`px-3 py-2 rounded text-white ${purchasing ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"}`}
              disabled={purchasing}
              onClick={() => addPurchasedToPantry({ onlyChecked: true })}
              title="Añade a la despensa solo los ítems marcados, con las cantidades editadas"
            >
              {purchasing ? "Procesando…" : "Añadir marcados a despensa"}
            </button>
            <button
              className={`px-3 py-2 rounded border ${purchasing ? "bg-gray-100 text-gray-400" : "hover:bg-gray-50"}`}
              disabled={purchasing}
              onClick={() => addPurchasedToPantry({ onlyChecked: false })}
              title="Añade a la despensa TODOS los ítems, con las cantidades editadas"
            >
              {purchasing ? "Procesando…" : "Añadir TODO a despensa"}
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="p-4 rounded bg-emerald-50 text-emerald-800">
              ¡Todo cubierto con lo que hay en la despensa! ✅
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([letter, group]) => (
                <div key={letter}>
                  <div className="text-sm font-semibold text-gray-500 mb-1">{letter}</div>
                  <ul className="divide-y">
                    {group.map((it) => {
                      const k = keyFor(it);
                      const done = checked.has(k);
                      const qty = bought[k] ?? it.quantity_needed;

                      return (
                        <li key={k} className="py-2 flex items-center justify-between gap-3">
                          <label className="flex items-center gap-3 cursor-pointer min-w-0">
                            <input
                              type="checkbox"
                              className="w-4 h-4"
                              checked={done}
                              onChange={() => toggle(k)}
                            />
                            <span className={`truncate ${done ? "line-through text-gray-400" : ""}`}>
                              {it.ingredient_name}
                            </span>
                          </label>

                          {/* Cantidades: editable + unidad */}
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="border rounded px-2 py-1 w-28 text-right"
                              value={qty}
                              onChange={(e) => {
                                const v = e.target.value;
                                setBought((prev) => ({ ...prev, [k]: v === "" ? "" : Number(v) }));
                              }}
                              title="Cantidad que compraste (se sumará a la despensa)"
                            />
                            <span className="w-12 text-right text-sm text-gray-600">{it.unit}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="text-sm text-gray-600 pt-2">
                {items.length} artículos • {Array.from(checked).length} marcados
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
