import React from "react";
import { Layout, Button } from "antd";
import { useNavigate } from "react-router-dom";

const { Header } = Layout;

function HeaderBar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAuth"); // xóa trạng thái login
    navigate("/login");
  };

  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ margin: 0, fontWeight: "bold", color: "#1890ff" }}>
        ⚡ Admin Dashboard
      </h2>
      <Button type="primary" danger onClick={handleLogout}>
        Đăng xuất
      </Button>
    </Header>
  );
}

export default HeaderBar;
