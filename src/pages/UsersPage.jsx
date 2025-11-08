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
  Modal,
  Form,
  Switch,
  Badge,
  Drawer,
  List,
  Typography,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  ReloadOutlined,
  CrownOutlined,
  WarningOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  BellOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import userService from "../services/userService";
import notificationService from "../services/notificationService";
import { isFirebaseReady, auth } from "../firebase";
import dayjs from "dayjs";
import "../assets/css/pages/UsersPage.css";

const { Text, Paragraph } = Typography;

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    locked: 0,
    admins: 0,
  });

  // User creation modal
  const [createUserModalVisible, setCreateUserModalVisible] = useState(false);
  const [createUserForm] = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);

  // Role change confirmation modal
  const [roleChangeModalVisible, setRoleChangeModalVisible] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);

  // Notifications
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load current user info
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const currentAuthUser = auth.currentUser;
        if (currentAuthUser && currentAuthUser.email) {
          // Check if email is Super Admin email first
          const isSuperAdminEmail = userService.isSuperAdminEmail(
            currentAuthUser.email
          );
          if (isSuperAdminEmail) {
            console.log(
              "✅ Super Admin email detected:",
              currentAuthUser.email
            );
            setIsSuperAdmin(true);
          }

          const userData = await userService.getUserByEmail(
            currentAuthUser.email
          );
          if (userData) {
            setCurrentUser(userData);
            // Check Super Admin status (either by email or by isSuperAdmin flag/role)
            const superAdmin =
              isSuperAdminEmail ||
              (await userService.isSuperAdmin(userData.id));
            setIsSuperAdmin(superAdmin);
            console.log("🔍 Current user:", {
              email: userData.email,
              id: userData.id,
              role: userData.role,
              isSuperAdmin: userData.isSuperAdmin,
              computedSuperAdmin: superAdmin,
            });
          }
        }
      } catch (err) {
        console.error("Error loading current user:", err);
      }
    };

    loadCurrentUser();
  }, []);

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
        async (fetchedUsers) => {
          setUsers(fetchedUsers);
          setFilteredUsers(fetchedUsers);
          setLoading(false);
          setError(null);
          calculateStats(fetchedUsers);

          // Update current user info if needed
          const currentAuthUser = auth.currentUser;
          if (currentAuthUser && currentAuthUser.email) {
            // Check if email is Super Admin email first
            const isSuperAdminEmail = userService.isSuperAdminEmail(
              currentAuthUser.email
            );
            if (isSuperAdminEmail) {
              console.log(
                "✅ Super Admin email detected in subscription:",
                currentAuthUser.email
              );
              setIsSuperAdmin(true);
            }

            const userData = fetchedUsers.find(
              (u) => u.email === currentAuthUser.email
            );
            if (userData) {
              setCurrentUser(userData);
              // Check Super Admin status (either by email or by isSuperAdmin flag/role)
              const superAdmin =
                isSuperAdminEmail ||
                (await userService.isSuperAdmin(userData.id));
              setIsSuperAdmin(superAdmin);
              console.log("🔍 Current user updated:", {
                email: userData.email,
                id: userData.id,
                role: userData.role,
                isSuperAdmin: userData.isSuperAdmin,
                computedSuperAdmin: superAdmin,
              });
            }
          }
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

    // Sort: PENDING users first, then ACTIVE, then LOCKED
    filtered.sort((a, b) => {
      const statusOrder = { PENDING: 0, ACTIVE: 1, LOCKED: 2 };
      const aOrder = statusOrder[a.accountStatus] ?? 3;
      const bOrder = statusOrder[b.accountStatus] ?? 3;
      return aOrder - bOrder;
    });

    setFilteredUsers(filtered);
  }, [searchText, statusFilter, roleFilter, users]);

  // Calculate statistics
  const calculateStats = (userList) => {
    setStats({
      total: userList.length,
      active: userList.filter((u) => u.accountStatus === "ACTIVE").length,
      locked: userList.filter((u) => u.accountStatus === "LOCKED").length,
      pending: userList.filter((u) => u.accountStatus === "PENDING").length,
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

  // Handle Approve User (approve PENDING user)
  const handleApproveUser = async (record) => {
    if (!currentUser) {
      message.error("Không thể xác định người dùng hiện tại");
      return;
    }

    setActionLoading(record.id);

    try {
      // Update user status from PENDING to ACTIVE
      const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
      const { db } = await import("../firebase");
      const { COLLECTIONS } = await import("../constants/collections");

      const userRef = doc(db, COLLECTIONS.USERS, record.id);
      await updateDoc(userRef, {
        accountStatus: "ACTIVE",
        updatedAt: Timestamp.now(),
      });

      // Create notification for the approved user
      try {
        await notificationService.createNotification({
          userID: record.id,
          type: "SYSTEM",
          title: "Tài khoản của bạn đã được phê duyệt",
          message: `Quản trị viên ${
            currentUser.name || currentUser.email
          } đã phê duyệt tài khoản của bạn. Bạn có thể đăng nhập và sử dụng hệ thống ngay bây giờ.`,
          priority: "HIGH",
          relatedEntityType: "USER",
          relatedEntityID: record.id,
        });
      } catch (notifError) {
        console.warn("Failed to create approval notification:", notifError);
      }

      message.success(
        `Đã phê duyệt tài khoản ${record.name} thành công! Người dùng có thể đăng nhập ngay bây giờ.`
      );
    } catch (err) {
      console.error("Approve error:", err);
      message.error(`Lỗi: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Role Change - Show confirmation modal first
  const handleRoleChangeClick = (record, newRole) => {
    setPendingRoleChange({ record, newRole });
    setRoleChangeModalVisible(true);
  };

  // Confirm Role Change
  const handleRoleChangeConfirm = async () => {
    if (!pendingRoleChange || !currentUser) {
      message.error("Không thể xác định người dùng hiện tại");
      return;
    }

    const { record, newRole } = pendingRoleChange;
    setActionLoading(record.id);
    setRoleChangeModalVisible(false);

    try {
      // Change role
      await userService.changeUserRole(record.id, newRole, currentUser.id);

      // Create notification for the user
      try {
        await notificationService.createAdminRoleNotification(
          record.id,
          newRole,
          currentUser.email,
          currentUser.name || currentUser.email
        );
      } catch (notifError) {
        console.warn("Failed to create notification:", notifError);
        // Don't fail the role change if notification fails
      }

      message.success(
        `${record.name} đã được ${
          newRole === "ADMIN" ? "cấp quyền Admin" : "hạ xuống Người dùng"
        } thành công! Thông báo đã được gửi đến người dùng.`
      );
    } catch (err) {
      console.error("Role change error:", err);
      message.error(`Lỗi: ${err.message}`);
    } finally {
      setActionLoading(null);
      setPendingRoleChange(null);
    }
  };

  // Handle Create User
  const handleCreateUser = async (values) => {
    if (!currentUser) {
      message.error("Không thể xác định người dùng hiện tại");
      return;
    }

    setCreatingUser(true);
    try {
      const isAdmin = values.isAdmin || false;

      // Check if email is super admin email
      const isSuperAdminEmail = userService.isSuperAdminEmail(values.email);
      if (isSuperAdminEmail && !isAdmin) {
        message.warning(
          "Email này là Super Admin. Bạn có muốn tạo với quyền Admin không?"
        );
        createUserForm.setFieldsValue({ isAdmin: true });
        setCreatingUser(false);
        return;
      }

      // Create user
      const newUserId = await userService.createUser(
        {
          email: values.email,
          name: values.name,
          phoneNumber: values.phoneNumber,
        },
        isAdmin,
        currentUser.id
      );

      // Create notification
      try {
        await notificationService.createAccountCreationNotification(
          newUserId,
          currentUser.email,
          currentUser.name || currentUser.email,
          isAdmin
        );
      } catch (notifError) {
        console.warn("Failed to create notification:", notifError);
      }

      message.success(
        `Đã tạo tài khoản ${isAdmin ? "Quản trị viên" : "Người dùng"} cho ${
          values.email
        } thành công! Thông báo đã được gửi.`
      );

      // Reset form and close modal
      createUserForm.resetFields();
      setCreateUserModalVisible(false);
    } catch (err) {
      console.error("Create user error:", err);
      message.error(`Lỗi: ${err.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  // Load notifications
  useEffect(() => {
    if (!currentUser) {
      console.log("⏳ Waiting for currentUser to load notifications...");
      return;
    }

    console.log("📬 Loading notifications for user:", {
      id: currentUser.id,
      email: currentUser.email,
      isSuperAdmin: isSuperAdmin,
    });

    const loadNotifications = async () => {
      try {
        const notifs = await notificationService.getUserNotifications(
          currentUser.id
        );
        console.log("📬 Notifications loaded:", {
          count: notifs.length,
          unread: notifs.filter((n) => !n.isRead).length,
          notifications: notifs.map((n) => ({
            id: n.id,
            title: n.title,
            isRead: n.isRead,
            createdAt: n.createdAt,
          })),
        });
        setNotifications(notifs);
        const unread = notifs.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("❌ Error loading notifications:", err);
      }
    };

    loadNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToUserNotifications(
      currentUser.id,
      (notifs) => {
        console.log("📬 Real-time notifications update:", {
          count: notifs.length,
          unread: notifs.filter((n) => !n.isRead).length,
        });
        setNotifications(notifs);
        const unread = notifs.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      },
      (err) => {
        console.error("❌ Notification subscription error:", err);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, isSuperAdmin]);

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
      render: (role, record) => (
        <Space>
          {role === "ADMIN" ? (
            <Tag color="red" icon={<CrownOutlined />}>
              {record.isSuperAdmin ? "Super Admin" : "Quản trị"}
            </Tag>
          ) : (
            <Tag color="blue" icon={<UserOutlined />}>
              Người dùng
            </Tag>
          )}
          {record.isSuperAdmin && (
            <Tooltip title="Super Admin - Quyền cao nhất">
              <CrownOutlined style={{ color: "#f50" }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "accountStatus",
      key: "status",
      render: (status) => {
        if (status === "ACTIVE") {
          return (
            <Tag color="green" icon={<UnlockOutlined />}>
              Hoạt động
            </Tag>
          );
        } else if (status === "PENDING") {
          return (
            <Tag color="orange" icon={<WarningOutlined />}>
              Chờ phê duyệt
            </Tag>
          );
        } else {
          return (
            <Tag color="red" icon={<LockOutlined />}>
              Đã khóa
            </Tag>
          );
        }
      },
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
      width: 250,
      fixed: "right",
      render: (_, record) => {
        const isCurrentUser = currentUser && currentUser.id === record.id;
        const canApprove = isSuperAdmin && record.accountStatus === "PENDING";
        const canChangeRole =
          isSuperAdmin &&
          !isCurrentUser &&
          !record.isSuperAdmin &&
          record.role !== "ADMIN" &&
          record.accountStatus !== "PENDING"; // Only super admin can promote users to admin (not pending users)
        const canDemoteAdmin =
          isSuperAdmin &&
          !isCurrentUser &&
          !record.isSuperAdmin &&
          record.role === "ADMIN"; // Only super admin can demote other admins
        const canLockUnlock =
          isSuperAdmin &&
          record.accountStatus !== "PENDING" &&
          !record.isSuperAdmin &&
          !isCurrentUser;

        return (
          <Space>
            {/* Approve Pending User - Only Super Admin can do this */}
            {canApprove && (
              <Popconfirm
                title="Phê duyệt tài khoản"
                description={`Bạn có chắc muốn phê duyệt tài khoản ${record.name} (${record.email})? Người dùng này sẽ có thể đăng nhập vào hệ thống.`}
                onConfirm={() => handleApproveUser(record)}
                okText="Xác nhận"
                cancelText="Hủy"
                okButtonProps={{ type: "primary" }}
              >
                <Tooltip title="Phê duyệt tài khoản">
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading === record.id}
                    size="small"
                  >
                    Phê duyệt
                  </Button>
                </Tooltip>
              </Popconfirm>
            )}

            {/* Lock/Unlock - Only for ACTIVE/LOCKED users, not PENDING */}
            {canLockUnlock && (
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
                  type={
                    record.accountStatus === "ACTIVE" ? "default" : "primary"
                  }
                  danger={record.accountStatus === "ACTIVE"}
                  icon={
                    record.accountStatus === "ACTIVE" ? (
                      <LockOutlined />
                    ) : (
                      <UnlockOutlined />
                    )
                  }
                  loading={actionLoading === record.id}
                  size="small"
                >
                  {record.accountStatus === "ACTIVE" ? "Khóa" : "Mở khóa"}
                </Button>
              </Popconfirm>
            )}

            {/* Promote to Admin - Only Super Admin can do this */}
            {canChangeRole && (
              <Tooltip title="Cấp quyền Admin">
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  loading={actionLoading === record.id}
                  size="small"
                  onClick={() => handleRoleChangeClick(record, "ADMIN")}
                >
                  Cấp Admin
                </Button>
              </Tooltip>
            )}

            {/* Demote Admin - Only Super Admin can do this */}
            {canDemoteAdmin && (
              <Tooltip title="Hạ cấp xuống Người dùng">
                <Button
                  type="default"
                  danger
                  icon={<UserDeleteOutlined />}
                  loading={actionLoading === record.id}
                  size="small"
                  onClick={() => handleRoleChangeClick(record, "USER")}
                >
                  Hạ cấp
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
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

      {/* Debug Info for Super Admin */}
      {isSuperAdmin && (
        <Alert
          message="Super Admin Mode"
          description={`Bạn đang đăng nhập với tài khoản Super Admin (${currentUser?.email}). Bạn có thể phê duyệt tài khoản chờ phê duyệt và quản lý quyền của người dùng.`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          closable
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
        {stats.pending > 0 && (
          <Col xs={24} sm={12} md={6}>
            <Card
              className="stat-card"
              style={{
                border: "2px solid #ff9800",
                backgroundColor: "#fff7e6",
              }}
            >
              <Statistic
                title="Chờ phê duyệt"
                value={stats.pending}
                prefix={<WarningOutlined />}
                valueStyle={{ color: "#ff9800" }}
              />
              {isSuperAdmin && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#ff9800" }}>
                  Click vào bảng để phê duyệt
                </div>
              )}
            </Card>
          </Col>
        )}
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
          <Space>
            {isSuperAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateUserModalVisible(true)}
              >
                Tạo tài khoản
              </Button>
            )}
            <Badge count={unreadCount} size="small" offset={[-5, 5]}>
              <Button
                icon={<BellOutlined />}
                onClick={() => {
                  console.log("🔔 Opening notifications drawer:", {
                    notificationsCount: notifications.length,
                    unreadCount: unreadCount,
                    currentUserId: currentUser?.id,
                    currentUserEmail: currentUser?.email,
                  });
                  setNotificationsVisible(true);
                }}
              >
                Thông báo {unreadCount > 0 && `(${unreadCount})`}
              </Button>
            </Badge>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Làm mới
            </Button>
          </Space>
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
              { value: "PENDING", label: "Chờ phê duyệt" },
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "LOCKED", label: "Đã khóa" },
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

      {/* Create User Modal */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: "#1890ff" }} />
            <span>Tạo tài khoản mới</span>
          </Space>
        }
        open={createUserModalVisible}
        onCancel={() => {
          createUserForm.resetFields();
          setCreateUserModalVisible(false);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createUserForm}
          layout="vertical"
          onFinish={handleCreateUser}
          initialValues={{ isAdmin: false }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              placeholder="example@email.com"
              prefix={<UserOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input placeholder="Nguyễn Văn A" size="large" />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phoneNumber">
            <Input placeholder="0123456789" size="large" />
          </Form.Item>

          <Form.Item
            label="Quyền truy cập"
            name="isAdmin"
            valuePropName="checked"
            tooltip="Bật để tạo tài khoản với quyền Quản trị viên"
          >
            <Switch
              checkedChildren="Quản trị viên"
              unCheckedChildren="Người dùng"
            />
          </Form.Item>

          <Alert
            message="Thông báo"
            description="Tài khoản mới sẽ được tạo và thông báo sẽ được gửi đến email của người dùng."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setCreateUserModalVisible(false)}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={creatingUser}
                icon={<CheckCircleOutlined />}
              >
                Tạo tài khoản
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Role Change Confirmation Modal */}
      <Modal
        title={
          <Space>
            <CrownOutlined style={{ color: "#f50" }} />
            <span>
              {pendingRoleChange?.newRole === "ADMIN"
                ? "Cấp quyền Quản trị viên"
                : "Hạ cấp Quản trị viên"}
            </span>
          </Space>
        }
        open={roleChangeModalVisible}
        onOk={handleRoleChangeConfirm}
        onCancel={() => {
          setRoleChangeModalVisible(false);
          setPendingRoleChange(null);
        }}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{
          danger: pendingRoleChange?.newRole === "USER",
          type: "primary",
        }}
        width={600}
      >
        {pendingRoleChange && (
          <div>
            <Alert
              message="Xác nhận thay đổi quyền"
              description={
                <div>
                  <Paragraph>
                    Bạn có chắc muốn{" "}
                    <strong>
                      {pendingRoleChange.newRole === "ADMIN"
                        ? "cấp quyền Quản trị viên"
                        : "hạ cấp Quản trị viên"}
                    </strong>{" "}
                    cho:
                  </Paragraph>
                  <Card size="small" style={{ marginTop: 16 }}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <div>
                        <Text strong>Người dùng:</Text>{" "}
                        {pendingRoleChange.record.name}
                      </div>
                      <div>
                        <Text strong>Email:</Text>{" "}
                        {pendingRoleChange.record.email}
                      </div>
                      <div>
                        <Text strong>Vai trò hiện tại:</Text>{" "}
                        <Tag
                          color={
                            pendingRoleChange.record.role === "ADMIN"
                              ? "red"
                              : "blue"
                          }
                        >
                          {pendingRoleChange.record.role === "ADMIN"
                            ? "Quản trị viên"
                            : "Người dùng"}
                        </Tag>
                      </div>
                      <div>
                        <Text strong>Vai trò mới:</Text>{" "}
                        <Tag
                          color={
                            pendingRoleChange.newRole === "ADMIN"
                              ? "red"
                              : "blue"
                          }
                        >
                          {pendingRoleChange.newRole === "ADMIN"
                            ? "Quản trị viên"
                            : "Người dùng"}
                        </Tag>
                      </div>
                    </Space>
                  </Card>
                  {pendingRoleChange.newRole === "ADMIN" && (
                    <Alert
                      message="Lưu ý"
                      description="Người dùng này sẽ có quyền Quản trị viên nhưng không thể cấp quyền cho người khác hoặc hạ cấp Admin khác. Chỉ Super Admin mới có quyền này."
                      type="warning"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  )}
                  <Alert
                    message="Thông báo"
                    description="Thông báo sẽ được gửi đến email của người dùng về việc thay đổi quyền."
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                </div>
              }
              type="warning"
              showIcon
            />
          </div>
        )}
      </Modal>

      {/* Notifications Drawer */}
      <Drawer
        title={
          <Space>
            <BellOutlined />
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ marginLeft: 8 }} />
            )}
          </Space>
        }
        placement="right"
        onClose={() => setNotificationsVisible(false)}
        open={notificationsVisible}
        width={500}
      >
        {!currentUser ? (
          <Empty description="Đang tải thông báo..." />
        ) : notifications.length === 0 ? (
          <Empty description="Không có thông báo nào" />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  backgroundColor: item.isRead ? "#fff" : "#f0f7ff",
                  padding: 16,
                  marginBottom: 8,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  if (!item.isRead) {
                    try {
                      await notificationService.markAsRead(item.id);
                    } catch (err) {
                      console.error("Error marking notification as read:", err);
                    }
                  }
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={
                        item.priority === "HIGH" ||
                        item.priority === "URGENT" ? (
                          <WarningOutlined />
                        ) : (
                          <InfoCircleOutlined />
                        )
                      }
                      style={{
                        backgroundColor:
                          item.priority === "HIGH" || item.priority === "URGENT"
                            ? "#ff4d4f"
                            : "#1890ff",
                      }}
                    />
                  }
                  title={
                    <Space>
                      <Text strong={!item.isRead}>{item.title}</Text>
                      {!item.isRead && <Badge status="processing" text="Mới" />}
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph
                        ellipsis={{ rows: 3, expandable: true }}
                        style={{ marginBottom: 8 }}
                      >
                        {item.message}
                      </Paragraph>
                      <Space>
                        <Tag color="blue">{item.type}</Tag>
                        {item.priority && (
                          <Tag
                            color={
                              item.priority === "URGENT"
                                ? "red"
                                : item.priority === "HIGH"
                                ? "orange"
                                : "default"
                            }
                          >
                            {item.priority}
                          </Tag>
                        )}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.createdAt
                            ? dayjs(item.createdAt).format("DD/MM/YYYY HH:mm")
                            : "N/A"}
                        </Text>
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </div>
  );
}

export default UsersPage;
