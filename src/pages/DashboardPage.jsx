import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Empty,
  Button,
  Alert,
  Tag,
  Space,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  TransactionOutlined,
  DollarOutlined,
  LockOutlined,
  ReloadOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getDashboardData } from "../services/dashboardService";
import { isFirebaseReady } from "../firebase";
import "../assets/css/pages/DashboardPage.css";

// Helper Functions
const formatCurrency = (amount) => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString("vi-VN");
};

const formatCount = (count) => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      newUsers: 0,
      transactionsCount: 0,
      totalExpense: 0,
      lockedAccounts: 0,
      usersGrowth: 0,
      txnGrowth: 0,
    },
    charts: {
      monthlyTrends: [],
      categoryStats: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart Colors
  const COLORS = [
    "#0D9488",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
  ];

  // Load Dashboard Data
  useEffect(() => {
    if (!isFirebaseReady()) {
      setError("Firebase chưa sẵn sàng. Vui lòng kiểm tra cấu hình.");
      setLoading(false);
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Loading dashboard data...");
      const data = await getDashboardData();
      console.log("✅ Dashboard data loaded:", data);

      setDashboardData(data);
    } catch (err) {
      console.error("❌ Error loading dashboard:", err);
      setError(`Không thể tải dữ liệu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { stats, charts } = dashboardData;

  // Render Loading
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải dữ liệu dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Error Alert */}
      {error && (
        <Alert
          message="Lỗi kết nối"
          description={error}
          type="error"
          icon={<WarningOutlined />}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={loadDashboard}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Page Header */}
      <Card
        title={
          <Space>
            <PieChartOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18 }}>Tổng quan hệ thống</span>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDashboard}
            loading={loading}
          >
            Làm mới
          </Button>
        }
        style={{ marginBottom: 24 }}
      />

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Tổng người dùng"
              value={formatCount(stats.totalUsers)}
              prefix={<UserOutlined style={{ color: "#0D9488" }} />}
              suffix={
                stats.usersGrowth !== 0 && (
                  <Tag
                    color={stats.usersGrowth > 0 ? "green" : "red"}
                    icon={
                      stats.usersGrowth > 0 ? (
                        <RiseOutlined />
                      ) : (
                        <FallOutlined />
                      )
                    }
                  >
                    {Math.abs(stats.usersGrowth)}%
                  </Tag>
                )
              }
              valueStyle={{ color: "#0D9488" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              So với tháng trước
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Giao dịch/tháng"
              value={formatCount(stats.transactionsCount)}
              prefix={<TransactionOutlined style={{ color: "#8B5CF6" }} />}
              suffix={
                stats.txnGrowth !== 0 && (
                  <Tag
                    color={stats.txnGrowth > 0 ? "green" : "red"}
                    icon={
                      stats.txnGrowth > 0 ? <RiseOutlined /> : <FallOutlined />
                    }
                  >
                    {Math.abs(stats.txnGrowth)}%
                  </Tag>
                )
              }
              valueStyle={{ color: "#8B5CF6" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              So với tháng trước
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Tổng chi tiêu"
              value={formatCurrency(stats.totalExpense)}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              VNĐ trong tháng này
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Tài khoản bị khóa"
              value={stats.lockedAccounts}
              prefix={<LockOutlined style={{ color: "#ff4d4f" }} />}
              suffix={
                stats.totalUsers > 0 && (
                  <span style={{ fontSize: 12, color: "#999" }}>
                    (
                    {((stats.lockedAccounts / stats.totalUsers) * 100).toFixed(
                      1
                    )}
                    %)
                  </span>
                )
              }
              valueStyle={{ color: "#ff4d4f" }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              Của tổng số người dùng
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        {/* Line Chart */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <LineChartOutlined style={{ color: "#1890ff" }} />
                Xu hướng tăng trưởng
              </Space>
            }
            className="chart-card"
          >
            {charts.monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#8c8c8c" />
                  <YAxis stroke="#8c8c8c" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#0D9488"
                    strokeWidth={2}
                    name="Người dùng"
                    dot={{ fill: "#0D9488", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="Giao dịch"
                    dot={{ fill: "#8B5CF6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                description="Chưa có dữ liệu xu hướng"
                style={{ padding: "60px 0" }}
              />
            )}
          </Card>
        </Col>

        {/* Pie Chart */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <PieChartOutlined style={{ color: "#1890ff" }} />
                Phân bố chi tiêu theo danh mục
              </Space>
            }
            className="chart-card"
          >
            {charts.categoryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={charts.categoryStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {charts.categoryStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                    }}
                    formatter={(value, name, props) => [
                      `${value}% (${formatCurrency(props.payload.amount)})`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                description="Chưa có dữ liệu chi tiêu"
                style={{ padding: "60px 0" }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Category Details */}
      <Card
        title={
          <Space>
            <PieChartOutlined style={{ color: "#1890ff" }} />
            Thống kê chi tiết danh mục
          </Space>
        }
        style={{ marginTop: 16 }}
        className="category-details-card"
      >
        {charts.categoryStats.length > 0 ? (
          <>
            <div style={{ marginBottom: 16, color: "#8c8c8c" }}>
              Hiển thị {charts.categoryStats.length} danh mục chi tiêu trong
              tháng này
            </div>
            <Row gutter={[16, 16]}>
              {charts.categoryStats.map((category, index) => (
                <Col xs={24} sm={12} lg={8} key={category.id || `cat-${index}`}>
                  <Card
                    size="small"
                    hoverable
                    style={{
                      borderLeft: `4px solid ${COLORS[index % COLORS.length]}`,
                    }}
                  >
                    <Row align="middle" justify="space-between">
                      <Col flex="auto">
                        <Space direction="vertical" size={4}>
                          <Space>
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <strong>{category.name || "Không rõ"}</strong>
                          </Space>
                          <Tag color="blue" style={{ marginLeft: 20 }}>
                            {category.count || 0} giao dịch
                          </Tag>
                        </Space>
                      </Col>
                      <Col>
                        <Space direction="vertical" size={4} align="end">
                          <Tooltip title="Tỷ lệ phần trăm">
                            <Tag
                              color={COLORS[index % COLORS.length]}
                              style={{ fontSize: 16, fontWeight: "bold" }}
                            >
                              {category.value || 0}%
                            </Tag>
                          </Tooltip>
                          <Tooltip title="Tổng chi tiêu">
                            <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                              {formatCurrency(category.amount || 0)}
                            </span>
                          </Tooltip>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <Empty
            description={
              <Space direction="vertical">
                <span>Chưa có dữ liệu danh mục</span>
                <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                  Thêm giao dịch chi tiêu để xem phân bổ theo danh mục
                </span>
              </Space>
            }
            style={{ padding: "40px 0" }}
          />
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
