// src/components/SidebarMenu.jsx
import React from "react";
import { Menu } from "antd";
import {
  UserOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  SettingOutlined,
  CloudSyncOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "Quản lý người dùng",
    },
    {
      key: "/admin/categories",
      icon: <AppstoreOutlined />,
      label: "Quản lý danh mục",
    },
    {
      key: "/admin/reports",
      icon: <BarChartOutlined />,
      label: "Báo cáo tổng hợp",
    },
    {
      key: "/admin/config",
      icon: <SettingOutlined />,
      label: "Cấu hình quy tắc",
    },
    {
      key: "/admin/sync-logs",
      icon: <CloudSyncOutlined />,
      label: "Quản lý Log đồng bộ",
    },
  ];

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      onClick={(e) => navigate(e.key)}
      items={items}
    />
  );
}

export default SidebarMenu;
