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
} from "@ant-design/icons";
import { isFirebaseReady } from "../firebase";
import {
  getAllCategories,
  getCategoriesByType,
  addCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "../services/categoryService";
import "../assets/css/pages/CategoriesPage.css";

const CategoriesPage = () => {
  // State management
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("EXPENSE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'

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

      // Get all categories (for admin, we want to see all system categories)
      // Pass null userId to get all system categories
      const [expense, income] = await Promise.all([
        getCategoriesByType(null, "EXPENSE"),
        getCategoriesByType(null, "INCOME"),
      ]);

      setExpenseCategories(expense);
      setIncomeCategories(income);
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

  // Filter categories based on search
  const getFilteredCategories = () => {
    const categories =
      activeTab === "EXPENSE" ? expenseCategories : incomeCategories;
    if (!searchText.trim()) return categories;

    const lowerSearch = searchText.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(lowerSearch) ||
        cat.id?.toLowerCase().includes(lowerSearch) ||
        (cat.keywords &&
          Array.isArray(cat.keywords) &&
          cat.keywords.some((k) => k.toLowerCase().includes(lowerSearch)))
    );
  };

  const filteredCategories = getFilteredCategories();

  // Handle Open Modal
  const handleOpenModal = async (category = null) => {
    if (category) {
      // Fetch full category data if needed
      try {
        const fullCategory = await getCategoryById(category.id);
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

        // Only allow updating isSystemDefault if it was already system default
        if (editingCategory.isSystemDefault) {
          updateData.isSystemDefault = formData.isSystemDefault;
        }

        await updateCategory(editingCategory.id, updateData);
        message.success({
          content: "Cập nhật danh mục thành công!",
          duration: 2,
        });
      } else {
        // Create new category
        const newCategory = {
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          type: activeTab,
          displayOrder: formData.displayOrder ?? filteredCategories.length,
          isSystemDefault: formData.isSystemDefault,
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
  const handleDelete = async (categoryId, categoryName) => {
    try {
      await deleteCategory(categoryId);
      message.success(`Đã xóa danh mục "${categoryName}"`);
      await loadCategories();
    } catch (err) {
      console.error("Delete error:", err);
      message.error(`Không thể xóa: ${err.message || "Lỗi không xác định"}`);
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
      render: (text, record) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.isSystemDefault && (
            <Tag color="green" size="small">
              Mặc định
            </Tag>
          )}
        </Space>
      ),
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
      </Card>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        tabBarStyle={{ marginBottom: 24 }}
        items={[
          {
            key: "EXPENSE",
            label: (
              <Space>
                <RiseOutlined />
                Chi tiêu ({expenseCategories.length})
              </Space>
            ),
          },
          {
            key: "INCOME",
            label: (
              <Space>
                <FallOutlined />
                Thu nhập ({incomeCategories.length})
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
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} danh mục`,
            }}
            loading={loading}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredCategories.map((category) => (
            <Col xs={24} sm={12} md={8} lg={6} key={category.id}>
              <Card
                className="category-card"
                hoverable
                style={{
                  borderLeft: `4px solid ${category.color}`,
                }}
                actions={[
                  <Tooltip title="Chỉnh sửa" key="edit">
                    <EditOutlined onClick={() => handleOpenModal(category)} />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="Xóa danh mục"
                    description={`Bạn có chắc muốn xóa "${category.name}"?`}
                    onConfirm={() => handleDelete(category.id, category.name)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    disabled={category.isSystemDefault}
                  >
                    <Tooltip
                      title={
                        category.isSystemDefault
                          ? "Không thể xóa danh mục mặc định"
                          : "Xóa"
                      }
                    >
                      <DeleteOutlined
                        style={{
                          color: category.isSystemDefault
                            ? "#d9d9d9"
                            : "#ff4d4f",
                        }}
                        disabled={category.isSystemDefault}
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
                  {category.isSystemDefault && (
                    <Tag color="green">Mặc định</Tag>
                  )}
                  <Tag>Thứ tự: {category.displayOrder ?? 0}</Tag>
                </Space>

                <div
                  className="category-color-bar"
                  style={{ backgroundColor: category.color }}
                />
              </Card>
            </Col>
          ))}
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
