import React, { useState, useEffect } from "react";
import {
  Table,
  Card,
  Select,
  DatePicker,
  Input,
  Button,
  Space,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Spin,
  Empty,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  HistoryOutlined,
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LoginOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import activityLogService from "../services/activityLogService";
import { isFirebaseReady } from "../firebase";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;

function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: null,
    userId: null,
    entityType: null,
    dateRange: null,
  });
  const [searchText, setSearchText] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    logins: 0,
    updates: 0,
    creates: 0,
    deletes: 0,
  });

  useEffect(() => {
    if (isFirebaseReady()) {
      loadActivityLogs();
    }
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filters, searchText]);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const allLogs = await activityLogService.getActivityLogs({
        limit: 500,
      });
      setLogs(allLogs);

      // Calculate statistics
      const loginCount = allLogs.filter((log) => log.action === "LOGIN").length;
      const updateCount = allLogs.filter((log) => log.action?.includes("UPDATE")).length;
      const createCount = allLogs.filter((log) => log.action?.includes("CREATE")).length;
      const deleteCount = allLogs.filter((log) => log.action?.includes("DELETE")).length;

      setStats({
        total: allLogs.length,
        logins: loginCount,
        updates: updateCount,
        creates: createCount,
        deletes: deleteCount,
      });
    } catch (error) {
      console.error("Error loading activity logs:", error);
      message.error(`Lỗi khi tải nhật ký hoạt động: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Apply filters
    if (filters.action) {
      filtered = filtered.filter((log) => log.action === filters.action);
    }
    if (filters.userId) {
      filtered = filtered.filter((log) => log.userId === filters.userId);
    }
    if (filters.entityType) {
      filtered = filtered.filter((log) => log.entityType === filters.entityType);
    }
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      filtered = filtered.filter((log) => {
        if (!log.timestamp) return false;
        const logDate = dayjs(log.timestamp);
        return (
          logDate.isAfter(filters.dateRange[0].subtract(1, "day")) &&
          logDate.isBefore(filters.dateRange[1].add(1, "day"))
        );
      });
    }

    // Apply search
    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.userName?.toLowerCase().includes(lowerSearch) ||
          log.userEmail?.toLowerCase().includes(lowerSearch) ||
          log.action?.toLowerCase().includes(lowerSearch) ||
          log.entityType?.toLowerCase().includes(lowerSearch) ||
          JSON.stringify(log.details || {}).toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action) => {
    if (action === "LOGIN") return <LoginOutlined style={{ color: "#52c41a" }} />;
    if (action === "LOGOUT") return <LogoutOutlined style={{ color: "#ff4d4f" }} />;
    if (action?.includes("CREATE")) return <PlusOutlined style={{ color: "#1890ff" }} />;
    if (action?.includes("UPDATE")) return <EditOutlined style={{ color: "#faad14" }} />;
    if (action?.includes("DELETE")) return <DeleteOutlined style={{ color: "#ff4d4f" }} />;
    if (action?.includes("LOCK")) return <LockOutlined style={{ color: "#ff4d4f" }} />;
    if (action?.includes("UNLOCK")) return <UnlockOutlined style={{ color: "#52c41a" }} />;
    return <HistoryOutlined />;
  };

  const getActionColor = (action) => {
    if (action === "LOGIN") return "green";
    if (action === "LOGOUT") return "red";
    if (action?.includes("CREATE")) return "blue";
    if (action?.includes("UPDATE")) return "orange";
    if (action?.includes("DELETE")) return "red";
    if (action?.includes("LOCK")) return "red";
    if (action?.includes("UNLOCK")) return "green";
    return "default";
  };

  const formatAction = (action) => {
    const actionMap = {
      LOGIN: "Đăng nhập",
      LOGOUT: "Đăng xuất",
      CREATE_USER: "Tạo người dùng",
      UPDATE_USER: "Cập nhật người dùng",
      DELETE_USER: "Xóa người dùng",
      LOCK_USER: "Khóa tài khoản",
      UNLOCK_USER: "Mở khóa tài khoản",
      APPROVE_USER: "Phê duyệt tài khoản",
      CHANGE_ROLE: "Thay đổi quyền",
      CREATE_CATEGORY: "Tạo danh mục",
      UPDATE_CATEGORY: "Cập nhật danh mục",
      DELETE_CATEGORY: "Xóa danh mục",
    };
    return actionMap[action] || action;
  };

  const handleExport = () => {
    const csvContent = [
      ["Thời gian", "Người dùng", "Email", "Hành động", "Loại", "ID", "Chi tiết"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp ? dayjs(log.timestamp).format("DD/MM/YYYY HH:mm:ss") : "",
          log.userName || "",
          log.userEmail || "",
          log.action || "",
          log.entityType || "",
          log.entityId || "",
          JSON.stringify(log.details || {}),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `activity_logs_${dayjs().format("YYYY-MM-DD")}.csv`);
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
      key: "user",
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: "bold" }}>{record.userName || "N/A"}</div>
          <div style={{ fontSize: 12, color: "#999" }}>{record.userEmail || ""}</div>
        </div>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 200,
      render: (action) => (
        <Space>
          {getActionIcon(action)}
          <Tag color={getActionColor(action)}>{formatAction(action)}</Tag>
        </Space>
      ),
      filters: [
        { text: "Đăng nhập", value: "LOGIN" },
        { text: "Đăng xuất", value: "LOGOUT" },
        { text: "Tạo", value: "CREATE" },
        { text: "Cập nhật", value: "UPDATE" },
        { text: "Xóa", value: "DELETE" },
        { text: "Khóa/Mở khóa", value: "LOCK" },
      ],
      onFilter: (value, record) => {
        if (value === "CREATE") return record.action?.includes("CREATE");
        if (value === "UPDATE") return record.action?.includes("UPDATE");
        if (value === "DELETE") return record.action?.includes("DELETE");
        if (value === "LOCK") return record.action?.includes("LOCK") || record.action?.includes("UNLOCK");
        return record.action === value;
      },
    },
    {
      title: "Loại thực thể",
      dataIndex: "entityType",
      key: "entityType",
      width: 120,
      render: (type) => (type ? <Tag>{type}</Tag> : "N/A"),
    },
    {
      title: "Chi tiết",
      key: "details",
      render: (_, record) => {
        const details = record.details || {};
        if (Object.keys(details).length === 0) return "N/A";
        return (
          <Tooltip title={JSON.stringify(details, null, 2)}>
            <div style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
              {JSON.stringify(details).substring(0, 50)}...
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "IP Address",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 150,
      render: (ip) => ip || "N/A",
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Nhật ký Hoạt động</span>
          </Space>
        }
        extra={
          <Space wrap size={[8, 8]}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadActivityLogs} 
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
            <Statistic title="Tổng số" value={stats.total} prefix={<HistoryOutlined />} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Đăng nhập" value={stats.logins} prefix={<LoginOutlined />} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Cập nhật" value={stats.updates} prefix={<EditOutlined />} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Tạo mới" value={stats.creates} prefix={<PlusOutlined />} />
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
            placeholder="Hành động"
            style={{ width: "100%", minWidth: 150, maxWidth: 200 }}
            value={filters.action}
            onChange={(value) => setFilters({ ...filters, action: value })}
            allowClear
            className="responsive-select"
          >
            <Option value="LOGIN">Đăng nhập</Option>
            <Option value="LOGOUT">Đăng xuất</Option>
            <Option value="CREATE_USER">Tạo người dùng</Option>
            <Option value="UPDATE_USER">Cập nhật người dùng</Option>
            <Option value="DELETE_USER">Xóa người dùng</Option>
            <Option value="LOCK_USER">Khóa tài khoản</Option>
            <Option value="UNLOCK_USER">Mở khóa tài khoản</Option>
            <Option value="APPROVE_USER">Phê duyệt</Option>
            <Option value="CHANGE_ROLE">Thay đổi quyền</Option>
          </Select>
          <Select
            placeholder="Loại thực thể"
            style={{ width: "100%", minWidth: 150, maxWidth: 200 }}
            value={filters.entityType}
            onChange={(value) => setFilters({ ...filters, entityType: value })}
            allowClear
            className="responsive-select"
          >
            <Option value="USER">Người dùng</Option>
            <Option value="CATEGORY">Danh mục</Option>
            <Option value="TRANSACTION">Giao dịch</Option>
            <Option value="BUDGET">Ngân sách</Option>
          </Select>
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            format="DD/MM/YYYY"
            style={{ width: "100%", maxWidth: 300 }}
            className="responsive-datepicker"
          />
          <Button 
            onClick={() => setFilters({ action: null, userId: null, entityType: null, dateRange: null })}
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
    </div>
  );
}

export default ActivityLogsPage;

