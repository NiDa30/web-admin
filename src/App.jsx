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
import DatabaseManagementPage from "./pages/DatabaseManagementPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import SyncLogsPage from "./pages/SyncLogsPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("🔐 App.jsx - Auth state changed:", {
        hasUser: !!currentUser,
        email: currentUser?.email
      });

      if (currentUser) {
        // Check if this is Super Admin email
        const userService = (await import("./services/userService")).default;
        const isSuperAdminEmail = userService.isSuperAdminEmail(currentUser.email);
        
        // Check localStorage first - if LoginPage set it, trust it
        const localAuth = localStorage.getItem("isAuth") === "true";
        
        console.log("🔍 App.jsx - Auth check:", {
          email: currentUser.email,
          isSuperAdminEmail,
          localAuth
        });
        
        if (localAuth || isSuperAdminEmail) {
          // localStorage says authenticated OR Super Admin, verify with Firestore
          try {
            let userData = await userService.getUserByEmail(currentUser.email);
            
            // If Super Admin doesn't exist in Firestore, create them automatically
            if (!userData && isSuperAdminEmail) {
              console.log("🆕 App.jsx - Super Admin not found, creating automatically...");
              try {
                const newUserId = await userService.createUser(
                  {
                    email: currentUser.email,
                    name: currentUser.email.split("@")[0],
                    phoneNumber: null,
                  },
                  true, // isAdmin = true
                  null // createdBy = null (system created)
                );
                
                // Update to set isSuperAdmin flag and ensure ACTIVE status
                if (newUserId) {
                  try {
                    const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
                    const { db } = await import("./firebase");
                    const { COLLECTIONS } = await import("./constants/collections");
                    const userRef = doc(db, COLLECTIONS.USERS, newUserId);
                    
                    // Add timeout wrapper for update
                    const timeoutPromise = new Promise((_, reject) => {
                      setTimeout(() => reject(new Error("Update timeout")), 10000);
                    });
                    
                    await Promise.race([
                      updateDoc(userRef, {
                        isSuperAdmin: true,
                        accountStatus: "ACTIVE",
                        role: "ADMIN",
                        updatedAt: Timestamp.now(),
                      }),
                      timeoutPromise
                    ]);
                    
                    // Reload user data with retry
                    userData = await userService.getUserByEmail(currentUser.email);
                    console.log("✅ App.jsx - Super Admin created successfully");
                  } catch (updateError) {
                    console.warn("⚠️ App.jsx - Error updating Super Admin, but user created:", updateError);
                    // User was created, so we can still proceed
                    userData = {
                      id: newUserId,
                      email: currentUser.email,
                      name: currentUser.email.split("@")[0],
                      role: "ADMIN",
                      accountStatus: "ACTIVE",
                      isSuperAdmin: true,
                    };
                  }
                }
              } catch (createError) {
                console.error("❌ App.jsx - Error creating Super Admin:", createError);
                // If creation fails due to timeout, allow login anyway for Super Admin
                if (createError.message?.includes("timeout") || 
                    createError.message?.includes("Could not reach") ||
                    createError.code === "unavailable") {
                  console.warn("⚠️ App.jsx - Network timeout, allowing Super Admin login anyway");
                  userData = {
                    id: null,
                    email: currentUser.email,
                    name: currentUser.email.split("@")[0],
                    role: "ADMIN",
                    accountStatus: "ACTIVE",
                    isSuperAdmin: true,
                  };
                }
              }
            }
            
            if (userData) {
              const accountStatus = userData.accountStatus || "ACTIVE";
              const isSuperAdmin = isSuperAdminEmail || userData.isSuperAdmin === true;
              
              console.log("🔍 App.jsx - Firestore user status:", {
                email: userData.email,
                accountStatus,
                role: userData.role,
                isSuperAdmin
              });

              // Super Admin can always login, or if account is ACTIVE
              if (isSuperAdmin || accountStatus === "ACTIVE") {
                // Ensure Super Admin has correct status
                if (isSuperAdmin && accountStatus !== "ACTIVE") {
                  try {
                    const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
                    const { db } = await import("./firebase");
                    const { COLLECTIONS } = await import("./constants/collections");
                    const userRef = doc(db, COLLECTIONS.USERS, userData.id);
                    await updateDoc(userRef, {
                      accountStatus: "ACTIVE",
                      isSuperAdmin: true,
                      role: "ADMIN",
                      updatedAt: Timestamp.now(),
                    });
                    userData.accountStatus = "ACTIVE";
                    console.log("✅ App.jsx - Super Admin status updated to ACTIVE");
                  } catch (updateError) {
                    console.warn("⚠️ App.jsx - Failed to update Super Admin status:", updateError);
                  }
                }
                
                setUser(currentUser);
                setLoginEmail(currentUser.email || "");
                setAdminName(
                  userData.name || currentUser.displayName || currentUser.email?.split("@")[0] || "Admin"
                );
                localStorage.setItem("isAuth", "true"); // Ensure it's set
                console.log("✅ App.jsx - User is ACTIVE or Super Admin, setting user state");
              } else {
                // Account is not ACTIVE and not Super Admin, clear auth
                console.warn("⚠️ App.jsx - User is not ACTIVE and not Super Admin:", accountStatus);
                localStorage.removeItem("isAuth");
                setUser(null);
                setLoginEmail("");
                setAdminName("");
                // Sign out from Firebase Auth
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
              }
            } else if (isSuperAdminEmail) {
              // Super Admin email but user not found - should have been created above
              // Allow login anyway for Super Admin
              console.log("⚠️ App.jsx - Super Admin not found in Firestore, but allowing login");
              setUser(currentUser);
              setLoginEmail(currentUser.email || "");
              setAdminName(currentUser.email?.split("@")[0] || "Admin");
              localStorage.setItem("isAuth", "true");
            } else {
              // User doesn't exist in Firestore and is not Super Admin
              console.warn("⚠️ App.jsx - User not found in Firestore");
              localStorage.removeItem("isAuth");
              setUser(null);
              setLoginEmail("");
              setAdminName("");
            }
          } catch (error) {
            console.error("❌ App.jsx - Error checking user status:", error);
            
            // Check if it's a network/timeout error
            const isNetworkError = error.message?.includes("timeout") || 
                                  error.message?.includes("Could not reach") ||
                                  error.message?.includes("Failed to fetch") ||
                                  error.code === "unavailable" ||
                                  error.code === "deadline-exceeded";
            
            // On network error, allow Super Admin or previously authenticated users to continue
            if (isNetworkError && (isSuperAdminEmail || localStorage.getItem("isAuth") === "true")) {
              console.warn("⚠️ App.jsx - Network error, but allowing authenticated user to continue");
              setUser(currentUser);
              setLoginEmail(currentUser.email || "");
              setAdminName(
                currentUser.displayName || currentUser.email?.split("@")[0] || "Admin"
              );
              localStorage.setItem("isAuth", "true");
            } else if (isSuperAdminEmail || localStorage.getItem("isAuth") === "true") {
              // For other errors, still allow Super Admin or authenticated users
              setUser(currentUser);
              setLoginEmail(currentUser.email || "");
              setAdminName(
                currentUser.displayName || currentUser.email?.split("@")[0] || "Admin"
              );
              localStorage.setItem("isAuth", "true");
            } else {
              setUser(null);
              setLoginEmail("");
              setAdminName("");
            }
          }
        } else {
          // localStorage says not authenticated and not Super Admin, don't set user
          console.log("ℹ️ App.jsx - localStorage says not authenticated and not Super Admin, not setting user");
          setUser(null);
          setLoginEmail("");
          setAdminName("");
        }
      } else {
        // No user, clear everything
        localStorage.removeItem("isAuth");
        setUser(null);
        setLoginEmail("");
        setAdminName("");
        console.log("🚪 App.jsx - User signed out");
      }

      setLoading(false);
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
        path="/forgot-password"
        element={
          user ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <ForgotPasswordPage />
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
        <Route path="database" element={<DatabaseManagementPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
        <Route path="sync-logs" element={<SyncLogsPage />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={user ? "/admin/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
