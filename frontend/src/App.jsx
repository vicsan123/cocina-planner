// src/App.jsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import PantryList from "./components/PantryList";
import RecipeEditor from "./components/RecipeEditor";
import WeekPlanner from "./pages/WeekPlanner";
import IngredientAddPage from "./pages/IngredientAddPage";
import PantryPage from "./pages/PantryPage";
import RecetasPage from "./pages/RecetasPage"
import RecipeViewerPage from "./pages/RecipeViewerPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import Navbar from "./components/NavBar";
import RecipeCreatePage from "./pages/RecipeCreatePage";


export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <Navbar></Navbar>

          <Routes>
            {/* Página principal con Planner */}
            <Route
              path="/"
              element={
                <WeekPlanner/>
              }
            />
            {/* Página de añadir ingredientes */}
            <Route path="/ingredients" element={<IngredientAddPage />} />
            <Route path="/despensa" element={<PantryPage />} />
            <Route path="/recipes/new" element={<RecipeCreatePage />} />
            <Route path="/recipes/:id" element={<RecipeViewerPage />} />
            <Route path="/recipes" element={<RecetasPage />} />
             <Route path="/shopping" element={<ShoppingListPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
