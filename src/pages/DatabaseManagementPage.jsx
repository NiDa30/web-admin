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
} from "antd";
import {
  DatabaseOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { COLLECTIONS, getAllCollections } from "../constants/collections";
import { createCollectionService } from "../services/collectionService";
import CollectionDataTable from "../components/CollectionDataTable";
import { isFirebaseReady } from "../firebase";
import "../assets/css/pages/DatabaseManagementPage.css";

const { Option } = Select;

function DatabaseManagementPage() {
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);

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

      setStats((prev) => ({
        ...prev,
        [collectionName]: {
          total: data.length,
          lastUpdated: new Date().toLocaleString("vi-VN"),
        },
      }));
    } catch (error) {
      console.error("Error loading stats:", error);
      message.error(`Lỗi khi tải thống kê: ${error.message}`);
    } finally {
      setLoading(false);
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

  const handleExport = () => {
    message.info("Chức năng export đang được phát triển");
  };

  // Collection display names
  const getCollectionDisplayName = (collectionName) => {
    const names = {
      USER: "Người dùng",
      CATEGORIES: "Danh mục",
      CATEGORIES_DEFAULT: "Danh mục mặc định",
      TRANSACTIONS: "Giao dịch",
      TRANSACTION: "Giao dịch",
      BUDGET: "Ngân sách",
      GOAL: "Mục tiêu",
      RECURRING_TXN: "Giao dịch định kỳ",
      BUDGET_HISTORY: "Lịch sử ngân sách",
      GOAL_CONTRIBUTION: "Đóng góp mục tiêu",
      SYNC_LOG: "Nhật ký đồng bộ",
      NOTIFICATION: "Thông báo",
      DEVICE: "Thiết bị",
      ATTACHMENT: "Tệp đính kèm",
      PAYMENT_METHHOD: "Phương thức thanh toán",
      MERCHART: "Cửa hàng",
      TAG: "Thẻ",
      TRANSACTION_TAG: "Thẻ giao dịch",
      SPLIT_TRANSACTION: "Giao dịch chia",
      REPORT: "Báo cáo",
      APP_SETTINGS: "Cài đặt ứng dụng",
      CATEGORY_BUDGET_TEMPLATE: "Mẫu ngân sách",
      expenses: "Chi tiêu",
      EXPENSES: "Chi tiêu",
    };
    return names[collectionName] || collectionName;
  };

  // Group collections by category
  const groupedCollections = {
    "Core Entities": [
      "USER",
      "CATEGORIES",
      "CATEGORIES_DEFAULT",
      "TRANSACTIONS",
      "BUDGET",
      "GOAL",
      "expenses",
    ],
    "Recurring & History": [
      "RECURRING_TXN",
      "BUDGET_HISTORY",
      "GOAL_CONTRIBUTION",
    ],
    System: ["SYNC_LOG", "NOTIFICATION", "DEVICE"],
    "Media & Attachments": ["ATTACHMENT"],
    "Payment & Merchants": ["PAYMENT_METHHOD", "MERCHART"],
    "Tags & Organization": ["TAG", "TRANSACTION_TAG", "SPLIT_TRANSACTION"],
    "Reports & Settings": [
      "REPORT",
      "APP_SETTINGS",
      "CATEGORY_BUDGET_TEMPLATE",
    ],
  };

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
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              Xuất dữ liệu
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
            {Object.entries(groupedCollections).map(([category, items]) => (
              <Select.OptGroup key={category} label={category}>
                {items.map((collectionName) => (
                  <Option key={collectionName} value={collectionName}>
                    {getCollectionDisplayName(collectionName)} ({collectionName}
                    )
                  </Option>
                ))}
              </Select.OptGroup>
            ))}
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

        {/* Data Table */}
        {selectedCollection && (
          <CollectionDataTable
            collectionName={selectedCollection}
            onRefresh={handleRefresh}
          />
        )}

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
