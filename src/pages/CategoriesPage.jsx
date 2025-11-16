import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Input,
  Tag,
  Space,
  Spin,
  Empty,
  message,
  Popconfirm,
  Alert,
  Tabs,
  Table,
  Tooltip,
  InputNumber,
  Switch,
  Divider,
  Select,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  AppstoreOutlined,
  WarningOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  DragOutlined,
  ExportOutlined,
  ImportOutlined,
  BarChartOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import { isFirebaseReady } from "../firebase";
import {
  getCategoriesByType,
  addCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
  getDefaultCategoriesByType,
  uploadDefaultCategories,
  updateDefaultCategory,
  deleteDefaultCategory,
  getDefaultCategoryById,
} from "../services/categoryService";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  ALL_DEFAULT_CATEGORIES,
} from "../constants/defaultCategories";
import "../assets/css/pages/CategoriesPage.css";

const { Option } = Select;

const CategoriesPage = () => {
  // State management
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [defaultExpenseCategories, setDefaultExpenseCategories] = useState([]);
  const [defaultIncomeCategories, setDefaultIncomeCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("EXPENSE");
  const [categoryView, setCategoryView] = useState("all"); // 'all', 'default', 'user'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [sortBy, setSortBy] = useState("displayOrder"); // 'displayOrder', 'name', 'count', 'createdAt'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    icon: "🍽️",
    color: "#0D9488",
    displayOrder: 0,
    isSystemDefault: false,
    keywords: [],
  });

  // Icon options - More comprehensive list
  const ICON_OPTIONS = {
    EXPENSE: [
      "🍽️",
      "🚗",
      "🎬",
      "📚",
      "🏥",
      "🏠",
      "✈️",
      "🎮",
      "👕",
      "💡",
      "🔧",
      "🎨",
      "🏋️",
      "🎵",
      "📱",
      "💻",
      "🍕",
      "☕",
      "🛒",
      "💊",
      "🥘",
      "🍔",
      "🍜",
      "🍰",
      "🥤",
      "🚇",
      "🚲",
      "⛽",
      "🎯",
      "🎪",
      "🎭",
      "🎸",
      "🏄",
      "🌴",
      "🏖️",
      "🎢",
      "🎠",
      "🎡",
      "🎰",
      "🎲",
    ],
    INCOME: [
      "💰",
      "💵",
      "💳",
      "🏦",
      "📈",
      "🎁",
      "💼",
      "🏢",
      "📊",
      "💹",
      "🎯",
      "⭐",
      "🏆",
      "💎",
      "🔑",
      "📦",
      "🎪",
      "🎭",
      "🎸",
      "🏅",
      "💼",
      "📱",
      "💻",
      "🖥️",
      "📺",
      "📻",
      "🎙️",
      "🎤",
      "🎧",
      "🎬",
      "📷",
      "🎥",
      "📹",
      "🔋",
      "⚡",
      "🔌",
      "💡",
      "🕯️",
      "🕰️",
      "⌚",
    ],
  };

  const COLOR_OPTIONS = [
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
    "#6366F1",
    "#84CC16",
    "#F43F5E",
    "#8B5A2B",
    "#64748B",
    "#1E293B",
    "#7C3AED",
    "#BE185D",
  ];

  // Load categories from Firebase
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isFirebaseReady()) {
        throw new Error("Firebase chưa sẵn sàng");
      }

      // Load default categories (CATEGORIES_DEFAULT)
      const [defaultExpense, defaultIncome] = await Promise.all([
        getDefaultCategoriesByType("EXPENSE"),
        getDefaultCategoriesByType("INCOME"),
      ]);
      setDefaultExpenseCategories(defaultExpense);
      setDefaultIncomeCategories(defaultIncome);

      // Load user categories (CATEGORIES)
      const [userExpense, userIncome] = await Promise.all([
        getCategoriesByType(null, "EXPENSE"),
        getCategoriesByType(null, "INCOME"),
      ]);

      // Filter out default categories from user categories
      const filteredUserExpense = userExpense.filter(
        (cat) =>
          !cat.isSystemDefault && !defaultExpense.some((dc) => dc.id === cat.id)
      );
      const filteredUserIncome = userIncome.filter(
        (cat) =>
          !cat.isSystemDefault && !defaultIncome.some((dc) => dc.id === cat.id)
      );

      setExpenseCategories(filteredUserExpense);
      setIncomeCategories(filteredUserIncome);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError(`Không thể tải danh mục: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadCategories();
  }, []);

  // Get categories based on view mode
  const getCategoriesToDisplay = () => {
    const isExpense = activeTab === "EXPENSE";
    let categories = [];

    if (categoryView === "default") {
      categories = isExpense
        ? defaultExpenseCategories
        : defaultIncomeCategories;
    } else if (categoryView === "user") {
      categories = isExpense ? expenseCategories : incomeCategories;
    } else {
      // Show all: combine default and user categories
      const defaults = isExpense
        ? defaultExpenseCategories
        : defaultIncomeCategories;
      const users = isExpense ? expenseCategories : incomeCategories;
      categories = [...defaults, ...users];
    }

    return categories;
  };

  // Filter and sort categories
  const getFilteredCategories = () => {
    let categories = getCategoriesToDisplay();
    
    // Apply search filter
    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      categories = categories.filter(
        (cat) =>
          cat.name?.toLowerCase().includes(lowerSearch) ||
          cat.id?.toLowerCase().includes(lowerSearch) ||
          (cat.keywords &&
            Array.isArray(cat.keywords) &&
            cat.keywords.some((k) => k.toLowerCase().includes(lowerSearch)))
      );
    }

    // Apply sorting
    categories.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "count":
          aValue = a.count || 0;
          bValue = b.count || 0;
          break;
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case "displayOrder":
        default:
          aValue = a.displayOrder ?? a.order ?? 999;
          bValue = b.displayOrder ?? b.order ?? 999;
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return categories;
  };

  const filteredCategories = getFilteredCategories();

  // Handle Export Categories
  const handleExportCategories = () => {
    const csvContent = [
      ["ID", "Tên", "Icon", "Màu", "Loại", "Thứ tự", "Số giao dịch", "Từ khóa"].join(","),
      ...filteredCategories.map((cat) =>
        [
          cat.id || "",
          cat.name || "",
          cat.icon || "",
          cat.color || "",
          cat.type || "",
          cat.displayOrder ?? cat.order ?? 0,
          cat.count || 0,
          Array.isArray(cat.keywords) ? cat.keywords.join(";") : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `categories_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("Đã xuất file CSV thành công!");
  };

  // Handle Import Categories
  const handleImportCategories = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split("\n");
        const headers = lines[0].split(",");
        const categories = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(",");
          const category = {
            name: values[1] || "",
            icon: values[2] || ICON_OPTIONS[activeTab][0],
            color: values[3] || COLOR_OPTIONS[0],
            type: values[4] || activeTab,
            displayOrder: parseInt(values[5]) || 0,
            count: parseInt(values[6]) || 0,
            keywords: values[7] ? values[7].split(";").filter((k) => k.trim()) : [],
            isSystemDefault: false,
          };
          categories.push(category);
        }

        // Import categories
        setLoading(true);
        for (const category of categories) {
          try {
            await addCategory(category);
          } catch (err) {
            console.warn(`Failed to import category ${category.name}:`, err);
          }
        }
        message.success(`Đã nhập ${categories.length} danh mục thành công!`);
        await loadCategories();
      } catch (error) {
        console.error("Import error:", error);
        message.error(`Lỗi khi nhập file: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  // Calculate category statistics
  const getCategoryStats = () => {
    const stats = {
      total: filteredCategories.length,
      totalTransactions: filteredCategories.reduce((sum, cat) => sum + (cat.count || 0), 0),
      avgTransactions: 0,
      topCategory: null,
    };

    if (stats.total > 0) {
      stats.avgTransactions = Math.round(stats.totalTransactions / stats.total);
      stats.topCategory = [...filteredCategories].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    }

    return stats;
  };

  const categoryStats = getCategoryStats();

  // Check if category is default
  const isDefaultCategory = (category) => {
    const defaults =
      activeTab === "EXPENSE"
        ? defaultExpenseCategories
        : defaultIncomeCategories;
    return (
      defaults.some((dc) => dc.id === category.id) || category.isSystemDefault
    );
  };

  // Handle Open Modal
  const handleOpenModal = async (category = null, isDefault = false) => {
    setIsEditingDefault(isDefault);

    if (category) {
      // Fetch full category data if needed
      try {
        let fullCategory;
        if (isDefault) {
          fullCategory = await getDefaultCategoryById(category.id);
        } else {
          fullCategory = await getCategoryById(category.id);
        }
        setEditingCategory(fullCategory);
        setFormData({
          name: fullCategory.name || "",
          icon: fullCategory.icon || ICON_OPTIONS[activeTab][0],
          color: fullCategory.color || COLOR_OPTIONS[0],
          displayOrder: fullCategory.displayOrder ?? fullCategory.order ?? 0,
          isSystemDefault: fullCategory.isSystemDefault || false,
          keywords: fullCategory.keywords || [],
        });
      } catch (err) {
        console.error("Error loading category:", err);
        // Fallback to provided category
        setEditingCategory(category);
        setFormData({
          name: category.name || "",
          icon: category.icon || ICON_OPTIONS[activeTab][0],
          color: category.color || COLOR_OPTIONS[0],
          displayOrder: category.displayOrder ?? category.order ?? 0,
          isSystemDefault: category.isSystemDefault || false,
          keywords: category.keywords || [],
        });
      }
    } else {
      setEditingCategory(null);
      setIsEditingDefault(false);
      setFormData({
        name: "",
        icon: ICON_OPTIONS[activeTab][0],
        color: COLOR_OPTIONS[0],
        displayOrder: filteredCategories.length,
        isSystemDefault: false,
        keywords: [],
      });
    }
    setModalVisible(true);
  };

  // Handle Save
  const handleSave = async () => {
    // Validation
    if (!formData.name || formData.name.trim().length < 2) {
      message.error("Tên danh mục phải có ít nhất 2 ký tự");
      return;
    }

    if (formData.name.trim().length > 50) {
      message.error("Tên danh mục không được quá 50 ký tự");
      return;
    }

    if (!formData.icon) {
      message.error("Vui lòng chọn icon");
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const updateData = {
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          displayOrder: formData.displayOrder ?? 0,
          keywords: formData.keywords || [],
          updatedAt: new Date().toISOString(),
        };

        if (isEditingDefault) {
          // Update default category
          await updateDefaultCategory(editingCategory.id, updateData);
          message.success({
            content: "Cập nhật danh mục mặc định thành công!",
            duration: 2,
          });
        } else {
          // Update user category
          await updateCategory(editingCategory.id, updateData);
          message.success({
            content: "Cập nhật danh mục thành công!",
            duration: 2,
          });
        }
      } else {
        // Create new category
        if (isEditingDefault) {
          // Create default category (should not happen in normal flow, but allow it)
          message.warning(
            "Vui lòng sử dụng chức năng 'Tải danh mục mặc định' để thêm danh mục mặc định"
          );
          return;
        } else {
          // Create user category
          const newCategory = {
            name: formData.name.trim(),
            icon: formData.icon,
            color: formData.color,
            type: activeTab,
            displayOrder: formData.displayOrder ?? filteredCategories.length,
            isSystemDefault: false,
            keywords: formData.keywords || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await addCategory(newCategory);
          message.success({
            content: "Thêm danh mục mới thành công!",
            duration: 2,
          });
        }
      }

      setModalVisible(false);
      setFormData({
        name: "",
        icon: ICON_OPTIONS[activeTab][0],
        color: COLOR_OPTIONS[0],
        displayOrder: 0,
        isSystemDefault: false,
        keywords: [],
      });
      setEditingCategory(null);
      await loadCategories();
    } catch (err) {
      console.error("Save error:", err);
      message.error(`Lỗi: ${err.message || "Không thể lưu danh mục"}`);
    }
  };

  // Handle Delete
  const handleDelete = async (categoryId, categoryName, isDefault = false) => {
    try {
      if (isDefault) {
        await deleteDefaultCategory(categoryId);
        message.success(`Đã xóa danh mục mặc định "${categoryName}"`);
      } else {
        await deleteCategory(categoryId);
        message.success(`Đã xóa danh mục "${categoryName}"`);
      }
      await loadCategories();
    } catch (err) {
      console.error("Delete error:", err);
      message.error(`Không thể xóa: ${err.message || "Lỗi không xác định"}`);
    }
  };

  // Handle Upload Default Categories
  const handleUploadDefaultCategories = async () => {
    try {
      setLoading(true);
      const categoriesToUpload =
        activeTab === "EXPENSE"
          ? DEFAULT_EXPENSE_CATEGORIES
          : DEFAULT_INCOME_CATEGORIES;

      await uploadDefaultCategories(categoriesToUpload);
      message.success(
        `Đã tải ${categoriesToUpload.length} danh mục mặc định thành công!`
      );
      await loadCategories();
    } catch (err) {
      console.error("Upload error:", err);
      message.error(
        `Lỗi khi tải danh mục mặc định: ${err.message || "Lỗi không xác định"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Table columns for table view
  const columns = [
    {
      title: "Icon",
      key: "icon",
      width: 80,
      render: (_, record) => (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: `${record.color}20`,
            fontSize: 24,
          }}
        >
          {record.icon}
        </div>
      ),
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      render: (text, record) => {
        const isDefault = isDefaultCategory(record);
        return (
          <Space>
            <span style={{ fontWeight: 500 }}>{text}</span>
            {isDefault && (
              <Tag color="green" size="small" icon={<LockOutlined />}>
                Mặc định
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Màu sắc",
      key: "color",
      width: 100,
      render: (_, record) => (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            backgroundColor: record.color,
            border: "1px solid #d9d9d9",
          }}
        />
      ),
    },
    {
      title: "Thứ tự",
      dataIndex: "displayOrder",
      key: "displayOrder",
      width: 100,
      render: (order) => order ?? 0,
    },
    {
      title: "Giao dịch",
      dataIndex: "count",
      key: "count",
      width: 100,
      render: (count) => count || 0,
    },
    {
      title: "Hành động",
      key: "action",
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Xóa danh mục"
            description={`Bạn có chắc muốn xóa "${record.name}"?`}
            onConfirm={() => handleDelete(record.id, record.name)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            disabled={record.isSystemDefault}
          >
            <Tooltip
              title={
                record.isSystemDefault
                  ? "Không thể xóa danh mục mặc định"
                  : "Xóa"
              }
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
                disabled={record.isSystemDefault}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (
    loading &&
    expenseCategories.length === 0 &&
    incomeCategories.length === 0
  ) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" spinning={true}>
          <div>Đang tải danh mục...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div className="categories-page">
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
            <Button size="small" onClick={loadCategories}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Header Card */}
      <Card
        title={
          <Space>
            <AppstoreOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18 }}>Quản lý danh mục</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="🔍 Tìm kiếm danh mục..."
              prefix={<SearchOutlined />}
              allowClear
              size="large"
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadCategories}
              loading={loading}
            >
              Làm mới
            </Button>
            <Popconfirm
              title="Tải danh mục mặc định"
              description={`Bạn có muốn tải ${
                activeTab === "EXPENSE"
                  ? DEFAULT_EXPENSE_CATEGORIES.length
                  : DEFAULT_INCOME_CATEGORIES.length
              } danh mục mặc định ${
                activeTab === "EXPENSE" ? "chi tiêu" : "thu nhập"
              }?`}
              onConfirm={handleUploadDefaultCategories}
              okText="Tải"
              cancelText="Hủy"
            >
              <Button icon={<LockOutlined />}>Tải danh mục mặc định</Button>
            </Popconfirm>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportCategories}
            >
              Xuất CSV
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={handleImportCategories}
            >
              Nhập CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              Thêm danh mục
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#1890ff" }}>
                {categoryStats.total}
              </div>
              <div style={{ color: "#999" }}>Tổng danh mục</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#52c41a" }}>
                {categoryStats.totalTransactions}
              </div>
              <div style={{ color: "#999" }}>Tổng giao dịch</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#faad14" }}>
                {categoryStats.avgTransactions}
              </div>
              <div style={{ color: "#999" }}>Trung bình/danh mục</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <div style={{ fontSize: 20, fontWeight: "bold" }}>
                {categoryStats.topCategory?.icon} {categoryStats.topCategory?.name || "N/A"}
              </div>
              <div style={{ color: "#999" }}>
                Top danh mục ({categoryStats.topCategory?.count || 0} giao dịch)
              </div>
            </Card>
          </Col>
        </Row>

        {/* Sort Controls */}
        <Space wrap style={{ marginBottom: 16 }}>
          <span>Sắp xếp theo:</span>
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 150 }}
          >
            <Option value="displayOrder">Thứ tự hiển thị</Option>
            <Option value="name">Tên</Option>
            <Option value="count">Số giao dịch</Option>
            <Option value="createdAt">Ngày tạo</Option>
          </Select>
          <Button
            icon={sortOrder === "asc" ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "Tăng dần" : "Giảm dần"}
          </Button>
        </Space>
        <Space wrap>
          <Space>
            <span>Hiển thị:</span>
            <Button
              type={viewMode === "grid" ? "primary" : "default"}
              onClick={() => setViewMode("grid")}
              size="small"
            >
              Lưới
            </Button>
            <Button
              type={viewMode === "table" ? "primary" : "default"}
              onClick={() => setViewMode("table")}
              size="small"
            >
              Bảng
            </Button>
          </Space>
          <Divider type="vertical" />
          <Space>
            <span>Loại danh mục:</span>
            <Button
              type={categoryView === "all" ? "primary" : "default"}
              onClick={() => setCategoryView("all")}
              size="small"
            >
              Tất cả
            </Button>
            <Button
              type={categoryView === "default" ? "primary" : "default"}
              onClick={() => setCategoryView("default")}
              size="small"
              icon={<LockOutlined />}
            >
              Mặc định (
              {activeTab === "EXPENSE"
                ? defaultExpenseCategories.length
                : defaultIncomeCategories.length}
              )
            </Button>
            <Button
              type={categoryView === "user" ? "primary" : "default"}
              onClick={() => setCategoryView("user")}
              size="small"
            >
              Người dùng (
              {activeTab === "EXPENSE"
                ? expenseCategories.length
                : incomeCategories.length}
              )
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setCategoryView("all"); // Reset view when switching tabs
        }}
        size="large"
        tabBarStyle={{ marginBottom: 24 }}
        items={[
          {
            key: "EXPENSE",
            label: (
              <Space>
                <RiseOutlined />
                Chi tiêu (
                {categoryView === "default"
                  ? defaultExpenseCategories.length
                  : categoryView === "user"
                  ? expenseCategories.length
                  : defaultExpenseCategories.length + expenseCategories.length}
                )
              </Space>
            ),
          },
          {
            key: "INCOME",
            label: (
              <Space>
                <FallOutlined />
                Thu nhập (
                {categoryView === "default"
                  ? defaultIncomeCategories.length
                  : categoryView === "user"
                  ? incomeCategories.length
                  : defaultIncomeCategories.length + incomeCategories.length}
                )
              </Space>
            ),
          },
        ]}
      />

      {/* Content */}
      {filteredCategories.length === 0 ? (
        <Empty
          description={
            <Space direction="vertical">
              <span>
                {searchText
                  ? `Không tìm thấy danh mục nào với "${searchText}"`
                  : "Chưa có danh mục nào"}
              </span>
              {!searchText && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenModal()}
                >
                  Thêm danh mục đầu tiên
                </Button>
              )}
            </Space>
          }
          style={{ padding: "60px 0" }}
        />
      ) : viewMode === "table" ? (
        <Card>
          <Table
            columns={columns}
            dataSource={filteredCategories}
            rowKey="id"
            pagination={{
              responsive: true,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} danh mục`,
            }}
            scroll={{ x: 'max-content', y: 400 }}
            size="small"
            loading={loading}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredCategories.map((category) => {
            const isDefault = isDefaultCategory(category);
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={category.id}>
                <Card
                  className="category-card"
                  hoverable
                  style={{
                    borderLeft: `4px solid ${category.color}`,
                  }}
                  actions={[
                    <Tooltip title="Chỉnh sửa" key="edit">
                      <EditOutlined
                        onClick={() => handleOpenModal(category, isDefault)}
                      />
                    </Tooltip>,
                    <Popconfirm
                      key="delete"
                      title="Xóa danh mục"
                      description={`Bạn có chắc muốn xóa "${category.name}"?`}
                      onConfirm={() =>
                        handleDelete(category.id, category.name, isDefault)
                      }
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip
                        title={
                          isDefault ? "Xóa danh mục mặc định" : "Xóa danh mục"
                        }
                      >
                        <DeleteOutlined
                          style={{
                            color: "#ff4d4f",
                          }}
                        />
                      </Tooltip>
                    </Popconfirm>,
                  ]}
                >
                  <div className="category-header">
                    <div
                      className="category-icon"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <span style={{ fontSize: 32 }}>{category.icon}</span>
                    </div>
                  </div>

                  <h3 className="category-name">{category.name}</h3>

                  <Space wrap style={{ marginTop: 8 }}>
                    <Tag color="blue">{category.count || 0} giao dịch</Tag>
                    {isDefault && (
                      <Tag color="green" icon={<LockOutlined />}>
                        Mặc định
                      </Tag>
                    )}
                    <Tag>Thứ tự: {category.displayOrder ?? 0}</Tag>
                  </Space>

                  <div
                    className="category-color-bar"
                    style={{ backgroundColor: category.color }}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Modal */}
      <Modal
        title={
          <Space>
            {editingCategory ? <EditOutlined /> : <PlusOutlined />}
            {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
          </Space>
        }
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false);
          setFormData({
            name: "",
            icon: ICON_OPTIONS[activeTab][0],
            color: COLOR_OPTIONS[0],
            displayOrder: 0,
            isSystemDefault: false,
            keywords: [],
          });
          setEditingCategory(null);
        }}
        okText={
          <Space>
            <SaveOutlined /> Lưu
          </Space>
        }
        cancelText={
          <Space>
            <CloseOutlined /> Hủy
          </Space>
        }
        width={700}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Tên danh mục *
          </label>
          <Input
            placeholder="Nhập tên danh mục (2-50 ký tự)"
            size="large"
            maxLength={50}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Icon *
          </label>
          <div className="icon-selector">
            {ICON_OPTIONS[activeTab].map((icon) => (
              <div
                key={icon}
                className={`icon-option ${
                  formData.icon === icon ? "selected" : ""
                }`}
                onClick={() => setFormData({ ...formData, icon })}
              >
                {icon}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Màu sắc *
          </label>
          <div className="color-selector">
            {COLOR_OPTIONS.map((color) => (
              <div
                key={color}
                className={`color-option ${
                  formData.color === color ? "selected" : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setFormData({ ...formData, color })}
              >
                {formData.color === color && "✓"}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Thứ tự hiển thị
          </label>
          <InputNumber
            min={0}
            max={999}
            value={formData.displayOrder}
            onChange={(value) =>
              setFormData({ ...formData, displayOrder: value ?? 0 })
            }
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Switch
              checked={formData.isSystemDefault}
              onChange={(checked) =>
                setFormData({ ...formData, isSystemDefault: checked })
              }
              disabled={editingCategory && !editingCategory.isSystemDefault}
            />
            <span>
              Danh mục mặc định hệ thống
              {editingCategory && !editingCategory.isSystemDefault && (
                <Tooltip title="Chỉ có thể đặt khi tạo mới">
                  <LockOutlined style={{ marginLeft: 4, color: "#999" }} />
                </Tooltip>
              )}
            </span>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
