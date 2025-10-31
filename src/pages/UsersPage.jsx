import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  message,
  Popconfirm,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
  Spin,
  Empty,
  Avatar,
  Tooltip,
  Alert,
  Select,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  ReloadOutlined,
  CrownOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import userService from "../services/userService";
import { isFirebaseReady } from "../firebase";
import "../assets/css/pages/UsersPage.css";

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    locked: 0,
    admins: 0,
  });

  // Check Firebase connection on mount
  useEffect(() => {
    if (!isFirebaseReady()) {
      setError("Firebase chưa sẵn sàng. Vui lòng kiểm tra cấu hình.");
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    setLoading(true);
    let unsubscribe;

    try {
      unsubscribe = userService.subscribeToUsers(
        (fetchedUsers) => {
          setUsers(fetchedUsers);
          setFilteredUsers(fetchedUsers);
          setLoading(false);
          setError(null);
          calculateStats(fetchedUsers);
        },
        (err) => {
          console.error("Subscription error:", err);
          setError(`Lỗi tải dữ liệu: ${err.message}`);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Setup error:", err);
      setError(`Lỗi khởi tạo: ${err.message}`);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Filter users
  useEffect(() => {
    const lowerSearch = searchText.trim().toLowerCase();
    let filtered = users;

    if (lowerSearch) {
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(lowerSearch) ||
          u.email?.toLowerCase().includes(lowerSearch) ||
          u.id?.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((u) => u.accountStatus === statusFilter);
    }

    if (roleFilter !== "ALL") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchText, statusFilter, roleFilter, users]);

  // Calculate statistics
  const calculateStats = (userList) => {
    setStats({
      total: userList.length,
      active: userList.filter((u) => u.accountStatus === "ACTIVE").length,
      locked: userList.filter((u) => u.accountStatus === "LOCKED").length,
      admins: userList.filter((u) => u.role === "ADMIN").length,
    });
  };

  // Handle Lock/Unlock
  const handleLockUnlock = async (record) => {
    setActionLoading(record.id);

    try {
      const newStatus = await userService.toggleUserStatus(
        record.id,
        record.accountStatus
      );

      message.success(
        `${record.name} đã được ${
          newStatus === "LOCKED" ? "khóa" : "mở khóa"
        } thành công!`
      );
    } catch (err) {
      console.error("Toggle error:", err);
      message.error(`Lỗi: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedUsers = await userService.getAllUsers();
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
      calculateStats(fetchedUsers);
      message.success("Đã làm mới danh sách!");
    } catch (err) {
      console.error("Refresh error:", err);
      message.error(`Không thể làm mới: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString("vi-VN");
    } catch {
      return "Invalid date";
    }
  };

  // Table columns
  const columns = [
    {
      title: "Avatar",
      dataIndex: "avatarURL",
      key: "avatar",
      width: 80,
      render: (url, record) => (
        <Avatar
          size={48}
          src={url}
          icon={<UserOutlined />}
          style={{
            backgroundColor: record.role === "ADMIN" ? "#f50" : "#1890ff",
          }}
        />
      ),
    },
    {
      title: "Họ và tên",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            <strong>{text || "N/A"}</strong>
            {record.role === "ADMIN" && (
              <Tooltip title="Quản trị viên">
                <CrownOutlined style={{ color: "#f50" }} />
              </Tooltip>
            )}
          </Space>
          <small style={{ color: "#999" }}>ID: {record.id}</small>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => (
        <a href={`mailto:${email}`} style={{ color: "#1890ff" }}>
          {email || "N/A"}
        </a>
      ),
    },
    {
      title: "SĐT",
      dataIndex: "phoneNumber",
      key: "phone",
      render: (phone) => phone || <span style={{ color: "#999" }}>N/A</span>,
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role) =>
        role === "ADMIN" ? (
          <Tag color="red" icon={<CrownOutlined />}>
            Quản trị
          </Tag>
        ) : (
          <Tag color="blue" icon={<UserOutlined />}>
            Người dùng
          </Tag>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "accountStatus",
      key: "status",
      render: (status) =>
        status === "ACTIVE" ? (
          <Tag color="green" icon={<UnlockOutlined />}>
            Hoạt động
          </Tag>
        ) : (
          <Tag color="red" icon={<LockOutlined />}>
            Đã khóa
          </Tag>
        ),
    },
    {
      title: "Đăng nhập cuối",
      dataIndex: "lastLoginTime",
      key: "lastLogin",
      render: (date) => (
        <small style={{ color: "#666" }}>{formatDate(date)}</small>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Popconfirm
            title={`Bạn có chắc muốn ${
              record.accountStatus === "ACTIVE" ? "khóa" : "mở khóa"
            } tài khoản này?`}
            description={`Tài khoản: ${record.email}`}
            onConfirm={() => handleLockUnlock(record)}
            okText="Xác nhận"
            cancelText="Hủy"
            okButtonProps={{
              danger: record.accountStatus === "ACTIVE",
            }}
          >
            <Button
              type={record.accountStatus === "ACTIVE" ? "default" : "primary"}
              danger={record.accountStatus === "ACTIVE"}
              icon={
                record.accountStatus === "ACTIVE" ? (
                  <LockOutlined />
                ) : (
                  <UnlockOutlined />
                )
              }
              loading={actionLoading === record.id}
              disabled={record.role === "ADMIN"}
            >
              {record.accountStatus === "ACTIVE" ? "Khóa" : "Mở khóa"}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="users-page">
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
            <Button size="small" onClick={handleRefresh}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card stat-total">
            <Statistic
              title="Tổng người dùng"
              value={stats.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card stat-active">
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              prefix={<UnlockOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card stat-locked">
            <Statistic
              title="Đã khóa"
              value={stats.locked}
              prefix={<LockOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card stat-admin">
            <Statistic
              title="Quản trị viên"
              value={stats.admins}
              prefix={<CrownOutlined />}
              valueStyle={{ color: "#f50" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        title={
          <Space>
            <UserOutlined style={{ fontSize: 20 }} />
            <span style={{ fontSize: 18 }}>Quản lý người dùng</span>
          </Space>
        }
        className="users-table-card"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Làm mới
          </Button>
        }
      >
        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="🔍 Tìm theo tên, email hoặc ID"
            prefix={<SearchOutlined />}
            allowClear
            size="large"
            style={{ maxWidth: 400, borderRadius: 8 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            size="large"
            style={{ width: 200 }}
            options={[
              { value: "ALL", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "ACTIVE" },
              { value: "LOCKED", label: "LOCKED" },
            ]}
          />

          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            size="large"
            style={{ width: 200 }}
            options={[
              { value: "ALL", label: "Tất cả vai trò" },
              { value: "USER", label: "USER" },
              { value: "ADMIN", label: "ADMIN" },
            ]}
          />
        </div>

        {/* Table */}
        <Spin spinning={loading} tip="Đang tải dữ liệu...">
          {filteredUsers.length === 0 && !loading ? (
            <Empty
              description="Không tìm thấy người dùng nào"
              style={{ margin: "60px 0" }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredUsers}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng ${total} người dùng`,
                pageSizeOptions: ["5", "10", "20", "50"],
              }}
              scroll={{ x: 1200 }}
              bordered
              className="users-table"
              rowClassName={(record) =>
                record.accountStatus === "LOCKED" ? "locked-row" : ""
              }
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}

export default UsersPage;
