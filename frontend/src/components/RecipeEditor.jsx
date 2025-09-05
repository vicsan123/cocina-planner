// src/components/RecipeEditor.jsx
import { useEffect, useState } from "react";
import { Ingredients, Recipes } from "../api";

export default function RecipeEditor({ onCreated }) {
  const [ings, setIngs] = useState([]);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState([{ ingredient: "", quantity: "", unit: "g" }]);

  useEffect(() => {
    Ingredients.list().then(setIngs);
  }, []);

  const addRow = () =>
    setRows([...rows, { ingredient: "", quantity: "", unit: "g" }]);

  const save = async (e) => {
    e.preventDefault();
    const ingredients = rows
      .filter((r) => r.ingredient && r.quantity)
      .map((r) => ({
        ingredient: Number(r.ingredient),
        quantity: Number(r.quantity),
        unit: r.unit,
      }));
    await Recipes.create({ title, description: "", servings: 1, ingredients });
    if (onCreated) onCreated();
    setTitle("");
    setRows([{ ingredient: "", quantity: "", unit: "g" }]);
  };

  return (
    <div className="bg-white shadow rounded p-4">
      <h2 className="text-xl font-semibold mb-3">Nueva receta</h2>
      <form onSubmit={save} className="space-y-3">
        <input
          className="border rounded w-full px-3 py-2"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="flex gap-2">
              <select
                className="border rounded px-2 py-1 flex-1"
                value={r.ingredient}
                onChange={(e) => {
                  const v = [...rows];
                  v[idx].ingredient = e.target.value;
                  setRows(v);
                }}
              >
                <option value="">Ingrediente…</option>
                {ings.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>

              <input
                className="border rounded px-2 py-1 w-28"
                type="number"
                placeholder="Cant."
                value={r.quantity}
                onChange={(e) => {
                  const v = [...rows];
                  v[idx].quantity = e.target.value;
                  setRows(v);
                }}
              />

              <select
                className="border rounded px-2 py-1 w-28"
                value={r.unit}
                onChange={(e) => {
                  const v = [...rows];
                  v[idx].unit = e.target.value;
                  setRows(v);
                }}
              >
                {["g", "kg", "ml", "l", "pcs", "tbsp", "tsp"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="text-indigo-600 hover:underline"
          >
            + Añadir ingrediente
          </button>
        </div>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          Guardar receta
        </button>
      </form>
    </div>
  );
}
