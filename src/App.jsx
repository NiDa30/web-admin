import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import AdminLayout from "./layouts/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import CategoriesPage from "./pages/CategoriesPage";
import ReportsPage from "./pages/ReportsPage";
import ConfigPage from "./pages/ConfigPage";
import LoginPage from "./pages/LoginPage";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        localStorage.setItem("isAuth", "true");
        setLoginEmail(currentUser.email || "");
        setAdminName(
          currentUser.displayName || currentUser.email?.split("@")[0] || "Admin"
        );
      } else {
        localStorage.removeItem("isAuth");
        setLoginEmail("");
        setAdminName("");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (email, name) => {
    setLoginEmail(email);
    setAdminName(name);
  };

  const handleLogout = () => {
    setAdminName("");
    setLoginEmail("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? "/admin/dashboard" : "/login"} replace />}
      />

      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminLayout
              adminName={adminName}
              loginEmail={loginEmail}
              onLogout={handleLogout}
            />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="config" element={<ConfigPage />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={user ? "/admin/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
