import React, { useState, useEffect } from "react";
import {
  Card,
  Select,
  Button,
  Space,
  Spin,
  message,
  Statistic,
  Row,
  Col,
  Alert,
  Dropdown,
  Modal,
  Upload,
  Tabs,
} from "antd";
import {
  DatabaseOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExportOutlined,
  ImportOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  DownloadOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  DownOutlined,
  CodeOutlined,
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
} from "recharts";
import { COLLECTIONS, getAllCollections } from "../constants/collections";
import { createCollectionService } from "../services/collectionService";
import CollectionDataTable from "../components/CollectionDataTable";
import { isFirebaseReady } from "../firebase";
import { exportCollectionToCSV, downloadCSV } from "../utils/csvExportService";
import { exportCollectionToPDF } from "../utils/pdfExportService";
import {
  generateExcelTemplate,
  generateCSVTemplate,
  readExcelFile,
  readCSVFile,
  validateImportedData,
} from "../utils/excelImportService";
import "../assets/css/pages/DatabaseManagementPage.css";

const { Option } = Select;

function DatabaseManagementPage() {
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);
  const [collectionData, setCollectionData] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [activeChartTab, setActiveChartTab] = useState("bar");

  useEffect(() => {
    if (!isFirebaseReady()) {
      setError("Firebase chưa sẵn sàng. Vui lòng kiểm tra cấu hình.");
      return;
    }

    // Initialize collections and set default collection
    const collectionList = getAllCollections();
    if (collectionList.length > 0 && !selectedCollection) {
      setSelectedCollection(collectionList[0]);
    }
  }, [selectedCollection]);

  // Load collection stats
  useEffect(() => {
    if (selectedCollection) {
      loadCollectionStats(selectedCollection);
    }
  }, [selectedCollection]);

  const loadCollectionStats = async (collectionName) => {
    try {
      setLoading(true);
      const service = createCollectionService(collectionName);
      const data = await service.getAll();

      setCollectionData(data);

      setStats((prev) => ({
        ...prev,
        [collectionName]: {
          total: data.length,
          lastUpdated: new Date().toLocaleString("vi-VN"),
        },
      }));

      // Prepare chart data
      prepareChartData(data, collectionName);
    } catch (error) {
      console.error("Error loading stats:", error);
      message.error(`Lỗi khi tải thống kê: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data based on collection type
  const prepareChartData = (data, collectionName) => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    try {
      // For TRANSACTIONS collection
      if (
        collectionName === "TRANSACTIONS" ||
        collectionName === "TRANSACTION"
      ) {
        const chartDataMap = {};
        data.forEach((item) => {
          const date = item.date
            ? new Date(item.date).toLocaleDateString("vi-VN")
            : "Unknown";
          const amount = item.amount || 0;
          const type = item.type || "EXPENSE";

          if (!chartDataMap[date]) {
            chartDataMap[date] = { date, income: 0, expense: 0 };
          }

          if (type === "INCOME") {
            chartDataMap[date].income += amount;
          } else {
            chartDataMap[date].expense += amount;
          }
        });

        setChartData(Object.values(chartDataMap).slice(0, 30)); // Last 30 days
        return;
      }

      // For CATEGORIES collection
      if (
        collectionName === "CATEGORIES" ||
        collectionName === "CATEGORIES_DEFAULT"
      ) {
        const categoryCount = {};
        data.forEach((item) => {
          const type = item.type || "EXPENSE";
          categoryCount[type] = (categoryCount[type] || 0) + 1;
        });

        setChartData(
          Object.entries(categoryCount).map(([name, value]) => ({
            name,
            value,
          }))
        );
        return;
      }

      // Default: count by first string field
      const firstStringField = Object.keys(data[0]).find(
        (key) => typeof data[0][key] === "string" && data[0][key]
      );

      if (firstStringField) {
        const countMap = {};
        data.forEach((item) => {
          const value = item[firstStringField] || "Unknown";
          countMap[value] = (countMap[value] || 0) + 1;
        });

        setChartData(
          Object.entries(countMap)
            .slice(0, 10)
            .map(([name, value]) => ({
              name: name.length > 20 ? name.substring(0, 20) + "..." : name,
              value,
            }))
        );
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error("Error preparing chart data:", error);
      setChartData([]);
    }
  };

  const handleCollectionChange = (collectionName) => {
    setSelectedCollection(collectionName);
    setError(null);
  };

  const handleRefresh = async () => {
    if (selectedCollection) {
      try {
        await loadCollectionStats(selectedCollection);
        // Don't show message for automatic refreshes after delete
      } catch (error) {
        console.error("Error refreshing:", error);
      }
    }
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    if (!selectedCollection) {
      message.warning("Vui lòng chọn collection trước");
      return;
    }

    try {
      setExportLoading(true);
      const csvContent = await exportCollectionToCSV(selectedCollection);

      if (!csvContent) {
        message.warning("Không có dữ liệu để xuất");
        return;
      }

      const filename = `${selectedCollection}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      downloadCSV(csvContent, filename);
      message.success("Đã xuất file CSV thành công!");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      message.error(`Lỗi khi xuất CSV: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle PDF Export
  const handleExportPDF = async () => {
    if (!selectedCollection || !collectionData.length) {
      message.warning("Vui lòng chọn collection và đảm bảo có dữ liệu");
      return;
    }

    try {
      setExportLoading(true);
      const headers = Object.keys(collectionData[0]);
      await exportCollectionToPDF(collectionData, selectedCollection, headers);
      message.success("Đã xuất file PDF thành công!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      message.error(`Lỗi khi xuất PDF: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle JSON Export
  const handleExportJSON = async () => {
    if (!selectedCollection) {
      message.warning("Vui lòng chọn collection trước");
      return;
    }

    try {
      setExportLoading(true);

      if (!collectionData || collectionData.length === 0) {
        message.warning("Không có dữ liệu để xuất");
        return;
      }

      // Create JSON content
      const jsonContent = JSON.stringify(collectionData, null, 2);

      // Create blob and download
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedCollection}_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success("Đã xuất file JSON thành công!");
    } catch (error) {
      console.error("Error exporting JSON:", error);
      message.error(`Lỗi khi xuất JSON: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle Excel Template Download
  const handleDownloadExcelTemplate = async () => {
    if (!selectedCollection || !collectionData.length) {
      message.warning("Vui lòng chọn collection và đảm bảo có dữ liệu");
      return;
    }

    try {
      setExportLoading(true);
      const headers = Object.keys(collectionData[0]);
      await generateExcelTemplate(headers, selectedCollection);
      message.success("Đã tải file Excel mẫu thành công!");
    } catch (error) {
      console.error("Error generating template:", error);
      message.error(`Lỗi khi tạo template: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle CSV Template Download
  const handleDownloadCSVTemplate = async () => {
    if (!selectedCollection || !collectionData.length) {
      message.warning("Vui lòng chọn collection và đảm bảo có dữ liệu");
      return;
    }

    try {
      setExportLoading(true);
      const headers = Object.keys(collectionData[0]);
      await generateCSVTemplate(headers, selectedCollection);
      message.success("Đã tải file CSV mẫu thành công!");
    } catch (error) {
      console.error("Error generating CSV template:", error);
      message.error(`Lỗi khi tạo template CSV: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle JSON Template Download
  const handleDownloadJSONTemplate = async () => {
    if (!selectedCollection || !collectionData.length) {
      message.warning("Vui lòng chọn collection và đảm bảo có dữ liệu");
      return;
    }

    try {
      setExportLoading(true);
      const headers = Object.keys(collectionData[0]);

      // Create template JSON with empty values
      const template = [{}];
      headers.forEach((header) => {
        template[0][header] = "";
      });

      const jsonContent = JSON.stringify(template, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedCollection}_template.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success("Đã tải file JSON mẫu thành công!");
    } catch (error) {
      console.error("Error generating JSON template:", error);
      message.error(`Lỗi khi tạo template JSON: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle File Import
  const handleFileImport = async (file) => {
    if (!selectedCollection) {
      message.warning("Vui lòng chọn collection trước");
      return false;
    }

    try {
      setImportLoading(true);

      let data;

      // Check file type
      const fileName = file.name.toLowerCase();
      const isCSV = fileName.endsWith(".csv");
      const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
      const isJSON = fileName.endsWith(".json");

      if (isCSV) {
        // Read CSV file
        const result = await readCSVFile(file);
        data = result.data;
      } else if (isExcel) {
        // Read Excel file
        const result = await readExcelFile(file);
        data = result.data;
      } else if (isJSON) {
        // Read JSON file
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          // Handle both array and single object
          data = Array.isArray(parsed) ? parsed : [parsed];
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          message.error("File JSON không hợp lệ. Vui lòng kiểm tra định dạng.");
          return false;
        }
      } else {
        message.error(
          "File không được hỗ trợ. Vui lòng chọn file CSV, Excel (.xlsx, .xls) hoặc JSON (.json)"
        );
        return false;
      }

      if (!data || data.length === 0) {
        message.error("File không có dữ liệu");
        return false;
      }

      // Validate data
      const validation = validateImportedData(data);
      if (!validation.isValid) {
        message.error(
          `Dữ liệu không hợp lệ: ${validation.errors.slice(0, 3).join(", ")}`
        );
        return false;
      }

      // Import to Firebase
      const service = createCollectionService(selectedCollection);
      let successCount = 0;
      let errorCount = 0;

      for (const item of data) {
        try {
          await service.create(item);
          successCount++;
        } catch (error) {
          console.error("Error importing item:", error);
          errorCount++;
        }
      }

      message.success(
        `Đã nhập ${successCount} bản ghi thành công${
          errorCount > 0 ? `, ${errorCount} lỗi` : ""
        }`
      );

      // Refresh data
      await loadCollectionStats(selectedCollection);
      setImportModalVisible(false);

      return false; // Prevent default upload behavior
    } catch (error) {
      console.error("Error importing file:", error);
      message.error(`Lỗi khi nhập dữ liệu: ${error.message}`);
      return false;
    } finally {
      setImportLoading(false);
    }
  };

  // Export menu items
  const exportMenuItems = [
    {
      key: "csv",
      label: (
        <Space>
          <FileTextOutlined />
          Xuất CSV
        </Space>
      ),
      onClick: handleExportCSV,
    },
    {
      key: "pdf",
      label: (
        <Space>
          <FilePdfOutlined />
          Xuất PDF
        </Space>
      ),
      onClick: handleExportPDF,
    },
    {
      key: "json",
      label: (
        <Space>
          <CodeOutlined />
          Xuất JSON
        </Space>
      ),
      onClick: handleExportJSON,
    },
  ];

  // Chart colors
  const COLORS = [
    "#0D9488",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
    "#EF4444",
    "#10B981",
    "#6366F1",
    "#F97316",
  ];

  // Collection display names
  const getCollectionDisplayName = (collectionName) => {
    const names = {
      USER: "Người dùng",
      CATEGORIES: "Danh mục",
      CATEGORIES_DEFAULT: "Danh mục mặc định",
      TRANSACTIONS: "Giao dịch",
      TRANSACTION: "Giao dịch",
      BUDGET: "Ngân sách",
      BUDGETS: "Ngân sách",
      GOAL: "Mục tiêu",
      GOALS: "Mục tiêu",
      RECURRING_TXN: "Giao dịch định kỳ",
      RECURRING_TRANSACTIONS: "Giao dịch định kỳ",
      BUDGET_HISTORY: "Lịch sử ngân sách",
      GOAL_CONTRIBUTION: "Đóng góp mục tiêu",
      GOAL_CONTRIBUTIONS: "Đóng góp mục tiêu",
      SYNC_LOG: "Nhật ký đồng bộ",
      SYNC_LOGS: "Nhật ký đồng bộ",
      ACTIVITY_LOG: "Nhật ký hoạt động",
      NOTIFICATION: "Thông báo",
      NOTIFICATIONS: "Thông báo",
      DEVICE: "Thiết bị",
      DEVICES: "Thiết bị",
      ATTACHMENT: "Tệp đính kèm",
      ATTACHMENTS: "Tệp đính kèm",
      PAYMENT_METHHOD: "Phương thức thanh toán",
      PAYMENT_METHODS: "Phương thức thanh toán",
      MERCHART: "Cửa hàng",
      MERCHANTS: "Cửa hàng",
      TAG: "Thẻ",
      TAGS: "Thẻ",
      TRANSACTION_TAG: "Thẻ giao dịch",
      TRANSACTION_TAGS: "Thẻ giao dịch",
      SPLIT_TRANSACTION: "Giao dịch chia",
      SPLIT_TRANSACTIONS: "Giao dịch chia",
      REPORT: "Báo cáo",
      REPORTS: "Báo cáo",
      APP_SETTINGS: "Cài đặt ứng dụng",
      CATEGORY_BUDGET_TEMPLATE: "Mẫu ngân sách",
      CATEGORY_BUDGET_TEMPLATES: "Mẫu ngân sách",
      expenses: "Chi tiêu",
      EXPENSES: "Chi tiêu",
    };
    return names[collectionName] || collectionName;
  };

  // Group collections by category - dynamically include all collections
  const allCollections = getAllCollections();

  // Define collection groups with all collections explicitly listed
  const coreEntities = [
    "USER",
    "CATEGORIES",
    "CATEGORIES_DEFAULT",
    "TRANSACTIONS",
    "BUDGET",
    "GOAL",
    "expenses",
  ];
  const recurringHistory = [
    "RECURRING_TXN",
    "BUDGET_HISTORY",
    "GOAL_CONTRIBUTION",
  ];
  const systemCollections = [
    "SYNC_LOG",
    "ACTIVITY_LOG",
    "NOTIFICATION",
    "DEVICE",
  ];
  const mediaAttachments = ["ATTACHMENT"];
  const paymentMerchants = ["PAYMENT_METHHOD", "MERCHART"];
  const tagsOrganization = ["TAG", "TRANSACTION_TAG", "SPLIT_TRANSACTION"];
  const reportsSettings = [
    "REPORT",
    "APP_SETTINGS",
    "CATEGORY_BUDGET_TEMPLATE",
  ];

  // Ensure all collections from getAllCollections() are accounted for
  // This includes: USER, CATEGORIES, CATEGORIES_DEFAULT, TRANSACTIONS, BUDGET, GOAL,
  // RECURRING_TXN, BUDGET_HISTORY, GOAL_CONTRIBUTION, SYNC_LOG, ACTIVITY_LOG,
  // NOTIFICATION, DEVICE, ATTACHMENT, PAYMENT_METHHOD, MERCHART, TAG,
  // TRANSACTION_TAG, SPLIT_TRANSACTION, REPORT, APP_SETTINGS, CATEGORY_BUDGET_TEMPLATE, expenses

  // Build grouped collections - ensure all collections from allCollections are included
  const groupedCollections = {
    "Core Entities": [],
    "Recurring & History": [],
    System: [],
    "Media & Attachments": [],
    "Payment & Merchants": [],
    "Tags & Organization": [],
    "Reports & Settings": [],
    Other: [],
  };

  // Categorize each collection
  allCollections.forEach((collection) => {
    if (coreEntities.includes(collection)) {
      groupedCollections["Core Entities"].push(collection);
    } else if (recurringHistory.includes(collection)) {
      groupedCollections["Recurring & History"].push(collection);
    } else if (systemCollections.includes(collection)) {
      groupedCollections["System"].push(collection);
    } else if (mediaAttachments.includes(collection)) {
      groupedCollections["Media & Attachments"].push(collection);
    } else if (paymentMerchants.includes(collection)) {
      groupedCollections["Payment & Merchants"].push(collection);
    } else if (tagsOrganization.includes(collection)) {
      groupedCollections["Tags & Organization"].push(collection);
    } else if (reportsSettings.includes(collection)) {
      groupedCollections["Reports & Settings"].push(collection);
    } else {
      groupedCollections["Other"].push(collection);
    }
  });

  // Filter out empty groups
  const filteredGroupedCollections = Object.fromEntries(
    Object.entries(groupedCollections).filter(([, items]) => items.length > 0)
  );

  // Verify all collections are included
  const allDisplayedCollections = Object.values(
    filteredGroupedCollections
  ).flat();
  const missingInDisplay = allCollections.filter(
    (col) => !allDisplayedCollections.includes(col)
  );

  // Debug log to verify all collections
  console.log(
    "📊 Total collections from getAllCollections():",
    allCollections.length
  );
  console.log("📊 All collections:", allCollections);
  console.log("📊 Collections in groups:", allDisplayedCollections.length);
  console.log("📊 Missing in display:", missingInDisplay);
  console.log("📊 Grouped collections:", filteredGroupedCollections);

  if (missingInDisplay.length > 0) {
    console.error(
      "❌ ERROR: Some collections are missing from display!",
      missingInDisplay
    );
    // Add missing collections to "Other" group
    if (!filteredGroupedCollections["Other"]) {
      filteredGroupedCollections["Other"] = [];
    }
    filteredGroupedCollections["Other"].push(...missingInDisplay);
  }

  if (!isFirebaseReady()) {
    return (
      <div className="database-management-page">
        <Alert
          message="Firebase chưa sẵn sàng"
          description="Vui lòng kiểm tra cấu hình Firebase trong file firebase.js"
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="database-management-page">
      <Card>
        <div className="page-header">
          <div className="header-content">
            <DatabaseOutlined className="header-icon" />
            <div>
              <h1 className="page-title">Quản lý Cơ sở dữ liệu</h1>
              <p className="page-description">
                Xem, thêm, sửa, xóa dữ liệu trong Firestore
              </p>
            </div>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Làm mới
            </Button>
            <Dropdown menu={{ items: exportMenuItems }} trigger={["click"]}>
              <Button
                icon={<ExportOutlined />}
                loading={exportLoading}
                onClick={(e) => e.preventDefault()}
              >
                Xuất dữ liệu <DownOutlined />
              </Button>
            </Dropdown>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              Nhập dữ liệu
            </Button>
          </Space>
        </div>

        {error && (
          <Alert
            message="Lỗi"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Collection Selection */}
        <div className="collection-selector">
          <Select
            value={selectedCollection}
            onChange={handleCollectionChange}
            placeholder="Chọn collection"
            style={{ width: 300, marginBottom: 16 }}
            size="large"
          >
            {Object.entries(filteredGroupedCollections).map(
              ([category, items]) => (
                <Select.OptGroup key={category} label={category}>
                  {items.map((collectionName) => (
                    <Option key={collectionName} value={collectionName}>
                      {getCollectionDisplayName(collectionName)} (
                      {collectionName})
                    </Option>
                  ))}
                </Select.OptGroup>
              )
            )}
          </Select>
        </div>

        {/* Statistics */}
        {selectedCollection && stats[selectedCollection] && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Tổng số bản ghi"
                  value={stats[selectedCollection].total}
                  prefix={<DatabaseOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Collection"
                  value={selectedCollection}
                  valueStyle={{ fontSize: 16 }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Cập nhật lần cuối"
                  value={stats[selectedCollection].lastUpdated}
                  valueStyle={{ fontSize: 14 }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Charts */}
        {selectedCollection && chartData.length > 0 && (
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>Biểu đồ Thống kê</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Tabs
              activeKey={activeChartTab}
              onChange={setActiveChartTab}
              items={[
                {
                  key: "bar",
                  label: (
                    <Space>
                      <BarChartOutlined />
                      Biểu đồ cột
                    </Space>
                  ),
                  children: (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#0D9488" />
                        {chartData[0]?.income !== undefined && (
                          <>
                            <Bar dataKey="income" fill="#10B981" />
                            <Bar dataKey="expense" fill="#EF4444" />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ),
                },
                {
                  key: "line",
                  label: (
                    <Space>
                      <LineChartOutlined />
                      Biểu đồ đường
                    </Space>
                  ),
                  children: (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#0D9488"
                        />
                        {chartData[0]?.income !== undefined && (
                          <>
                            <Line
                              type="monotone"
                              dataKey="income"
                              stroke="#10B981"
                            />
                            <Line
                              type="monotone"
                              dataKey="expense"
                              stroke="#EF4444"
                            />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ),
                },
                {
                  key: "pie",
                  label: (
                    <Space>
                      <PieChartOutlined />
                      Biểu đồ tròn
                    </Space>
                  ),
                  children: (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ),
                },
              ]}
            />
          </Card>
        )}

        {/* Data Table */}
        {selectedCollection && (
          <CollectionDataTable
            collectionName={selectedCollection}
            onRefresh={handleRefresh}
          />
        )}

        {/* Import Modal */}
        <Modal
          title={
            <Space>
              <ImportOutlined />
              <span>Nhập dữ liệu vào {selectedCollection}</span>
            </Space>
          }
          open={importModalVisible}
          onCancel={() => setImportModalVisible(false)}
          footer={null}
          width={600}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Alert
              message="Hướng dẫn nhập dữ liệu"
              description="Vui lòng tải file mẫu (Excel, CSV hoặc JSON), điền dữ liệu theo mẫu, sau đó chọn file để nhập vào Firebase."
              type="info"
              showIcon
            />

            <Space direction="vertical" style={{ width: "100%" }}>
              <Space style={{ width: "100%" }} wrap>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadExcelTemplate}
                  loading={exportLoading}
                  size="large"
                >
                  Tải Excel mẫu
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadCSVTemplate}
                  loading={exportLoading}
                  size="large"
                >
                  Tải CSV mẫu
                </Button>
                <Button
                  icon={<CodeOutlined />}
                  onClick={handleDownloadJSONTemplate}
                  loading={exportLoading}
                  size="large"
                >
                  Tải JSON mẫu
                </Button>
              </Space>

              <Upload
                accept=".xlsx,.xls,.csv,.json"
                beforeUpload={handleFileImport}
                showUploadList={false}
                disabled={importLoading}
              >
                <Button
                  icon={<FileExcelOutlined />}
                  loading={importLoading}
                  block
                  size="large"
                >
                  Chọn file để nhập dữ liệu (Excel, CSV hoặc JSON)
                </Button>
              </Upload>
            </Space>
          </Space>
        </Modal>

        {!selectedCollection && (
          <Card>
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <DatabaseOutlined style={{ fontSize: 64, color: "#ccc" }} />
              <p style={{ marginTop: 16, color: "#999" }}>
                Vui lòng chọn một collection để xem dữ liệu
              </p>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
}

export default DatabaseManagementPage;
