import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import PlannerPage from './pages/PlannerPage';
import RecipesPage from './pages/RecipesPage';
import RecipeFormPage from './pages/RecipeFormPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import GroceryListPage from './pages/GroceryListPage';
import ProfilePage from './pages/ProfilePage';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<PlannerPage />} />
              <Route path="recipes" element={<RecipesPage />} />
              <Route path="recipes/new" element={<RecipeFormPage />} />
              <Route path="recipes/:id/edit" element={<RecipeFormPage />} />
              <Route path="recipes/:id" element={<RecipeDetailPage />} />
              <Route path="groceries" element={<GroceryListPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}