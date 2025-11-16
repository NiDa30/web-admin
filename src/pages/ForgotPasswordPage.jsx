import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { message } from "antd";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const presetEmail = location.state?.email;
    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [location.state]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isValidEmail = useMemo(() => {
    if (!email) return false;
    // Simple robust validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const emailDomain = useMemo(() => {
    const parts = email.split("@");
    return parts.length === 2 ? parts[1].toLowerCase() : "";
  }, [email]);

  const providerLink = useMemo(() => {
    if (!emailDomain) return null;
    if (emailDomain.includes("gmail")) return "https://mail.google.com";
    if (emailDomain.includes("outlook") || emailDomain.includes("hotmail") || emailDomain.includes("live")) {
      return "https://outlook.live.com";
    }
    if (emailDomain.includes("yahoo")) return "https://mail.yahoo.com";
    return `https://${emailDomain}`;
  }, [emailDomain]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!isValidEmail) {
      message.warning({
        content: "Vui lòng nhập email hợp lệ để đặt lại mật khẩu.",
        duration: 4,
      });
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      message.success({
        content:
          "Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.",
        duration: 6,
      });
      setSent(true);
      setCooldown(30);
    } catch (err) {
      let errorMessage = "Không thể gửi email đặt lại mật khẩu.";
      if (err.code === "auth/user-not-found") {
        errorMessage = "Email không tồn tại trong hệ thống.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ!";
      } else if (err.message) {
        errorMessage = err.message;
      }
      message.error({ content: errorMessage, duration: 5 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Quay lại đăng nhập
          </button>

          {!sent ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Quên mật khẩu
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
              </p>

              <form onSubmit={handleSend} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 rounded-lg sm:rounded-xl focus:outline-none transition-colors text-sm sm:text-base ${
                        email && !isValidEmail ? "border-red-300 focus:border-red-400" : "border-gray-2 00 focus:border-purple-500"
                      }`}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  {email && !isValidEmail && (
                    <p className="mt-2 text-xs text-red-500">
                      Vui lòng nhập địa chỉ email hợp lệ.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValidEmail}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
                >
                  {loading ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                Đã gửi liên kết đặt lại
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Chúng tôi đã gửi liên kết đặt lại mật khẩu tới <span className="font-semibold text-gray-800">{email}</span>. Vui lòng kiểm tra hộp thư đến (và cả mục Spam).
              </p>
              <div className="space-y-4">
                {providerLink && (
                  <a
                    href={providerLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center bg-white border-2 border-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
                  >
                    Mở hộp thư: {emailDomain}
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || cooldown > 0}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại liên kết"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { mode: "login" } })}
                  className="w-full bg-white border-2 border-gray-200 text-gray-700 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm text-sm sm:text-base"
                >
                  Quay về đăng nhập
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;


