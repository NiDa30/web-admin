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
  sendEmailVerification,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { COLLECTIONS } from "../constants/collections";
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
        isSuperAdminEmail,
      });

      // Check if user exists in Firestore and their status
      let userData = await userService.getUserByEmail(email);

      console.log("🔍 Login attempt - User data:", {
        email,
        userData: userData
          ? {
              id: userData.id,
              email: userData.email,
              accountStatus: userData.accountStatus,
              role: userData.role,
              isSuperAdmin: userData.isSuperAdmin,
            }
          : null,
      });

      // If Super Admin doesn't exist in Firestore, create them automatically
      if (!userData && isSuperAdminEmail) {
        console.log(
          "🆕 Super Admin not found in Firestore, creating automatically..."
        );
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
          const { doc, updateDoc, Timestamp } = await import(
            "firebase/firestore"
          );
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
          setError(
            "Không thể tạo tài khoản Super Admin. Vui lòng liên hệ quản trị viên."
          );
          setLoading(false);
          return;
        }
      }

      if (!userData) {
        // User doesn't exist in Firestore and is not Super Admin, sign out and show error
        console.error("❌ User not found in Firestore");
        await signOut(auth);
        setError(
          "Tài khoản chưa được đăng ký trong hệ thống. Vui lòng đăng ký trước."
        );
        setLoading(false);
        return;
      }

      // Check account status - Default to ACTIVE if not set (for backward compatibility)
      // Super Admin always allowed to login regardless of status
      const accountStatus = userData.accountStatus || "ACTIVE";
      const isSuperAdmin = isSuperAdminEmail || userData.isSuperAdmin === true;
      const isApprovedByAdmin = accountStatus === "ACTIVE";

      console.log("🔍 Account status check:", {
        email,
        accountStatus,
        isSuperAdmin: isSuperAdmin,
        isApprovedByAdmin: isApprovedByAdmin,
        isPending: accountStatus === "PENDING",
        isLocked: accountStatus === "LOCKED",
        isActive: accountStatus === "ACTIVE",
      });

      // Check email verification - Skip if user is approved by admin (ACTIVE status) or Super Admin
      if (
        !userCredential.user.emailVerified &&
        !isSuperAdmin &&
        !isApprovedByAdmin
      ) {
        try {
          await sendEmailVerification(userCredential.user);
          await signOut(auth);
          setError(
            "Vui lòng xác nhận email của bạn. Chúng tôi đã gửi email xác nhận đến " +
              email +
              ". Sau khi xác nhận, bạn có thể đăng nhập lại."
          );
          message.info({
            content:
              "Email xác nhận đã được gửi. Vui lòng kiểm tra hộp thư của bạn.",
            duration: 5,
          });
        } catch (verificationError) {
          console.error("Error sending verification email:", verificationError);
          await signOut(auth);
          setError("Không thể gửi email xác nhận. Vui lòng thử lại sau.");
        }
        setLoading(false);
        return;
      }

      // Super Admin can always login, skip status checks
      if (!isSuperAdmin) {
        // Require ADMIN role granted by Super Admin
        if (!userData.role || userData.role !== "ADMIN") {
          console.warn("⚠️ User is not ADMIN, blocking login");
          await signOut(auth);
          setError(
            "Tài khoản của bạn chưa được cấp quyền quản trị. Vui lòng liên hệ Super Admin."
          );
          setLoading(false);
          return;
        }

        if (accountStatus === "PENDING") {
          console.warn("⚠️ Account is PENDING, blocking login");
          await signOut(auth);
          setError(
            "Tài khoản của bạn đang chờ phê duyệt từ quản trị viên. Vui lòng thử lại sau."
          );
          setLoading(false);
          return;
        }

        if (accountStatus === "LOCKED") {
          console.warn("⚠️ Account is LOCKED, blocking login");
          await signOut(auth);
          setError(
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
          );
          setLoading(false);
          return;
        }

        // Only allow ACTIVE accounts (or accounts without status set)
        if (accountStatus !== "ACTIVE") {
          console.error("❌ Invalid account status:", accountStatus);
          await signOut(auth);
          setError(
            "Tài khoản của bạn không thể đăng nhập. Vui lòng liên hệ quản trị viên."
          );
          setLoading(false);
          return;
        }
      } else {
        console.log("✅ Super Admin login - skipping status checks");
        // Ensure Super Admin has ACTIVE status
        if (accountStatus !== "ACTIVE") {
          try {
            const { doc, updateDoc, Timestamp } = await import(
              "firebase/firestore"
            );
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
            console.warn(
              "⚠️ Failed to update Super Admin status:",
              updateError
            );
          }
        }
      }

      console.log("✅ Account status is ACTIVE, proceeding with login");

      // Update last login time
      try {
        const { doc, updateDoc, Timestamp } = await import(
          "firebase/firestore"
        );
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
        const name =
          userData.name ||
          userCredential.user.displayName ||
          email.split("@")[0];
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
      const user = userCredential.user;

      const userName = email.split("@")[0];
      const capitalizedName =
        userName.charAt(0).toUpperCase() + userName.slice(1);

      // 2. Send email verification
      try {
        await sendEmailVerification(user);
        console.log("✅ Verification email sent");
      } catch (verificationError) {
        console.error("Error sending verification email:", verificationError);
        // Continue with registration even if verification email fails
      }

      // 3. Check if user already exists in Firestore
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        // User already exists in Firestore, sign out and show error
        await signOut(auth);
        setError("Email đã được sử dụng trong hệ thống!");
        setLoading(false);
        return;
      }

      // 4. Create user in Firestore with PENDING status (waiting for admin approval)
      const newUserId = await userService.createUser(
        {
          email: email,
          name: capitalizedName,
          phoneNumber: null,
        },
        false, // Regular user, not admin
        null // Created by self (registration)
      );

      // 5. Send notification to Super Admin
      try {
        await notificationService.createNewUserRegistrationNotification(
          email,
          capitalizedName,
          newUserId
        );
        console.log("✅ Notification sent to Super Admin");
      } catch (notifError) {
        console.warn(
          "⚠️ Failed to send notification to Super Admin:",
          notifError
        );
        // Don't fail registration if notification fails
      }

      // 6. Sign out the user (they need to verify email and wait for admin approval)
      await signOut(auth);
      localStorage.removeItem("isAuth");

      // 7. Show success message
      message.success({
        content:
          "Đăng ký thành công! Vui lòng xác nhận email của bạn và chờ phê duyệt từ quản trị viên.",
        duration: 8,
      });

      // 8. Clear form and switch to login mode
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setIsRegisterMode(false);
      setError("");

      // 9. Show info message
      setTimeout(() => {
        message.info({
          content:
            "Email xác nhận đã được gửi đến " +
            email +
            ". Vui lòng kiểm tra hộp thư và xác nhận email trước khi đăng nhập.",
          duration: 8,
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
      const user = userCredential.user;

      // Check if this is Super Admin email
      const isSuperAdminEmail = userService.isSuperAdminEmail(user.email);

      // Check if user exists in Firestore
      let userData = await userService.getUserByEmail(user.email);

      // If Super Admin doesn't exist in Firestore, create them automatically
      if (!userData && isSuperAdminEmail) {
        console.log(
          "🆕 Google Login - Super Admin not found, creating automatically..."
        );
        try {
          const newUserId = await userService.createUser(
            {
              email: user.email,
              name: user.displayName || user.email.split("@")[0],
              phoneNumber: null,
            },
            true, // isAdmin = true
            null // createdBy = null (system created)
          );

          // Update to set isSuperAdmin flag and ensure ACTIVE status
          if (newUserId) {
            try {
              const { doc, updateDoc, Timestamp } = await import(
                "firebase/firestore"
              );
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
              userData = await userService.getUserByEmail(user.email);
              console.log("✅ Google Login - Super Admin created successfully");
            } catch (updateError) {
              console.warn(
                "⚠️ Google Login - Error updating Super Admin:",
                updateError
              );
            }
          }
        } catch (createError) {
          console.error(
            "❌ Google Login - Error creating Super Admin:",
            createError
          );
        }
      }

      // Check if user exists and is active
      if (!userData && !isSuperAdminEmail) {
        await signOut(auth);
        setError(
          "Tài khoản chưa được đăng ký trong hệ thống. Vui lòng đăng ký trước."
        );
        setLoading(false);
        return;
      }

      // Check account status
      if (userData) {
        const accountStatus = userData.accountStatus || "ACTIVE";
        const isSuperAdmin =
          isSuperAdminEmail || userData.isSuperAdmin === true;
        const isApprovedByAdmin = accountStatus === "ACTIVE";

        // Check email verification - Skip if user is approved by admin (ACTIVE status) or Super Admin
        if (!user.emailVerified && !isSuperAdmin && !isApprovedByAdmin) {
          try {
            await sendEmailVerification(user);
            await signOut(auth);
            setError(
              "Vui lòng xác nhận email của bạn. Chúng tôi đã gửi email xác nhận đến " +
                user.email +
                ". Sau khi xác nhận, bạn có thể đăng nhập lại."
            );
            message.info({
              content:
                "Email xác nhận đã được gửi. Vui lòng kiểm tra hộp thư của bạn.",
              duration: 5,
            });
          } catch (verificationError) {
            console.error(
              "Error sending verification email:",
              verificationError
            );
            await signOut(auth);
            setError("Không thể gửi email xác nhận. Vui lòng thử lại sau.");
          }
          setLoading(false);
          return;
        }

        if (!isSuperAdmin && accountStatus !== "ACTIVE") {
          await signOut(auth);
          if (accountStatus === "PENDING") {
            setError("Tài khoản của bạn đang chờ phê duyệt từ quản trị viên.");
          } else if (accountStatus === "LOCKED") {
            setError(
              "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
            );
          } else {
            setError(
              "Tài khoản của bạn không thể đăng nhập. Vui lòng liên hệ quản trị viên."
            );
          }
          setLoading(false);
          return;
        }

        // Update last login time
        try {
          const { doc, updateDoc, Timestamp } = await import(
            "firebase/firestore"
          );
          const { db } = await import("../firebase");
          const { COLLECTIONS } = await import("../constants/collections");
          const userRef = doc(db, COLLECTIONS.USERS, userData.id);
          await updateDoc(userRef, {
            lastLoginTime: Timestamp.now(),
          });
        } catch (updateError) {
          console.warn("⚠️ Failed to update last login time:", updateError);
        }
      }

      // Set authentication flag
      localStorage.setItem("isAuth", "true");

      // Gọi callback onLogin nếu có
      if (onLogin) {
        const name = user.displayName || user.email.split("@")[0];
        onLogin(user.email, name);
      }

      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Google login error:", error);
      let errorMessage = "Lỗi đăng nhập Google";

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Đăng nhập bị hủy. Vui lòng thử lại.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup bị chặn. Vui lòng cho phép popup và thử lại.";
      } else if (error.message) {
        errorMessage = "Lỗi đăng nhập Google: " + error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isRegisterMode ? handleRegister : handleLogin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-center">
        {/* Bên trái - Animation */}
        <div className="hidden md:flex flex-col items-center justify-center p-8">
          <div className="relative w-full max-w-md">
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-20 w-32 h-32 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 lg:p-12 backdrop-blur-sm bg-opacity-90">
              <div className="flex flex-col items-center space-y-4 sm:space-y-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <Database
                    className="text-white"
                    size={48}
                    style={{ width: "48px", height: "48px" }}
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Quản Trị Hệ Thống
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    Quản lý gợi ý chi tiêu
                  </p>
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
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-12 w-full">
          <div className="mb-6 sm:mb-8 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {isRegisterMode ? "Tạo tài khoản mới" : "Chào mừng trở lại!"}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {isRegisterMode
                ? "Đăng ký để bắt đầu sử dụng hệ thống"
                : "Đăng nhập để tiếp tục quản trị hệ thống"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs sm:text-sm break-words">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                  style={{ width: "18px", height: "18px" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm sm:text-base"
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
                  className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                  style={{ width: "18px", height: "18px" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm sm:text-base"
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
                    className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm sm:text-base"
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
                <button
                  type="button"
                  onClick={() =>
                    navigate("/forgot-password", { state: { email } })
                  }
                  disabled={loading}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 disabled:opacity-60"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
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
            className="mt-4 w-full flex items-center justify-center gap-2 sm:gap-3 bg-white border-2 border-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
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
