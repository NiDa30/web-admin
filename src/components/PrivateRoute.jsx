// components/PrivateRoute.js
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

function PrivateRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if this is Super Admin email
        const userService = (await import("../services/userService")).default;
        const isSuperAdminEmail = userService.isSuperAdminEmail(currentUser.email);
        
        // Check if user exists in Firestore and is ACTIVE
        try {
          let userData = await userService.getUserByEmail(currentUser.email);
          
          // If Super Admin doesn't exist in Firestore, create them automatically
          if (!userData && isSuperAdminEmail) {
            console.log("🆕 PrivateRoute - Super Admin not found, creating automatically...");
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
              const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
              const { db } = await import("../firebase");
              const { COLLECTIONS } = await import("../constants/collections");
              const userRef = doc(db, COLLECTIONS.USERS, newUserId);
              await updateDoc(userRef, {
                isSuperAdmin: true,
                accountStatus: "ACTIVE",
                role: "ADMIN",
                updatedAt: Timestamp.now(),
              });
              
              // Reload user data
              userData = await userService.getUserByEmail(currentUser.email);
              console.log("✅ PrivateRoute - Super Admin created successfully");
            } catch (createError) {
              console.error("❌ PrivateRoute - Error creating Super Admin:", createError);
            }
          }
          
          if (userData) {
            const accountStatus = userData.accountStatus || "ACTIVE";
            const isSuperAdmin = isSuperAdminEmail || userData.isSuperAdmin === true;
            const localAuth = localStorage.getItem("isAuth") === "true";
            
            console.log("🔒 PrivateRoute check:", {
              email: currentUser.email,
              accountStatus,
              isSuperAdmin,
              localAuth,
              isActive: accountStatus === "ACTIVE"
            });

            // Super Admin can always access, or if account is ACTIVE and localStorage says authenticated
            if (isSuperAdmin || (accountStatus === "ACTIVE" && localAuth)) {
              // Ensure Super Admin has correct status
              if (isSuperAdmin && accountStatus !== "ACTIVE") {
                try {
                  const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
                  const { db } = await import("../firebase");
                  const { COLLECTIONS } = await import("../constants/collections");
                  const userRef = doc(db, COLLECTIONS.USERS, userData.id);
                  await updateDoc(userRef, {
                    accountStatus: "ACTIVE",
                    isSuperAdmin: true,
                    role: "ADMIN",
                    updatedAt: Timestamp.now(),
                  });
                  console.log("✅ PrivateRoute - Super Admin status updated to ACTIVE");
                } catch (updateError) {
                  console.warn("⚠️ PrivateRoute - Failed to update Super Admin status:", updateError);
                }
              }
              
              setIsAuthenticated(true);
              localStorage.setItem("isAuth", "true"); // Ensure it's set
            } else {
              console.warn("⚠️ PrivateRoute: User not ACTIVE or not authenticated:", {
                accountStatus,
                isSuperAdmin,
                localAuth
              });
              setIsAuthenticated(false);
              localStorage.removeItem("isAuth");
            }
          } else if (isSuperAdminEmail) {
            // Super Admin email but user not found - allow access anyway
            console.log("⚠️ PrivateRoute - Super Admin not found in Firestore, but allowing access");
            setIsAuthenticated(true);
            localStorage.setItem("isAuth", "true");
          } else {
            console.warn("⚠️ PrivateRoute: User not found in Firestore");
            setIsAuthenticated(false);
            localStorage.removeItem("isAuth");
          }
        } catch (error) {
          console.error("❌ PrivateRoute error:", error);
          // On error, check localStorage or Super Admin as fallback
          const localAuth = localStorage.getItem("isAuth") === "true";
          if (isSuperAdminEmail || localAuth) {
            setIsAuthenticated(true);
            localStorage.setItem("isAuth", "true");
          } else {
            setIsAuthenticated(false);
          }
        }
      } else {
        console.log("🔒 PrivateRoute: No user, redirecting to login");
        setIsAuthenticated(false);
        localStorage.removeItem("isAuth");
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default PrivateRoute;
