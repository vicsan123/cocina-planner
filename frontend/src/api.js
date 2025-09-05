// src/api.js
export const API_BASE = "/api";

async function http(path, options = {}) {
  const isFormData = options?.body instanceof FormData;
  const headers = isFormData ? {} : { "Content-Type": "application/json" };

  const res = await fetch(API_BASE + path, {
    headers: { ...headers, ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg);
  }
  return res.json();
}

export const Ingredients = {
  list: () => http("/ingredients/"),
  add: (data) =>
    http("/ingredients/add/", { method: "POST", body: JSON.stringify(data) }),
};

export const Pantry = {
  list: () => http("/pantry/"), // 👈 ahora sí correcto
  remove: (id) => http(`/pantry/${id}/`, { method: "DELETE" }),
  upsert: (data) =>
    http("/pantry/upsert/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const Recipes = {
  list: () => http("/recipes/"),
  get: (id) => http(`/recipes/${id}/`),

  // 👇 NUEVOS helpers que envían multipart (imagen + JSON)
  createMultipart: ({ title, description, servings, ingredients, imageFile }) => {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description || "");
    fd.append("servings", String(servings || 1));
    fd.append("ingredients", JSON.stringify(ingredients || [])); // DRF lo parsea en la View
    if (imageFile) fd.append("image", imageFile);
    return http("/recipes/", { method: "POST", body: fd });
  },

  updateMultipart: (id, { title, description, servings, ingredients, imageFile, removeImage }) => {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description || "");
    fd.append("servings", String(servings || 1));
    fd.append("ingredients", JSON.stringify(ingredients || []));
    // Si quieres poder borrar imagen, envía flag removeImage y en el backend gestiona
    if (removeImage) fd.append("image", ""); 
    else if (imageFile) fd.append("image", imageFile);
    return http(`/recipes/${id}/`, { method: "PUT", body: fd });
  },

  delete: (id) => http(`/recipes/${id}/`, { method: "DELETE" }),
};

export const Meals = {
  range: (start, end) => http(`/meals/?start=${start}&end=${end}`),
  create: (data) =>
    http("/meals/", { method: "POST", body: JSON.stringify(data) }),
  remove: (id) => http(`/meals/${id}/`, { method: "DELETE" }),
  shoppingList: (start, end, servings = 1) =>
    http(
      `/meals/shopping_list?start=${start}&end=${end}&servings=${servings}`
    ),
};
