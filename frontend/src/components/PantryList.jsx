// src/components/PantryList.jsx
import { useEffect, useState } from "react";
import { Pantry, Ingredients } from "../api";

export default function PantryList() {
  const [items, setItems] = useState([]);
  const [ings, setIngs] = useState([]);
  const [form, setForm] = useState({
    ingredient: "",
    quantity: "0",
    unit: "g",
  });

  useEffect(() => {
    (async () => {
      const [p, i] = await Promise.all([Pantry.list(), Ingredients.list()]);
      setItems(p);
      setIngs(i);
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      ingredient: Number(form.ingredient),
      quantity: Number(form.quantity),
    };
    await Pantry.upsert(payload);
    setItems(await Pantry.list());
  };

  return (
    <div className="bg-white shadow rounded p-4">
      <h2 className="text-xl font-semibold mb-3">Despensa</h2>

      <form onSubmit={save} className="flex flex-wrap items-end gap-2 mb-4">
        <label className="flex flex-col">
          <span className="text-sm text-gray-600">Ingrediente</span>
          <select
            className="border rounded px-2 py-1"
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
            className="border rounded px-2 py-1 w-28"
            type="number"
            step="0.01"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm text-gray-600">Unidad</span>
          <select
            className="border rounded px-2 py-1"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {["g", "kg", "ml", "l", "pcs", "tbsp", "tsp"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>

        <button className="btn btn-primary bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">
          Guardar
        </button>
      </form>

      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.id} className="py-2 flex justify-between">
            <span>{it.ingredient_detail.name}</span>
            <span className="font-medium">
              {it.quantity}
              {it.unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
