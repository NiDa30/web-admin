import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import FamilyDataTable from "../components/FamilyDataTable";

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const monthlyData = [
    { month: "T4", amount: 45000000 },
    { month: "T5", amount: 58000000 },
    { month: "T6", amount: 67000000 },
    { month: "T7", amount: 82000000 },
    { month: "T8", amount: 95000000 },
    { month: "T9", amount: 110000000 },
  ];

  const categoryStats = [
    { name: "Ăn uống", value: 35, amount: 38500000 },
    { name: "Di chuyển", value: 20, amount: 22000000 },
    { name: "Giải trí", value: 15, amount: 16500000 },
    { name: "Giáo dục", value: 12, amount: 13200000 },
    { name: "Y tế", value: 10, amount: 11000000 },
    { name: "Khác", value: 8, amount: 8800000 },
  ];

  const COLORS = [
    "#0D9488",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Báo cáo tổng hợp
      </h2>

      {/* Tabs Navigation */}
      <div className="mb-6 flex gap-3 border-b border-gray-200">
        <button
          className={`pb-3 px-4 font-semibold transition-all ${
            activeTab === "dashboard"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard Thống kê
        </button>
        <button
          className={`pb-3 px-4 font-semibold transition-all ${
            activeTab === "data"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("data")}
        >
          📋 Dữ liệu Chi tiết
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Tổng chi tiêu theo tháng (VNĐ)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar
                  dataKey="amount"
                  fill="#10B981"
                  name="Tổng chi tiêu"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">
                Top danh mục chi tiêu
              </h3>
              <div className="space-y-3">
                {categoryStats.map((cat, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {cat.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${cat.value}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Thống kê hoạt động</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    Tổng số gia đình
                  </span>
                  <span className="text-xl font-bold text-blue-600">312</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    Giao dịch hôm nay
                  </span>
                  <span className="text-xl font-bold text-purple-600">247</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    Người dùng hoạt động
                  </span>
                  <span className="text-xl font-bold text-green-600">289</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    Trung bình/gia đình
                  </span>
                  <span className="text-xl font-bold text-orange-600">
                    {formatCurrency(352564)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "data" && (
        <div>
          <FamilyDataTable />
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
