// src/components/ExpensesDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import csvDataService from "../services/csvDataService";
import "../styles/Dashboard.css";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
];

const ExpensesDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const data = await csvDataService.getExpensesStatistics();
      setStats(data);
    } catch (error) {
      console.error("Lỗi khi tải thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Đang tải thống kê...</div>;
  }

  if (!stats) {
    return <div className="error-message">Không thể tải dữ liệu thống kê</div>;
  }

  // Chuẩn bị dữ liệu cho biểu đồ tròn
  const pieData = Object.entries(stats.expensesByCategory).map(
    ([key, value]) => ({
      name: getCategoryName(key),
      value: value,
    })
  );

  // Chuẩn bị dữ liệu cho biểu đồ cột
  const barData = [
    { name: "Thực phẩm", value: stats.averageFoodExpenditure },
    { name: "Giáo dục", value: stats.averageEducationExpenditure },
    { name: "Y tế", value: stats.averageMedical },
    { name: "Di chuyển", value: stats.averageTransportation },
  ];

  return (
    <div className="dashboard-container">
      <h1>📈 Dashboard Phân tích Chi tiêu Hộ Gia đình</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏘️</div>
          <div className="stat-content">
            <h3>Tổng số hộ</h3>
            <p className="stat-value">
              {stats.totalHouseholds.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🍲</div>
          <div className="stat-content">
            <h3>TB Chi tiêu Thực phẩm</h3>
            <p className="stat-value">
              {formatCurrency(stats.averageFoodExpenditure)}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>TB Chi tiêu Giáo dục</h3>
            <p className="stat-value">
              {formatCurrency(stats.averageEducationExpenditure)}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-content">
            <h3>TB Chi tiêu Di chuyển</h3>
            <p className="stat-value">
              {formatCurrency(stats.averageTransportation)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Pie Chart */}
        <div className="chart-card">
          <h3>📊 Phân bổ Chi tiêu theo Danh mục</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="chart-card">
          <h3>📊 So sánh Chi tiêu Trung bình</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

function getCategoryName(key) {
  const names = {
    food: "Thực phẩm",
    education: "Giáo dục",
    medical: "Y tế",
    transportation: "Di chuyển",
    communication: "Liên lạc",
    housing: "Nhà ở & Nước",
  };
  return names[key] || key;
}

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default ExpensesDashboard;
