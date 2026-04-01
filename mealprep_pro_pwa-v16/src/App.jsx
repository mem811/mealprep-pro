import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<HomePage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/new" element={<RecipeFormPage />} />
        <Route path="recipes/:id/edit" element={<RecipeFormPage />} />
        <Route path="recipes/:id" element={<RecipeDetailPage />} />
        <Route path="grocery-list" element={<GroceryListPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="food-log" element={<FoodLogPage />} />
        <NavLink to="/food-log">Food Log</NavLink>
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
