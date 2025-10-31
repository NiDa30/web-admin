import React, { useState, useEffect } from "react";
import { Table, Tag, Select, Card } from "antd";

const { Option } = Select;

// Dữ liệu giả lập
const mockLogs = [
  { id: 1, device: "Device A", status: "success", timestamp: "2025-10-01 08:00" },
  { id: 2, device: "Device B", status: "error", timestamp: "2025-10-01 08:05" },
  { id: 3, device: "Device A", status: "success", timestamp: "2025-10-01 08:10" },
  { id: 4, device: "Device C", status: "success", timestamp: "2025-10-01 08:15" },
  { id: 5, device: "Device B", status: "error", timestamp: "2025-10-01 08:20" },
];

function SyncLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    // Giả lập fetch API
    setLogs(mockLogs);
  }, []);

  const filteredLogs =
    filterStatus === "all" ? logs : logs.filter((log) => log.status === filterStatus);

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "Thiết bị", dataIndex: "device", key: "device" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (text) =>
        text === "success" ? (
          <Tag color="green">Thành công</Tag>
        ) : (
          <Tag color="red">Lỗi</Tag>
        ),
    },
    { title: "Thời gian", dataIndex: "timestamp", key: "timestamp" },
  ];

  return (
    <div>
      <h3>🔄 Quản lý Log đồng bộ</h3>

      <Card style={{ marginBottom: 16, maxWidth: 300 }}>
        <Select value={filterStatus} onChange={setFilterStatus} style={{ width: "100%" }}>
          <Option value="all">Tất cả</Option>
          <Option value="success">Thành công</Option>
          <Option value="error">Lỗi</Option>
        </Select>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredLogs}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
}

export default SyncLogsPage;
