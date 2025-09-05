import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ingredients, Recipes, Pantry } from "../api";

const UNITS = ["g", "u", "kg", "ml", "l", "pcs", "tbsp", "tsp"];

export default function RecipeCreatePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [allIngs, setAllIngs] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [baseServings, setBaseServings] = useState(1);
  const [cookServings, setCookServings] = useState(1);
  const [rows, setRows] = useState([{ ingredient: "", quantity: "", unit: "g" }]);

  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(""); setMsg("");
      try {
        const ings = await Ingredients.list();
        setAllIngs(ings || []);
        // estado inicial ya está listo
      } catch (e) {
        setErr(e?.message || "No se pudo cargar el catálogo de ingredientes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addRow = () => setRows((r) => [...r, { ingredient: "", quantity: "", unit: "g" }]);
  const removeRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));

  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    if (!baseServings || Number(baseServings) <= 0) return false;
    const validRows = rows.filter(
      (r) =>
        r.ingredient &&
        r.quantity !== "" &&
        !Number.isNaN(Number(r.quantity)) &&
        UNITS.includes(r.unit)
    );
    return validRows.length > 0;
  }, [title, baseServings, rows]);

  const scaled = useMemo(() => {
    const factor = Math.max(0.000001, Number(cookServings) || 1) / Math.max(0.000001, Number(baseServings) || 1);
    return rows.map((r) => {
      const q = Number(r.quantity);
      const qty = Number.isFinite(q) ? q * factor : 0;
      return { ...r, scaledQty: qty };
    });
  }, [rows, baseServings, cookServings]);

  const ingredientName = (id) => allIngs.find((i) => i.id === id)?.name || "";

  const normalizedIngredients = () =>
    rows
      .filter(
        (r) =>
          r.ingredient &&
          r.quantity !== "" &&
          !Number.isNaN(Number(r.quantity)) &&
          UNITS.includes(r.unit)
      )
      .map((r) => ({
        ingredient: Number(r.ingredient),
        quantity: Number(r.quantity),
        unit: r.unit,
      }));

  const save = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setErr(""); setMsg("");
    try {
      const payload = {
        title: title.trim(),
        description: description || "",
        servings: Number(baseServings) || 1,
        ingredients: normalizedIngredients(),
        imageFile,
      };
      const res = await Recipes.createMultipart(payload);
      setMsg("Receta creada.");
      if (res?.id) navigate(`/recipes/${res.id}`);
      setImageFile(null);
    } catch (e2) {
      setErr(e2?.message || "No se pudo guardar la receta");
    } finally {
      setSaving(false);
    }
  };

  const consumeFromPantry = async () => {
    setConsuming(true);
    setErr(""); setMsg("");
    try {
      const tasks = scaled
        .filter((r) => r.ingredient && Number.isFinite(Number(r.scaledQty)) && Number(r.scaledQty) > 0)
        .map((r) =>
          Pantry.upsert({
            ingredient: Number(r.ingredient),
            unit: r.unit,
            quantity: -Number(r.scaledQty),
            mode: "add",
          })
        );
      await Promise.all(tasks);
      setMsg("Ingredientes descontados de la despensa.");
    } catch (e) {
      setErr(e?.message || "No se pudo descontar de la despensa");
    } finally {
      setConsuming(false);
    }
  };

  const onPickImage = (file) => {
    setImageFile(file || null);
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    } else {
      setImageUrl(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Barra superior */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-semibold">Nueva receta</h1>
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 rounded text-white ${
                canSave && !saving ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400"
              }`}
              disabled={!canSave || saving}
              onClick={save}
            >
              {saving ? "Guardando..." : "Crear receta"}
            </button>
          </div>
        </div>
        {msg && <p className="mt-3 text-green-700">{msg}</p>}
        {err && <p className="mt-3 text-red-600">{err}</p>}
      </div>

      {/* Imagen + datos básicos */}
      <div className="bg-white shadow rounded p-4 mb-6 space-y-4">
        {/* Imagen */}
        <div>
          <span className="block text-sm text-gray-600 mb-2">Imagen</span>
          <div className="flex items-start gap-4">
            <div className="w-56 aspect-[4/3] bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">Sin imagen</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickImage(e.target.files?.[0])}
                className="block"
              />
              {imageFile && (
                <button
                  className="text-sm text-gray-600 underline"
                  onClick={() => onPickImage(null)}
                >
                  Quitar selección
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Texto */}
        <label className="block">
          <span className="text-sm text-gray-600">Título</span>
          <input
            autoFocus
            className="border rounded w-full px-3 py-2 mt-1"
            placeholder="Título de la receta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Descripción (opcional)</span>
          <textarea
            className="border rounded w-full px-3 py-2 mt-1"
            rows={3}
            placeholder="Notas, pasos, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Raciones base</span>
            <input
              className="border rounded px-3 py-2 w-28"
              type="number"
              min={1}
              value={baseServings}
              onChange={(e) => setBaseServings(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Raciones a cocinar</span>
            <input
              className="border rounded px-3 py-2 w-28"
              type="number"
              min={1}
              value={cookServings}
              onChange={(e) => setCookServings(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          <button
            className={`px-4 py-2 rounded text-white ${
              consuming ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
            disabled={consuming}
            onClick={consumeFromPantry}
            title="Descontar ingredientes de la despensa según raciones a cocinar"
          >
            {consuming ? "Procesando…" : "Consumir de despensa"}
          </button>
        </div>
      </div>

      {/* Ingredientes */}
      <div className="bg-white shadow rounded overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ingredientes</h2>
          <button className="text-indigo-600 hover:underline" onClick={addRow}>
            + Añadir ingrediente
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Cargando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 w-64">Ingrediente</th>
                  <th className="text-right px-4 py-2 w-32">Cantidad</th>
                  <th className="text-left px-4 py-2 w-28">Unidad</th>
                  <th className="text-right px-4 py-2 w-36">Cant. para {cookServings}</th>
                  <th className="px-4 py-2 w-28 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={r.ingredient}
                        onChange={(e) => {
                          const v = [...rows];
                          v[idx].ingredient = e.target.value ? Number(e.target.value) : "";
                          setRows(v);
                        }}
                      >
                        <option value="">— Selecciona —</option>
                        {allIngs.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                      {r.ingredient && (
                        <p className="text-xs text-gray-500 mt-1">
                          {ingredientName(Number(r.ingredient))}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-2 text-right">
                      <input
                        className="border rounded px-2 py-1 w-24 text-right"
                        type="number"
                        step="0.01"
                        value={r.quantity}
                        onChange={(e) => {
                          const v = [...rows];
                          v[idx].quantity = e.target.value;
                          setRows(v);
                        }}
                      />
                    </td>

                    <td className="px-4 py-2">
                      <select
                        className="border rounded px-2 py-1 w-24"
                        value={r.unit}
                        onChange={(e) => {
                          const v = [...rows];
                          v[idx].unit = e.target.value;
                          setRows(v);
                        }}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-2 text-right">
                      <span className="font-medium">
                        {Number.isFinite(scaled[idx]?.scaledQty)
                          ? (Math.round(scaled[idx].scaledQty * 100) / 100).toString()
                          : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-right">
                      <button
                        className="px-3 py-1 rounded border hover:bg-gray-50"
                        onClick={() => removeRow(idx)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
