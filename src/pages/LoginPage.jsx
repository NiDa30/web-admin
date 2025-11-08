import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, User, Lock, Eye, EyeOff, Mail } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { message } from "antd";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import userService from "../services/userService";
import notificationService from "../services/notificationService";

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Check if this is Super Admin email
      const isSuperAdminEmail = userService.isSuperAdminEmail(email);
      console.log("🔍 Login attempt - Is Super Admin:", {
        email,
        isSuperAdminEmail
      });

      // Check if user exists in Firestore and their status
      let userData = await userService.getUserByEmail(email);
      
      console.log("🔍 Login attempt - User data:", {
        email,
        userData: userData ? {
          id: userData.id,
          email: userData.email,
          accountStatus: userData.accountStatus,
          role: userData.role,
          isSuperAdmin: userData.isSuperAdmin
        } : null
      });
      
      // If Super Admin doesn't exist in Firestore, create them automatically
      if (!userData && isSuperAdminEmail) {
        console.log("🆕 Super Admin not found in Firestore, creating automatically...");
        try {
          const newUserId = await userService.createUser(
            {
              email: email,
              name: email.split("@")[0],
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
          userData = await userService.getUserByEmail(email);
          console.log("✅ Super Admin created successfully:", userData);
        } catch (createError) {
          console.error("❌ Error creating Super Admin:", createError);
          await signOut(auth);
          setError("Không thể tạo tài khoản Super Admin. Vui lòng liên hệ quản trị viên.");
          setLoading(false);
          return;
        }
      }
      
      if (!userData) {
        // User doesn't exist in Firestore and is not Super Admin, sign out and show error
        console.error("❌ User not found in Firestore");
        await signOut(auth);
        setError("Tài khoản chưa được đăng ký trong hệ thống. Vui lòng đăng ký trước.");
        setLoading(false);
        return;
      }

      // Check account status - Default to ACTIVE if not set (for backward compatibility)
      // Super Admin always allowed to login regardless of status
      const accountStatus = userData.accountStatus || "ACTIVE";
      
      console.log("🔍 Account status check:", {
        email,
        accountStatus,
        isSuperAdmin: isSuperAdminEmail || userData.isSuperAdmin,
        isPending: accountStatus === "PENDING",
        isLocked: accountStatus === "LOCKED",
        isActive: accountStatus === "ACTIVE"
      });

      // Super Admin can always login, skip status checks
      if (!isSuperAdminEmail && !userData.isSuperAdmin) {
        if (accountStatus === "PENDING") {
          console.warn("⚠️ Account is PENDING, blocking login");
          await signOut(auth);
          setError("Tài khoản của bạn đang chờ phê duyệt từ quản trị viên. Vui lòng thử lại sau.");
          setLoading(false);
          return;
        }

        if (accountStatus === "LOCKED") {
          console.warn("⚠️ Account is LOCKED, blocking login");
          await signOut(auth);
          setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
          setLoading(false);
          return;
        }

        // Only allow ACTIVE accounts (or accounts without status set)
        if (accountStatus !== "ACTIVE") {
          console.error("❌ Invalid account status:", accountStatus);
          await signOut(auth);
          setError("Tài khoản của bạn không thể đăng nhập. Vui lòng liên hệ quản trị viên.");
          setLoading(false);
          return;
        }
      } else {
        console.log("✅ Super Admin login - skipping status checks");
        // Ensure Super Admin has ACTIVE status
        if (accountStatus !== "ACTIVE") {
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
            userData.accountStatus = "ACTIVE";
            userData.isSuperAdmin = true;
            userData.role = "ADMIN";
            console.log("✅ Super Admin status updated to ACTIVE");
          } catch (updateError) {
            console.warn("⚠️ Failed to update Super Admin status:", updateError);
          }
        }
      }

      console.log("✅ Account status is ACTIVE, proceeding with login");

      // Update last login time
      try {
        const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
        const { db } = await import("../firebase");
        const { COLLECTIONS } = await import("../constants/collections");
        const userRef = doc(db, COLLECTIONS.USERS, userData.id);
        await updateDoc(userRef, {
          lastLoginTime: Timestamp.now(),
        });
        console.log("✅ Last login time updated");
      } catch (updateError) {
        console.warn("⚠️ Failed to update last login time:", updateError);
        // Don't fail login if update fails
      }

      // Set authentication flag
      localStorage.setItem("isAuth", "true");
      console.log("✅ Authentication flag set in localStorage");

      // Gọi callback onLogin nếu có
      if (onLogin) {
        const name = userData.name || userCredential.user.displayName || email.split("@")[0];
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        onLogin(email, capitalizedName);
        console.log("✅ onLogin callback called");
      }

      // Navigate to admin page
      console.log("🚀 Navigating to /admin/users");
      navigate("/admin/users", { replace: true });
    } catch (error) {
      let errorMessage = "Đăng nhập thất bại!";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Tài khoản không tồn tại!";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Mật khẩu không chính xác!";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "Email hoặc mật khẩu không chính xác!";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ!";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Đăng ký
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    setLoading(true);

    try {
      // 1. Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      const firebaseUserId = userCredential.user.uid;
      const userName = email.split("@")[0];
      const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);

      // 2. Check if user already exists in Firestore
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        // User already exists in Firestore, sign out and show error
        await signOut(auth);
        setError("Email đã được sử dụng trong hệ thống!");
        setLoading(false);
        return;
      }

      // 3. Create user in Firestore with PENDING status (waiting for admin approval)
      const newUserId = await userService.createUser(
        {
          email: email,
          name: capitalizedName,
          phoneNumber: null,
        },
        false, // Regular user, not admin
        null // Created by self (registration)
      );

      // 4. Send notification to Super Admin
      try {
        await notificationService.createNewUserRegistrationNotification(
          email,
          capitalizedName,
          newUserId
        );
        console.log("✅ Notification sent to Super Admin");
      } catch (notifError) {
        console.warn("⚠️ Failed to send notification to Super Admin:", notifError);
        // Don't fail registration if notification fails
      }

      // 5. Sign out the user (they need to wait for admin approval)
      await signOut(auth);
      localStorage.removeItem("isAuth");

      // 6. Show success message
      message.success({
        content: "Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt từ quản trị viên. Vui lòng đăng nhập sau khi được phê duyệt.",
        duration: 8,
      });

      // 7. Clear form and switch to login mode
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setIsRegisterMode(false);
      setError("");

      // Show info message
      setTimeout(() => {
        message.info({
          content: "Thông báo đã được gửi đến quản trị viên. Bạn sẽ nhận được email khi tài khoản được phê duyệt.",
          duration: 6,
        });
      }, 1000);

    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = "Đăng ký thất bại!";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email đã được sử dụng!";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ!";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Mật khẩu quá yếu! Cần ít nhất 6 ký tự.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      
      // Try to sign out if user was created but Firestore creation failed
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (signOutError) {
        console.error("Error signing out:", signOutError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập Google
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      localStorage.setItem("isAuth", "true");

      // Gọi callback onLogin nếu có
      if (onLogin) {
        const user = userCredential.user;
        const name = user.displayName || user.email.split("@")[0];
        onLogin(user.email, name);
      }

      navigate("/admin/users");
    } catch (error) {
      setError("Lỗi đăng nhập Google: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isRegisterMode ? handleRegister : handleLogin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Bên trái - Animation */}
        <div className="hidden md:flex flex-col items-center justify-center p-8">
          <div className="relative w-full max-w-md">
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-20 w-32 h-32 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl p-12 backdrop-blur-sm bg-opacity-90">
              <div className="flex flex-col items-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <Database className="text-white" size={64} />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Quản Trị Hệ Thống
                  </h2>
                  <p className="text-gray-600 mt-2">Quản lý gợi ý chi tiêu</p>
                </div>
                <div className="flex space-x-2 pt-4">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bên phải - Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {isRegisterMode ? "Tạo tài khoản mới" : "Chào mừng trở lại!"}
            </h1>
            <p className="text-gray-600">
              {isRegisterMode
                ? "Đăng ký để bắt đầu sử dụng hệ thống"
                : "Đăng nhập để tiếp tục quản trị hệ thống"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="admin@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isRegisterMode && (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  Quên mật khẩu?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading
                ? "Đang xử lý..."
                : isRegisterMode
                ? "Đăng ký"
                : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-600">hoặc</span>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGoogle className="text-red-500" size={20} />
            Đăng nhập với Google
          </button>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              {isRegisterMode ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <button
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="font-medium text-purple-600 hover:text-purple-700"
                disabled={loading}
              >
                {isRegisterMode ? "Đăng nhập ngay" : "Đăng ký ngay"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
