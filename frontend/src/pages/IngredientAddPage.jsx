// src/pages/IngredientAddPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Ingredients } from "../api";

// Unidades válidas según tu modelo
const UNITS = ["u","g", "kg", "ml", "l", "pcs", "tbsp", "tsp"];

export default function IngredientAddPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({ name: "", default_unit: "g" });

  const canSave = useMemo(
    () => form.name.trim().length > 0 && UNITS.includes(form.default_unit),
    [form]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await Ingredients.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudo cargar la lista de ingredientes");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    setOk("");

    try {
      // Si tienes la acción add/ en el backend, úsala; si no, cae a create()
      const apiFn =
        typeof Ingredients.add === "function"
          ? Ingredients.add
          : Ingredients.create;

      const saved = await apiFn(form);
      setOk(`Ingrediente "${saved?.name || form.name}" guardado correctamente.`);
      setForm({ name: "", default_unit: "g" });
      await load();
    } catch (e) {
      // Mostramos detalle si viene del backend
      const msg = e?.data?.detail || e?.message || "No se pudo crear";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white shadow rounded p-4 mb-6">
        <h1 className="text-2xl font-semibold mb-4">Añadir ingrediente</h1>

        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col flex-1 min-w-[220px]">
            <span className="text-sm text-gray-600">Nombre</span>
            <input
              className="border rounded px-3 py-2"
              placeholder="Ej. Harina, Tomate, Aceite..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <label className="flex flex-col w-40">
            <span className="text-sm text-gray-600">Unidad por defecto</span>
            <select
              className="border rounded px-3 py-2"
              value={form.default_unit}
              onChange={(e) =>
                setForm((f) => ({ ...f, default_unit: e.target.value }))
              }
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>

          <button
            className={`px-4 py-2 rounded text-white ${
              canSave && !saving
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!canSave || saving}
          >
            {saving ? "Guardando..." : "Guardar ingrediente"}
          </button>
        </form>

        {ok && <p className="text-green-700 mt-3">{ok}</p>}
        {error && <p className="text-red-600 mt-3">{error}</p>}
      </div>

      <div className="bg-white shadow rounded p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Ingredientes existentes</h2>
          <button className="text-sm text-indigo-600 hover:underline" onClick={load}>
            Recargar
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-gray-600">Aún no hay ingredientes.</p>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id} className="py-2 flex justify-between">
                <span className="font-medium">{it.name}</span>
                <span className="text-gray-600">{it.default_unit}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
