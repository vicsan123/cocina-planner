// src/pages/PantryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Pantry, Ingredients } from "../api";

// Fallback para DELETE si tu API client no expone Pantry.remove
const API_BASE = "/api";
async function deletePantryItemFallback(id) {
  const res = await fetch(`${API_BASE}/pantry/${id}/`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const msg = await res.text();
    throw new Error(msg || `No se pudo eliminar (HTTP ${res.status})`);
  }
}

const UNITS = ["g", "u", "kg", "ml", "l", "pcs", "tbsp", "tsp"];

export default function PantryPage() {
  const [items, setItems] = useState([]);
  const [ings, setIngs] = useState([]);
  const [loading, setLoading] = useState(true);

  // formulario "añadir / sumar"
  const [form, setForm] = useState({ ingredient: "", quantity: "0", unit: "g" });

  // edición en línea
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ quantity: "", unit: "g" });

  // UI/estado
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // item a borrar

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [p, i] = await Promise.all([Pantry.list(), Ingredients.list()]);
      setItems(p || []);
      setIngs(i || []);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar la despensa");
      setItems([]);
      setIngs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canAdd = useMemo(
    () =>
      form.ingredient &&
      form.quantity !== "" &&
      !Number.isNaN(Number(form.quantity)) &&
      UNITS.includes(form.unit),
    [form]
  );

  const addOrSum = async (e) => {
    e.preventDefault();
    if (!canAdd) return;
    setErr("");
    setMsg("");
    try {
      await Pantry.upsert({
        ingredient: Number(form.ingredient),
        quantity: Number(form.quantity),
        unit: form.unit,
        mode: "add", // suma a lo existente
      });
      setMsg("Ingrediente guardado en la despensa.");
      setForm({ ingredient: "", quantity: "0", unit: "g" });
      await load();
    } catch (e2) {
      setErr(e2?.data?.detail || e2?.message || "No se pudo guardar");
    }
  };

  const startEdit = (it) => {
    setEditingId(it.id);
    setEditDraft({ quantity: String(it.quantity), unit: it.unit });
    setErr("");
    setMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ quantity: "", unit: "g" });
  };

  const saveEdit = async (it) => {
    try {
      await Pantry.upsert({
        ingredient: it.ingredient, // mismo ingrediente
        quantity: Number(editDraft.quantity),
        unit: editDraft.unit,
        mode: "set", // reemplaza cantidad
      });
      setMsg("Cantidad actualizada.");
      cancelEdit();
      await load();
    } catch (e) {
      setErr(e?.data?.detail || e?.message || "No se pudo actualizar");
    }
  };

  const removeItem = async (it) => {
    try {
      if (typeof Pantry.remove === "function") {
        await Pantry.remove(it.id);
      } else {
        await deletePantryItemFallback(it.id);
      }
      setMsg("Ingrediente eliminado de la despensa.");
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo eliminar");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      (it.ingredient_detail?.name || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-semibold">Despensa</h1>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 w-full md:w-80"
              placeholder="Buscar ingrediente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="px-3 py-2 border rounded hover:bg-gray-50"
              onClick={load}
              title="Recargar"
            >
              Recargar
            </button>
          </div>
        </div>

        {/* Mensajes */}
        {msg && <p className="mt-3 text-green-700">{msg}</p>}
        {err && <p className="mt-3 text-red-600">{err}</p>}
      </div>

      {/* Formulario añadir/sumar */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Añadir o sumar ingrediente</h2>
        <form onSubmit={addOrSum} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Ingrediente</span>
            <select
              className="border rounded px-3 py-2 w-64"
              value={form.ingredient}
              onChange={(e) => setForm({ ...form, ingredient: e.target.value })}
            >
              <option value="">—</option>
              {ings.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Cantidad</span>
            <input
              className="border rounded px-3 py-2 w-32"
              type="number"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Unidad</span>
            <select
              className="border rounded px-3 py-2 w-32"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
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
              canAdd ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400"
            }`}
            disabled={!canAdd}
          >
            Guardar
          </button>
        </form>
      </div>

      {/* Tabla de items */}
      <div className="bg-white shadow rounded overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Inventario</h2>
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-600">No hay ingredientes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Ingrediente</th>
                  <th className="text-right px-4 py-2 w-40">Cantidad</th>
                  <th className="text-left px-4 py-2 w-32">Unidad</th>
                  <th className="px-4 py-2 w-40 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((it) => {
                  const isEditing = editingId === it.id;
                  return (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {it.ingredient_detail?.name || "—"}
                      </td>

                      {/* Cantidad */}
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <input
                            className="border rounded px-2 py-1 w-28 text-right"
                            type="number"
                            step="0.01"
                            value={editDraft.quantity}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                quantity: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <span className="font-medium">{it.quantity}</span>
                        )}
                      </td>

                      {/* Unidad */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <select
                            className="border rounded px-2 py-1 w-28"
                            value={editDraft.unit}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, unit: e.target.value }))
                            }
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{it.unit}</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => saveEdit(it)}
                              >
                                Guardar
                              </button>
                              <button
                                className="px-3 py-1 rounded border hover:bg-gray-50"
                                onClick={cancelEdit}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="px-3 py-1 rounded border hover:bg-gray-50"
                                onClick={() => startEdit(it)}
                              >
                                Editar
                              </button>
                              <button
                                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                                onClick={() => setConfirmDelete(it)}
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded shadow-lg w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Eliminar de la despensa</h3>
            <p className="text-gray-700 mb-4">
              ¿Seguro que deseas eliminar{" "}
              <span className="font-medium">
                {confirmDelete.ingredient_detail?.name}
              </span>{" "}
              ({confirmDelete.quantity}
              {confirmDelete.unit})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded border hover:bg-gray-50"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => removeItem(confirmDelete)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
