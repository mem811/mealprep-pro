import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import RecipesPage from './pages/RecipesPage';
import RecipeFormPage from './pages/RecipeFormPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import GroceryListPage from './pages/GroceryListPage';
import ProfilePage from './pages/ProfilePage';
import FoodLogPage from './pages/FoodLogPage.jsx';
import LandingPage from './pages/LandingPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
}

function RedirectRecipe() {
  const { id } = useParams();
  return <Navigate to={`/app/recipes/${id}`} replace />;
}

function RedirectRecipeEdit() {
  const { id } = useParams();
  return <Navigate to={`/app/recipes/${id}/edit`} replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={user ? <Navigate to="/app" replace /> : <AuthPage />} />
      <Route path="/signup" element={<Navigate to="/auth" replace />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />

      {/* OLD PATH REDIRECTS */}
      <Route path="/recipes" element={<Navigate to="/app/recipes" replace />} />
      <Route path="/recipes/new" element={<Navigate to="/app/recipes/new" replace />} />
      <Route path="/recipes/:id" element={<RedirectRecipe />} />
      <Route path="/recipes/:id/edit" element={<RedirectRecipeEdit />} />
      <Route path="/grocery-list" element={<Navigate to="/app/grocery-list" replace />} />
      <Route path="/food-log" element={<Navigate to="/app/food-log" replace />} />
      <Route path="/profile" element={<Navigate to="/app/profile" replace />} />

      {/* PRIVATE */}
      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<HomePage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/new" element={<RecipeFormPage />} />
        <Route path="recipes/:id/edit" element={<RecipeFormPage />} />
        <Route path="recipes/:id" element={<RecipeDetailPage />} />
        <Route path="grocery-list" element={<GroceryListPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="food-log" element={<FoodLogPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
