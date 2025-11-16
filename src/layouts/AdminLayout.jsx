import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {
  LayoutDashboard,
  Users,
  FolderTree,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Database,
  Lock,
  History,
} from "lucide-react";
import { SyncOutlined } from "@ant-design/icons";
import ChangePasswordModal from "../components/ChangePasswordModal";

function AdminLayout({ adminName, loginEmail, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const menuItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/admin/dashboard",
    },
    {
      key: "users",
      label: "Người dùng",
      icon: <Users size={20} />,
      path: "/admin/users",
    },
    {
      key: "categories",
      label: "Danh mục",
      icon: <FolderTree size={20} />,
      path: "/admin/categories",
    },
    {
      key: "reports",
      label: "Báo cáo",
      icon: <BarChart3 size={20} />,
      path: "/admin/reports",
    },
    {
      key: "config",
      label: "Cấu hình",
      icon: <Settings size={20} />,
      path: "/admin/config",
    },
    {
      key: "database",
      label: "Quản lý Database",
      icon: <Database size={20} />,
      path: "/admin/database",
    },
    {
      key: "activity-logs",
      label: "Nhật ký Hoạt động",
      icon: <History size={20} />,
      path: "/admin/activity-logs",
    },
    {
      key: "sync-logs",
      label: "Log Đồng bộ",
      icon: <SyncOutlined size={20} />,
      path: "/admin/sync-logs",
    },
  ];

  const handleMenuClick = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("isAuth");
      if (onLogout) onLogout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Lỗi khi đăng xuất!");
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-gradient-to-b from-purple-600 to-indigo-700 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <span className="text-xl sm:text-2xl">⚡</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">Admin Panel</h1>
              <p className="text-xs text-white/70 hidden sm:block">Family Budget</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleMenuClick(item.path)}
              className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base ${
                isActive(item.path)
                  ? "bg-white text-purple-600 shadow-lg"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="font-medium truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-white/10 space-y-1 sm:space-y-2 bg-gradient-to-b from-purple-600 to-indigo-700">
          <button
            onClick={() => {
              setIsPasswordModalOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-white/90 hover:bg-white/10 transition-all text-sm sm:text-base"
          >
            <Lock size={18} className="flex-shrink-0" />
            <span className="font-medium truncate">
              {auth.currentUser?.providerData?.some(
                (provider) => provider.providerId === "password"
              )
                ? "Đổi mật khẩu"
                : "Tạo mật khẩu"}
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-white/90 hover:bg-red-500/20 hover:text-red-200 transition-all text-sm sm:text-base"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span className="font-medium truncate">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen w-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 w-full">
          <div className="flex items-center justify-between px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <Menu size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
                  {menuItems.find((item) => isActive(item.path))?.label ||
                    "Dashboard"}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                  Quản lý gợi ý chi tiêu
                </p>
              </div>
            </div>

            {/* User Profile */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 rounded-xl hover:bg-gray-100 transition"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                  {adminName?.charAt(0) || "A"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate max-w-[120px] lg:max-w-none">
                    {adminName || "Admin"}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-none">
                    {loginEmail || "admin@example.com"}
                  </p>
                </div>
                <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {adminName || "Admin"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {loginEmail || "admin@example.com"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsPasswordModalOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Lock size={16} />
                    {auth.currentUser?.providerData?.some(
                      (provider) => provider.providerId === "password"
                    )
                      ? "Đổi mật khẩu"
                      : "Tạo mật khẩu"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 w-full overflow-x-hidden">
          <div className="w-full max-w-full">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-3 sm:py-4 px-4 sm:px-8 w-full">
          <p className="text-center text-xs sm:text-sm text-gray-500">
            © 2025 Family Budget Admin. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

export default AdminLayout;
