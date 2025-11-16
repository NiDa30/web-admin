import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Select,
  Card,
  Space,
  Button,
  Input,
  DatePicker,
  Row,
  Col,
  Statistic,
  Alert,
  message,
  Tooltip,
  Modal,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  ExportOutlined,
  SearchOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";
import dayjs from "dayjs";

const { Option } = Select;
const { RangePicker } = DatePicker;

function SyncLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    conflicts: 0,
    successRate: 0,
  });
  const [errorDetailModal, setErrorDetailModal] = useState({ visible: false, log: null });

  useEffect(() => {
    loadSyncLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filterStatus, searchText, dateRange]);

  const loadSyncLogs = async () => {
    try {
      setLoading(true);
      const logsRef = collection(db, COLLECTIONS.SYNC_LOGS);
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(500));
      const snapshot = await getDocs(q);

      const loadedLogs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedLogs.push({
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || null,
        });
      });

      setLogs(loadedLogs);

      // Calculate statistics
      const successCount = loadedLogs.filter((log) => log.status === "SUCCESS").length;
      const failedCount = loadedLogs.filter((log) => log.status === "FAILED").length;
      const conflictCount = loadedLogs.filter((log) => log.status === "CONFLICT").length;
      const total = loadedLogs.length;

      setStats({
        total,
        success: successCount,
        failed: failedCount,
        conflicts: conflictCount,
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      });
    } catch (error) {
      console.error("Error loading sync logs:", error);
      message.error(`Lỗi khi tải log đồng bộ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (filterStatus !== "all") {
      filtered = filtered.filter((log) => log.status === filterStatus);
    }

    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.userId?.toLowerCase().includes(lowerSearch) ||
          log.deviceId?.toLowerCase().includes(lowerSearch) ||
          log.errorMessage?.toLowerCase().includes(lowerSearch) ||
          log.syncType?.toLowerCase().includes(lowerSearch)
      );
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((log) => {
        if (!log.timestamp) return false;
        const logDate = dayjs(log.timestamp);
        return (
          logDate.isAfter(dateRange[0].subtract(1, "day")) &&
          logDate.isBefore(dateRange[1].add(1, "day"))
        );
      });
    }

    setFilteredLogs(filtered);
  };

  const getStatusTag = (status) => {
    switch (status) {
      case "SUCCESS":
        return <Tag color="green" icon={<CheckCircleOutlined />}>Thành công</Tag>;
      case "FAILED":
        return <Tag color="red" icon={<CloseCircleOutlined />}>Thất bại</Tag>;
      case "CONFLICT":
        return <Tag color="orange" icon={<WarningOutlined />}>Xung đột</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Thời gian", "Người dùng", "Thiết bị", "Loại", "Trạng thái", "Số bản ghi", "Lỗi"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp ? dayjs(log.timestamp).format("DD/MM/YYYY HH:mm:ss") : "",
          log.userId || "",
          log.deviceId || "",
          log.syncType || "",
          log.status || "",
          log.recordCount || 0,
          log.errorMessage || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sync_logs_${dayjs().format("YYYY-MM-DD")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("Đã xuất file CSV thành công!");
  };

  const columns = [
    {
      title: "Thời gian",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 180,
      render: (timestamp) =>
        timestamp ? dayjs(timestamp).format("DD/MM/YYYY HH:mm:ss") : "N/A",
      sorter: (a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return a.timestamp.getTime() - b.timestamp.getTime();
      },
    },
    {
      title: "Người dùng",
      dataIndex: "userId",
      key: "userId",
      width: 150,
    },
    {
      title: "Thiết bị",
      dataIndex: "deviceId",
      key: "deviceId",
      width: 150,
    },
    {
      title: "Loại đồng bộ",
      dataIndex: "syncType",
      key: "syncType",
      width: 120,
      render: (type) => <Tag>{type || "N/A"}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => getStatusTag(status),
      filters: [
        { text: "Thành công", value: "SUCCESS" },
        { text: "Thất bại", value: "FAILED" },
        { text: "Xung đột", value: "CONFLICT" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Số bản ghi",
      dataIndex: "recordCount",
      key: "recordCount",
      width: 100,
      render: (count) => count || 0,
    },
    {
      title: "Hành động",
      key: "action",
      width: 100,
      render: (_, record) => {
        if (record.status === "FAILED" && record.errorMessage) {
          return (
            <Button
              size="small"
              icon={<WarningOutlined />}
              onClick={() => setErrorDetailModal({ visible: true, log: record })}
            >
              Chi tiết
            </Button>
          );
        }
        return "N/A";
      },
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <SyncOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18 }}>Quản lý Log Đồng bộ</span>
          </Space>
        }
        extra={
          <Space wrap size={[8, 8]}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadSyncLogs} 
              loading={loading}
              className="responsive-button"
            >
              <span className="hidden-sm">Làm mới</span>
            </Button>
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleExport}
              className="responsive-button"
            >
              <span className="hidden-sm">Xuất CSV</span>
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Tổng số" value={stats.total} prefix={<SyncOutlined />} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Thành công" value={stats.success} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#52c41a" }} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Thất bại" value={stats.failed} prefix={<CloseCircleOutlined />} valueStyle={{ color: "#ff4d4f" }} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Tỷ lệ thành công" value={stats.successRate} suffix="%" valueStyle={{ color: stats.successRate >= 90 ? "#52c41a" : "#faad14" }} />
          </Col>
        </Row>

        {/* Filters */}
        <Space wrap style={{ marginBottom: 16, width: "100%" }} size={[8, 8]}>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: "100%", minWidth: 200, maxWidth: 300 }}
            className="responsive-input"
          />
          <Select
            placeholder="Trạng thái"
            style={{ width: "100%", minWidth: 150, maxWidth: 200 }}
            value={filterStatus}
            onChange={setFilterStatus}
            className="responsive-select"
          >
            <Option value="all">Tất cả</Option>
            <Option value="SUCCESS">Thành công</Option>
            <Option value="FAILED">Thất bại</Option>
            <Option value="CONFLICT">Xung đột</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            style={{ width: "100%", maxWidth: 300 }}
            className="responsive-datepicker"
          />
          <Button 
            onClick={() => { setFilterStatus("all"); setSearchText(""); setDateRange(null); }}
            style={{ width: "100%", maxWidth: 150 }}
            className="responsive-button"
          >
            Xóa bộ lọc
          </Button>
        </Space>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredLogs}
            rowKey="id"
            pagination={{ 
              pageSize: 20, 
              showSizeChanger: true, 
              showTotal: (total) => `Tổng ${total} bản ghi`,
              responsive: true,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            scroll={{ x: 'max-content', y: 400 }}
            size="small"
          />
        </Spin>
      </Card>

      {/* Error Detail Modal */}
      <Modal
        title="Chi tiết Lỗi Đồng bộ"
        open={errorDetailModal.visible}
        onCancel={() => setErrorDetailModal({ visible: false, log: null })}
        footer={[
          <Button key="close" onClick={() => setErrorDetailModal({ visible: false, log: null })}>
            Đóng
          </Button>,
        ]}
      >
        {errorDetailModal.log && (
          <div>
            <Alert
              message="Lỗi"
              description={errorDetailModal.log.errorMessage || "Không có thông tin chi tiết"}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div>
              <strong>Thời gian:</strong> {errorDetailModal.log.timestamp ? dayjs(errorDetailModal.log.timestamp).format("DD/MM/YYYY HH:mm:ss") : "N/A"}
            </div>
            <div>
              <strong>Người dùng:</strong> {errorDetailModal.log.userId || "N/A"}
            </div>
            <div>
              <strong>Thiết bị:</strong> {errorDetailModal.log.deviceId || "N/A"}
            </div>
            <div>
              <strong>Loại đồng bộ:</strong> {errorDetailModal.log.syncType || "N/A"}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SyncLogsPage;
