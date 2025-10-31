import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, User, Lock, Eye, EyeOff, Mail } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

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
      localStorage.setItem("isAuth", "true");

      // Gọi callback onLogin nếu có
      if (onLogin) {
        const name = userCredential.user.displayName || email.split("@")[0];
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        onLogin(email, capitalizedName);
      }

      navigate("/admin/users");
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      localStorage.setItem("isAuth", "true");

      // Gọi callback onLogin nếu có
      if (onLogin) {
        const name = email.split("@")[0];
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        onLogin(email, capitalizedName);
      }

      navigate("/admin/users");
    } catch (error) {
      let errorMessage = "Đăng ký thất bại!";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email đã được sử dụng!";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ!";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Mật khẩu quá yếu! Cần ít nhất 6 ký tự.";
      }

      setError(errorMessage);
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
