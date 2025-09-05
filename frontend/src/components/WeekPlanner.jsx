// src/components/WeekPlanner.jsx
import { useEffect, useMemo, useState } from "react";
import { Meals, Recipes } from "../api";

function fmt(d) {
  return d.toISOString().slice(0, 10);
}
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-indigo-700">
      <path d="M5 3l1.5 3L10 7l-3.5 1L5 11l-1.5-3L0 7l3.5-1L5 3zm14 6l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM9 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  );
}
export default function WeekPlanner() {
  const [start, setStart] = useState(() => {
    // lunes de esta semana
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const days = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      }),
    [start]
  );

  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [shopping, setShopping] = useState(null);

  const refresh = async () => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const data = await Meals.range(fmt(start), fmt(end));
    setMeals(data);
  };

  useEffect(() => {
    Recipes.list().then(setRecipes);
  }, []);

  useEffect(() => {
    refresh();
  }, [start]);

  const assign = async (date, recipeId) => {
    await Meals.create({ date, recipe: recipeId });
    refresh();
  };

  const remove = async (meal) => {
    await Meals.remove(meal.id);
    refresh();
  };

  const generateList = async () => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const res = await Meals.shoppingList(fmt(start), fmt(end), 1);
    setShopping(res.missing);
  };

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Plan semanal</h2>
        <div className="space-x-2">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => {
              const d = new Date(start);
              d.setDate(start.getDate() - 7);
              setStart(d);
            }}
          >
            ← Semana
          </button>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => {
              const d = new Date(start);
              d.setDate(start.getDate() + 7);
              setStart(d);
            }}
          >
            Semana →
          </button>
          <button
            className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            onClick={generateList}
          >
            Generar lista de la compra
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((d, i) => (
          <div key={i} className="border rounded p-3">
            <div className="text-sm text-gray-500">
              {d.toLocaleDateString(undefined, {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              })}
            </div>
            <div className="space-y-2 mt-2">
              {meals
                .filter((m) => m.date === fmt(d))
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded"
                  >
                    <span className="truncate">{m.recipe_detail.title}</span>
                    <button
                      className="text-red-600 hover:underline text-sm"
                      onClick={() => remove(m)}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              <select
                className="w-full border rounded px-2 py-1"
                onChange={(e) => {
                  if (!e.target.value) return;
                  assign(fmt(d), Number(e.target.value));
                  e.currentTarget.selectedIndex = 0;
                }}
              >
                <option value="">Añadir receta…</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {shopping && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShopping(null)}
        >
          <div
            className="bg-white rounded shadow-lg w-full max-w-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Lista de la compra</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShopping(null)}
              >
                ✕
              </button>
            </div>
            {shopping.length === 0 ? (
              <p className="text-green-700">
                ¡Todo cubierto con lo que hay en la despensa! ✅
              </p>
            ) : (
              <ul className="divide-y">
                {shopping.map((it, idx) => (
                  <li key={idx} className="py-2 flex justify-between">
                    <span>{it.ingredient_name}</span>
                    <span className="font-medium">
                      {it.quantity_needed}
                      {it.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-indigo-700">
      <path d="M5 3l1.5 3L10 7l-3.5 1L5 11l-1.5-3L0 7l3.5-1L5 3zm14 6l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4zM9 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  );
}