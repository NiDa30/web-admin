import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  Button,
  Space,
  Spin,
  Empty,
  Alert,
  Table,
  Tag,
  Tooltip,
  Tabs,
  message,
  Radio,
  Divider,
} from "antd";
import {
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  CalendarOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
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
  AreaChart,
  Area,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import customParseFormat from "dayjs/plugin/customParseFormat";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

// Configure dayjs plugins
dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale("vi");

import {
  getIncomeExpenseSummary,
  getCategoryStatistics,
  getDailyStatistics,
  getMonthlyStatistics,
  getYearlyStatistics,
  getPeriodComparison,
  getTopTransactions,
  exportTransactionsToCSV,
  getUserList,
  getCategoryList,
  formatCurrency,
} from "../services/reportsService";
import { isFirebaseReady } from "../firebase";
import "../assets/css/pages/ReportsPage.css";

const { RangePicker } = DatePicker;
const { Option } = Select;

const ReportsPage = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Date range
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [periodType, setPeriodType] = useState("month"); // 'day', 'week', 'month', 'year', 'custom'

  // Filters
  const [filters, setFilters] = useState({
    type: null, // 'INCOME', 'EXPENSE', null (all)
    userID: null,
    categoryID: null,
  });

  // Data
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    incomeCount: 0,
    expenseCount: 0,
    totalTransactions: 0,
    averageIncome: 0,
    averageExpense: 0,
  });

  const [categoryStats, setCategoryStats] = useState({
    income: { stats: [], totalAmount: 0 },
    expense: { stats: [], totalAmount: 0 },
  });

  const [dailyStats, setDailyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [topTransactions, setTopTransactions] = useState({
    income: [],
    expense: [],
  });

  // Filter options
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  // Chart colors
  const COLORS = [
    "#0D9488",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
    "#10B981",
    "#F97316",
    "#EF4444",
    "#14B8A6",
  ];

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [usersList, categoriesList] = await Promise.all([
          getUserList(),
          getCategoryList(),
        ]);
        setUsers(usersList);
        setCategories(categoriesList);
      } catch (err) {
        console.error("Error loading filter options:", err);
      }
    };

    if (isFirebaseReady()) {
      loadFilterOptions();
    }
  }, []);

  // Load report data
  useEffect(() => {
    if (isFirebaseReady() && dateRange[0] && dateRange[1]) {
      loadReportData();
    }
  }, [dateRange, periodType, filters]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = dateRange[0].toDate();
      const endDate = dateRange[1].toDate();

      let indexUrl = null;
      let hasIndexWarning = false;

      // Load all data with individual error handling
      // This allows partial data to load even if some queries fail due to index requirements
      
      try {
        const summaryData = await getIncomeExpenseSummary(
          startDate,
          endDate,
          filters
        );
        setSummary(summaryData);
      } catch (summaryError) {
        console.warn("Error loading summary:", summaryError);
        if (summaryError.indexUrl) {
          indexUrl = summaryError.indexUrl;
          hasIndexWarning = true;
        }
      }

      try {
        const [incomeCategoryStats, expenseCategoryStats] = await Promise.all([
          getCategoryStatistics(startDate, endDate, "INCOME", filters).catch(err => {
            console.warn("Error loading income category stats:", err);
            if (err.indexUrl && !indexUrl) indexUrl = err.indexUrl;
            return { stats: [], totalAmount: 0 };
          }),
          getCategoryStatistics(startDate, endDate, "EXPENSE", filters).catch(err => {
            console.warn("Error loading expense category stats:", err);
            if (err.indexUrl && !indexUrl) indexUrl = err.indexUrl;
            return { stats: [], totalAmount: 0 };
          }),
        ]);
        setCategoryStats({
          income: incomeCategoryStats,
          expense: expenseCategoryStats,
        });
      } catch (categoryError) {
        console.warn("Error loading category stats:", categoryError);
        if (categoryError.indexUrl && !indexUrl) {
          indexUrl = categoryError.indexUrl;
          hasIndexWarning = true;
        }
      }

      try {
        const dailyData = await getDailyStatistics(startDate, endDate, filters);
        setDailyStats(dailyData);
      } catch (dailyError) {
        console.warn("Error loading daily stats:", dailyError);
        if (dailyError.indexUrl && !indexUrl) {
          indexUrl = dailyError.indexUrl;
          hasIndexWarning = true;
        }
        setDailyStats([]);
      }

      try {
        const currentYear = new Date().getFullYear();
        const monthlyData = await getMonthlyStatistics(currentYear, filters);
        setMonthlyStats(monthlyData);
      } catch (monthlyError) {
        console.warn("Error loading monthly stats:", monthlyError);
        setMonthlyStats([]);
      }

      try {
        const currentYear = new Date().getFullYear();
        const yearlyData = await getYearlyStatistics(
          currentYear - 4,
          currentYear,
          filters
        );
        setYearlyStats(yearlyData);
      } catch (yearlyError) {
        console.warn("Error loading yearly stats:", yearlyError);
        setYearlyStats([]);
      }

      try {
        let previousStartDate, previousEndDate;

        if (periodType === "month") {
          previousEndDate = new Date(startDate);
          previousEndDate.setDate(previousEndDate.getDate() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setMonth(previousStartDate.getMonth() - 1);
          previousStartDate.setDate(1);
        } else if (periodType === "year") {
          previousEndDate = new Date(startDate);
          previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setMonth(0);
          previousStartDate.setDate(1);
        } else {
          previousEndDate = new Date(startDate);
          previousEndDate.setTime(previousEndDate.getTime() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setTime(
            previousStartDate.getTime() - (endDate - startDate)
          );
        }

        const comparisonData = await getPeriodComparison(
          startDate,
          endDate,
          previousStartDate,
          previousEndDate,
          filters
        );
        setComparison(comparisonData);
      } catch (comparisonError) {
        console.warn("Error loading comparison:", comparisonError);
        setComparison(null);
      }

      try {
        const [topIncome, topExpense] = await Promise.all([
          getTopTransactions(startDate, endDate, "INCOME", 10, filters).catch(() => []),
          getTopTransactions(startDate, endDate, "EXPENSE", 10, filters).catch(() => []),
        ]);
        setTopTransactions({
          income: topIncome,
          expense: topExpense,
        });
      } catch (topError) {
        console.warn("Error loading top transactions:", topError);
        setTopTransactions({ income: [], expense: [] });
      }

      // Show index warning if needed
      if (hasIndexWarning && indexUrl) {
        setError(
          <div>
            <p style={{ marginBottom: 8, fontWeight: "bold" }}>
              Firestoreインデックスが推奨されます
            </p>
            <p style={{ marginBottom: 8 }}>
              パフォーマンス向上のため、以下のリンクからインデックスを作成してください:
            </p>
            <a
              href={indexUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1890ff", textDecoration: "underline", wordBreak: "break-all" }}
            >
              {indexUrl}
            </a>
            <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
              現在はフォールバックモードで動作しています。インデックスを作成すると、より高速にデータを取得できます。
            </p>
            <p style={{ marginTop: 4, fontSize: 12, color: "#999" }}>
              インデックスの作成には数分かかる場合があります。
            </p>
          </div>
        );
        
        message.info({
          content: "データは読み込まれましたが、インデックスの作成を推奨します（パフォーマンス向上のため）。",
          duration: 6,
        });
      }
    } catch (err) {
      console.error("Error loading report data:", err);
      const errorMessage = err.message || "Lỗi không xác định";
      
      // Check if it's an index error
      if (errorMessage.includes("index") || errorMessage.includes("インデックス") || errorMessage.includes("requires an index")) {
        // Extract index URL from error message
        const indexUrlMatch = errorMessage.match(/https:\/\/[^\s\)]+/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[0] : null;
        
        if (indexUrl) {
          setError(
            <div>
              <p style={{ marginBottom: 8 }}>
                <strong>Firestoreインデックスが必要です</strong>
              </p>
              <p style={{ marginBottom: 8 }}>
                以下のリンクからインデックスを作成してください:
              </p>
              <a
                href={indexUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1890ff", textDecoration: "underline" }}
              >
                {indexUrl}
              </a>
              <p style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                インデックスの作成には数分かかる場合があります。作成後、ページをリフレッシュしてください。
              </p>
              <p style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
                注意: データが多い場合、インデックスなしでの取得には時間がかかる場合があります。
              </p>
            </div>
          );
        } else {
          setError(
            "Firestoreインデックスが必要です。Firebaseコンソールでインデックスを作成するか、数分待ってから再度お試しください。"
          );
        }
        
        message.warning({
          content: "Firestoreインデックスが必要です。データの取得に時間がかかる場合があります。",
          duration: 8,
        });
        
        // Note: The service will automatically fall back to in-memory filtering
        // so we don't need to retry here - it should work, just slower
      } else {
        setError(`Lỗi khi tải dữ liệu: ${errorMessage}`);
        message.error(`Lỗi khi tải dữ liệu: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
      setPeriodType("custom");
    }
  };

  const handlePeriodTypeChange = (type) => {
    setPeriodType(type);
    const now = dayjs();

    switch (type) {
      case "today":
        setDateRange([now.startOf("day"), now.endOf("day")]);
        break;
      case "week":
        setDateRange([now.startOf("week"), now.endOf("week")]);
        break;
      case "month":
        setDateRange([now.startOf("month"), now.endOf("month")]);
        break;
      case "year":
        setDateRange([now.startOf("year"), now.endOf("year")]);
        break;
      case "lastMonth":
        setDateRange([
          now.subtract(1, "month").startOf("month"),
          now.subtract(1, "month").endOf("month"),
        ]);
        break;
      case "lastYear":
        setDateRange([
          now.subtract(1, "year").startOf("year"),
          now.subtract(1, "year").endOf("year"),
        ]);
        break;
      default:
        break;
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const startDate = dateRange[0].toDate();
      const endDate = dateRange[1].toDate();
      await exportTransactionsToCSV(startDate, endDate, filters);
      message.success("Đã xuất dữ liệu thành công!");
    } catch (err) {
      console.error("Error exporting data:", err);
      message.error(`Lỗi khi xuất dữ liệu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "ALL" ? null : value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: null,
      userID: null,
      categoryID: null,
    });
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "N/A";
    return dayjs(date).format("DD/MM/YYYY");
  };

  // Calculate growth percentage
  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Chart data preparation
  const prepareChartData = (data, key) => {
    return data.map((item) => ({
      name: item.name || item.monthName || item.date || item.year,
      value: item.amount || item[key] || 0,
      count: item.count || 0,
      ...item,
    }));
  };

  return (
    <div className="reports-page">
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
        />
      )}

      {/* Header */}
      <Card
        title={
          <Space>
            <BarChartOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18 }}>Báo cáo và Thống kê</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadReportData}
              loading={loading}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={loading}
            >
              Xuất CSV
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {/* Period Selection */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <span>
                <CalendarOutlined /> Chọn kỳ:
              </span>
              <Radio.Group
                value={periodType}
                onChange={(e) => handlePeriodTypeChange(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="today">Hôm nay</Radio.Button>
                <Radio.Button value="week">Tuần này</Radio.Button>
                <Radio.Button value="month">Tháng này</Radio.Button>
                <Radio.Button value="year">Năm nay</Radio.Button>
                <Radio.Button value="lastMonth">Tháng trước</Radio.Button>
                <Radio.Button value="lastYear">Năm trước</Radio.Button>
                <Radio.Button value="custom">Tùy chọn</Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <span>Khoảng thời gian:</span>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                allowClear={false}
              />
            </Space>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <span>
                <FilterOutlined /> Bộ lọc:
              </span>
              <Space wrap>
                <Select
                  placeholder="Loại giao dịch"
                  style={{ width: 150 }}
                  value={filters.type || "ALL"}
                  onChange={(value) => handleFilterChange("type", value)}
                  allowClear
                >
                  <Option value="ALL">Tất cả</Option>
                  <Option value="INCOME">Thu nhập</Option>
                  <Option value="EXPENSE">Chi tiêu</Option>
                </Select>
                <Select
                  placeholder="Người dùng"
                  style={{ width: 150 }}
                  value={filters.userID || "ALL"}
                  onChange={(value) => handleFilterChange("userID", value)}
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  <Option value="ALL">Tất cả</Option>
                  {users.map((user) => (
                    <Option key={user.id} value={user.id}>
                      {user.name}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="Danh mục"
                  style={{ width: 150 }}
                  value={filters.categoryID || "ALL"}
                  onChange={(value) => handleFilterChange("categoryID", value)}
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  <Option value="ALL">Tất cả</Option>
                  {categories.map((category) => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
                <Button onClick={clearFilters} size="small">
                  Xóa bộ lọc
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Tổng thu nhập"
              value={formatCurrency(summary.totalIncome)}
              prefix={<RiseOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontSize: 18 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              {summary.incomeCount} giao dịch
            </div>
            {comparison && comparison.incomeGrowth !== 0 && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color:
                    comparison.incomeGrowth > 0 ? "#52c41a" : "#ff4d4f",
                }}
              >
                {comparison.incomeGrowth > 0 ? "↑" : "↓"}{" "}
                {Math.abs(comparison.incomeGrowth).toFixed(1)}% so với kỳ trước
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Tổng chi tiêu"
              value={formatCurrency(summary.totalExpense)}
              prefix={<FallOutlined style={{ color: "#ff4d4f" }} />}
              valueStyle={{ color: "#ff4d4f", fontSize: 18 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              {summary.expenseCount} giao dịch
            </div>
            {comparison && comparison.expenseGrowth !== 0 && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color:
                    comparison.expenseGrowth > 0 ? "#ff4d4f" : "#52c41a",
                }}
              >
                {comparison.expenseGrowth > 0 ? "↑" : "↓"}{" "}
                {Math.abs(comparison.expenseGrowth).toFixed(1)}% so với kỳ trước
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Số dư"
              value={formatCurrency(summary.balance)}
              prefix={<DollarOutlined />}
              valueStyle={{
                color: summary.balance >= 0 ? "#52c41a" : "#ff4d4f",
                fontSize: 18,
              }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              {summary.totalTransactions} giao dịch
            </div>
            {comparison && comparison.balanceGrowth !== 0 && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color:
                    comparison.balanceGrowth > 0 ? "#52c41a" : "#ff4d4f",
                }}
              >
                {comparison.balanceGrowth > 0 ? "↑" : "↓"}{" "}
                {Math.abs(comparison.balanceGrowth).toFixed(1)}% so với kỳ trước
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title="Trung bình/giao dịch"
              value={formatCurrency(
                summary.totalTransactions > 0
                  ? (summary.totalIncome + summary.totalExpense) /
                      summary.totalTransactions
                  : 0
              )}
              prefix={<DollarOutlined />}
              valueStyle={{ fontSize: 18 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
              Tổng: {summary.totalTransactions}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: "overview",
            label: (
              <Space>
                <BarChartOutlined />
                Tổng quan
              </Space>
            ),
          },
          {
            key: "categories",
            label: (
              <Space>
                <PieChartOutlined />
                Danh mục
              </Space>
            ),
          },
          {
            key: "trends",
            label: (
              <Space>
                <LineChartOutlined />
                Xu hướng
              </Space>
            ),
          },
          {
            key: "top",
            label: (
              <Space>
                <DollarOutlined />
                Top giao dịch
              </Space>
            ),
          },
        ]}
      />

      {/* Tab Content */}
      <Spin spinning={loading}>
        {activeTab === "overview" && (
          <Row gutter={[16, 16]}>
            {/* Income vs Expense Chart */}
            <Col xs={24} lg={12}>
              <Card title="Thu nhập vs Chi tiêu (Theo ngày)">
                {dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          if (!value) return "";
                          try {
                            const date = typeof value === "string" ? new Date(value) : value;
                            return dayjs(date).format("DD/MM");
                          } catch {
                            return value;
                          }
                        }}
                      />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(value) => {
                          if (!value) return "";
                          try {
                            const date = typeof value === "string" ? new Date(value) : value;
                            return dayjs(date).format("DD/MM/YYYY");
                          } catch {
                            return value;
                          }
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stackId="1"
                        stroke="#52c41a"
                        fill="#52c41a"
                        name="Thu nhập"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stackId="1"
                        stroke="#ff4d4f"
                        fill="#ff4d4f"
                        name="Chi tiêu"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Không có dữ liệu" />
                )}
              </Card>
            </Col>

            {/* Balance Chart */}
            <Col xs={24} lg={12}>
              <Card title="Số dư (Theo ngày)">
                {dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          if (!value) return "";
                          try {
                            const date = typeof value === "string" ? new Date(value) : value;
                            return dayjs(date).format("DD/MM");
                          } catch {
                            return value;
                          }
                        }}
                      />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(value) => {
                          if (!value) return "";
                          try {
                            const date = typeof value === "string" ? new Date(value) : value;
                            return dayjs(date).format("DD/MM/YYYY");
                          } catch {
                            return value;
                          }
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="#1890ff"
                        strokeWidth={2}
                        name="Số dư"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Không có dữ liệu" />
                )}
              </Card>
            </Col>

            {/* Monthly Comparison */}
            <Col xs={24}>
              <Card title="So sánh với kỳ trước">
                {comparison && (
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Thu nhập"
                          value={formatCurrency(comparison.current.totalIncome)}
                          suffix={
                            <Tag
                              color={
                                comparison.incomeGrowth >= 0
                                  ? "green"
                                  : "red"
                              }
                            >
                              {comparison.incomeGrowth >= 0 ? "+" : ""}
                              {comparison.incomeGrowth.toFixed(1)}%
                            </Tag>
                          }
                        />
                        <div style={{ fontSize: 12, color: "#999" }}>
                          Kỳ trước: {formatCurrency(comparison.previous.totalIncome)}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Chi tiêu"
                          value={formatCurrency(comparison.current.totalExpense)}
                          suffix={
                            <Tag
                              color={
                                comparison.expenseGrowth >= 0
                                  ? "red"
                                  : "green"
                              }
                            >
                              {comparison.expenseGrowth >= 0 ? "+" : ""}
                              {comparison.expenseGrowth.toFixed(1)}%
                            </Tag>
                          }
                        />
                        <div style={{ fontSize: 12, color: "#999" }}>
                          Kỳ trước: {formatCurrency(comparison.previous.totalExpense)}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Số dư"
                          value={formatCurrency(comparison.current.balance)}
                          suffix={
                            <Tag
                              color={
                                comparison.balanceGrowth >= 0
                                  ? "green"
                                  : "red"
                              }
                            >
                              {comparison.balanceGrowth >= 0 ? "+" : ""}
                              {comparison.balanceGrowth.toFixed(1)}%
                            </Tag>
                          }
                        />
                        <div style={{ fontSize: 12, color: "#999" }}>
                          Kỳ trước: {formatCurrency(comparison.previous.balance)}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Số giao dịch"
                          value={comparison.current.totalTransactions}
                          suffix={
                            <Tag
                              color={
                                comparison.transactionGrowth >= 0
                                  ? "green"
                                  : "red"
                              }
                            >
                              {comparison.transactionGrowth >= 0 ? "+" : ""}
                              {comparison.transactionGrowth.toFixed(1)}%
                            </Tag>
                          }
                        />
                        <div style={{ fontSize: 12, color: "#999" }}>
                          Kỳ trước: {comparison.previous.totalTransactions}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                )}
              </Card>
            </Col>
          </Row>
        )}

        {activeTab === "categories" && (
          <Row gutter={[16, 16]}>
            {/* Expense Categories */}
            <Col xs={24} lg={12}>
              <Card title="Chi tiêu theo danh mục">
                {categoryStats.expense.stats.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryStats.expense.stats.slice(0, 10)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name} ${percentage.toFixed(1)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {categoryStats.expense.stats.slice(0, 10).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <Divider />
                    <Row gutter={[8, 8]}>
                      {categoryStats.expense.stats.slice(0, 10).map((cat, index) => (
                        <Col xs={24} sm={12} key={cat.id}>
                          <Card size="small" hoverable>
                            <Space direction="vertical" size={4} style={{ width: "100%" }}>
                              <Space>
                                <span style={{ fontSize: 20 }}>{cat.icon}</span>
                                <strong>{cat.name}</strong>
                              </Space>
                              <div
                                style={{
                                  height: 8,
                                  backgroundColor: "#f0f0f0",
                                  borderRadius: 4,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${cat.percentage}%`,
                                    backgroundColor: COLORS[index % COLORS.length],
                                  }}
                                />
                              </div>
                              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 14, fontWeight: "bold" }}>
                                  {formatCurrency(cat.amount)}
                                </span>
                                <Tag color="blue">{cat.count} giao dịch</Tag>
                              </Space>
                              <div style={{ fontSize: 12, color: "#999" }}>
                                {cat.percentage.toFixed(1)}% tổng chi tiêu
                              </div>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </>
                ) : (
                  <Empty description="Không có dữ liệu chi tiêu" />
                )}
              </Card>
            </Col>

            {/* Income Categories */}
            <Col xs={24} lg={12}>
              <Card title="Thu nhập theo danh mục">
                {categoryStats.income.stats.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryStats.income.stats.slice(0, 10)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name} ${percentage.toFixed(1)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                        >
                          {categoryStats.income.stats.slice(0, 10).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <Divider />
                    <Row gutter={[8, 8]}>
                      {categoryStats.income.stats.slice(0, 10).map((cat, index) => (
                        <Col xs={24} sm={12} key={cat.id}>
                          <Card size="small" hoverable>
                            <Space direction="vertical" size={4} style={{ width: "100%" }}>
                              <Space>
                                <span style={{ fontSize: 20 }}>{cat.icon}</span>
                                <strong>{cat.name}</strong>
                              </Space>
                              <div
                                style={{
                                  height: 8,
                                  backgroundColor: "#f0f0f0",
                                  borderRadius: 4,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${cat.percentage}%`,
                                    backgroundColor: COLORS[index % COLORS.length],
                                  }}
                                />
                              </div>
                              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 14, fontWeight: "bold" }}>
                                  {formatCurrency(cat.amount)}
                                </span>
                                <Tag color="green">{cat.count} giao dịch</Tag>
                              </Space>
                              <div style={{ fontSize: 12, color: "#999" }}>
                                {cat.percentage.toFixed(1)}% tổng thu nhập
                              </div>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </>
                ) : (
                  <Empty description="Không có dữ liệu thu nhập" />
                )}
              </Card>
            </Col>
          </Row>
        )}

        {activeTab === "trends" && (
          <Row gutter={[16, 16]}>
            {/* Monthly Trends */}
            <Col xs={24}>
              <Card title="Xu hướng theo tháng (Năm hiện tại)">
                {monthlyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthName" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar
                        dataKey="totalIncome"
                        fill="#52c41a"
                        name="Thu nhập"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="totalExpense"
                        fill="#ff4d4f"
                        name="Chi tiêu"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Không có dữ liệu" />
                )}
              </Card>
            </Col>

            {/* Yearly Trends */}
            <Col xs={24}>
              <Card title="Xu hướng theo năm (5 năm gần nhất)">
                {yearlyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={yearlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="totalIncome"
                        stroke="#52c41a"
                        strokeWidth={3}
                        name="Thu nhập"
                        dot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalExpense"
                        stroke="#ff4d4f"
                        strokeWidth={3}
                        name="Chi tiêu"
                        dot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="#1890ff"
                        strokeWidth={3}
                        name="Số dư"
                        dot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Không có dữ liệu" />
                )}
              </Card>
            </Col>
          </Row>
        )}

        {activeTab === "top" && (
          <Row gutter={[16, 16]}>
            {/* Top Income Transactions */}
            <Col xs={24} lg={12}>
              <Card title="Top 10 Thu nhập cao nhất">
                {topTransactions.income.length > 0 ? (
                  <Table
                    dataSource={topTransactions.income}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: "STT",
                        key: "index",
                        width: 50,
                        render: (_, __, index) => index + 1,
                      },
                      {
                        title: "Danh mục",
                        dataIndex: "categoryName",
                        key: "category",
                        render: (name, record) => (
                          <Space>
                            <span style={{ fontSize: 18 }}>
                              {record.categoryIcon}
                            </span>
                            <span>{name}</span>
                          </Space>
                        ),
                      },
                      {
                        title: "Số tiền",
                        dataIndex: "amount",
                        key: "amount",
                        align: "right",
                        render: (amount) => (
                          <span style={{ fontWeight: "bold", color: "#52c41a" }}>
                            {formatCurrency(amount)}
                          </span>
                        ),
                      },
                      {
                        title: "Ngày",
                        dataIndex: "date",
                        key: "date",
                        render: (date) => formatDate(date),
                      },
                    ]}
                  />
                ) : (
                  <Empty description="Không có dữ liệu" />
                )}
              </Card>
            </Col>

            {/* Top Expense Transactions */}
            <Col xs={24} lg={12}>
              <Card title="Top 10 Chi tiêu cao nhất">
                {topTransactions.expense.length > 0 ? (
                  <Table
                    dataSource={topTransactions.expense}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: "STT",
                        key: "index",
                        width: 50,
                        render: (_, __, index) => index + 1,
                      },
                      {
                        title: "Danh mục",
                        dataIndex: "categoryName",
                        key: "category",
                        render: (name, record) => (
                          <Space>
                            <span style={{ fontSize: 18 }}>
                              {record.categoryIcon}
                            </span>
                            <span>{name}</span>
                          </Space>
                        ),
                      },
                      {
                        title: "Số tiền",
                        dataIndex: "amount",
                        key: "amount",
                        align: "right",
                        render: (amount) => (
                          <span style={{ fontWeight: "bold", color: "#ff4d4f" }}>
                            {formatCurrency(amount)}
                          </span>
                        ),
                      },
                      {
                        title: "Ngày",
                        dataIndex: "date",
                        key: "date",
                        render: (date) => formatDate(date),
                      },
                    ]}
                  />
                ) : (
                  <Empty description="Không có dữ liệu" />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Spin>
    </div>
  );
};

export default ReportsPage;
