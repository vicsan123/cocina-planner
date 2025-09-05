// src/pages/RecipesIndexPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Recipes } from "../api";

export default function RecipesIndexPage() {
  const [recipes, setRecipes] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await Recipes.list();
        setRecipes(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return recipes;
    return recipes.filter(r =>
      (r.title || "").toLowerCase().includes(s) ||
      (r.description || "").toLowerCase().includes(s)
    );
  }, [q, recipes]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Recetas</h1>
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 w-72"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => navigate("/recipes/new")}
          >
            + Nueva
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Cargando…</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/recipes/${r.id}`)}
              className="text-left bg-white rounded shadow hover:shadow-md transition overflow-hidden"
            >
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt={r.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="p-3">
                <h2 className="font-medium line-clamp-1">{r.title}</h2>
                {r.description ? (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{r.description}</p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1 italic">Sin descripción</p>
                )}
                <p className="text-xs text-gray-500 mt-2">{r.servings} raciones</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
