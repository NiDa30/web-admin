import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Empty,
  Card,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { createCollectionService } from "../services/collectionService";
import EditDataModal from "./EditDataModal";
import { getPrimaryKeyField } from "../constants/databaseMapping";

const { Search } = Input;

function CollectionDataTable({ collectionName, onRefresh }) {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [schema, setSchema] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  const service = createCollectionService(collectionName);
  const primaryKey = getPrimaryKeyField(collectionName);

  useEffect(() => {
    if (collectionName) {
      loadData();
      loadSchema();
      // Clear selection when collection changes
      setSelectedRowKeys([]);
    }
  }, [collectionName]);

  useEffect(() => {
    filterData();
  }, [data, searchText]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log(`Loading data from collection: ${collectionName}`);
      const items = await service.getAll();
      console.log(`Loaded ${items.length} items from ${collectionName}`);
      setData(items);
      setFilteredData(items);
      return items;
    } catch (error) {
      console.error("Error loading data:", error);
      message.error(`Lỗi khi tải dữ liệu: ${error.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadSchema = async () => {
    try {
      const fields = await service.getSchema();
      setSchema(fields);
    } catch (error) {
      console.error("Error loading schema:", error);
    }
  };

  const filterData = () => {
    if (!searchText.trim()) {
      setFilteredData(data);
      return;
    }

    const lowerSearch = searchText.toLowerCase();
    const filtered = data.filter((record) => {
      return Object.values(record).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerSearch);
      });
    });

    setFilteredData(filtered);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (record) => {
    // Use Firestore document ID (record.id) for deletion
    const docId = record.id || record[primaryKey];
    
    if (!docId) {
      message.error("Không tìm thấy ID của bản ghi");
      return;
    }

    try {
      setActionLoading(docId);
      console.log(`Deleting record: ${docId} from collection: ${collectionName}`);
      
      // Delete from Firestore using document ID
      await service.delete(docId);
      
      message.success("Đã xóa bản ghi thành công");
      
      // Remove from selected keys if it was selected
      setSelectedRowKeys((prev) => prev.filter((key) => key !== docId));
      
      // Reload data after a short delay to ensure Firestore has processed the deletion
      setTimeout(async () => {
        await loadData();
        
        // Refresh parent component stats
        if (onRefresh) {
          await onRefresh();
        }
      }, 500);
    } catch (error) {
      console.error("Error deleting record:", error);
      message.error(`Lỗi khi xóa: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Vui lòng chọn ít nhất một bản ghi để xóa");
      return;
    }

    try {
      setBatchDeleteLoading(true);
      
      console.log(`Batch deleting ${selectedRowKeys.length} records from collection: ${collectionName}`);
      console.log("Selected IDs:", selectedRowKeys);
      
      // Firestore batch operations have a limit of 500 operations per batch
      // Split into chunks if needed
      const BATCH_SIZE = 500;
      const chunks = [];
      for (let i = 0; i < selectedRowKeys.length; i += BATCH_SIZE) {
        chunks.push(selectedRowKeys.slice(i, i + BATCH_SIZE));
      }

      let totalSuccess = 0;
      let totalFail = 0;
      const failedIds = [];

      for (const chunk of chunks) {
        try {
          console.log(`Processing chunk of ${chunk.length} records...`);
          await service.batchDelete(chunk);
          totalSuccess += chunk.length;
          console.log(`✅ Successfully deleted ${chunk.length} records`);
        } catch (batchError) {
          // Fallback to individual deletions if batch fails
          console.warn(
            "Batch delete failed, trying individual deletions:",
            batchError
          );
          for (const recordId of chunk) {
            try {
              await service.delete(recordId);
              totalSuccess++;
            } catch (error) {
              console.error(`Error deleting record ${recordId}:`, error);
              totalFail++;
              failedIds.push(recordId);
            }
          }
        }
      }

      // Show results
      if (totalSuccess > 0) {
        message.success(`Đã xóa thành công ${totalSuccess} bản ghi`);
      }
      if (totalFail > 0) {
        message.error(`Không thể xóa ${totalFail} bản ghi${failedIds.length > 0 ? `: ${failedIds.slice(0, 5).join(", ")}${failedIds.length > 5 ? "..." : ""}` : ""}`);
      }

      // Clear selection
      setSelectedRowKeys([]);
      
      // Reload data after a short delay to ensure Firestore has processed the deletions
      setTimeout(async () => {
        await loadData();
        
        // Refresh parent component stats
        if (onRefresh) {
          await onRefresh();
        }
      }, 500);
    } catch (error) {
      console.error("Error in batch delete:", error);
      message.error(`Lỗi khi xóa: ${error.message}`);
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedRowKeys([]);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    onSelectAll: (selected, selectedRows, changeRows) => {
      if (selected) {
        // Select all visible rows using Firestore document ID
        const allKeys = filteredData.map(
          (record) => record.id || record[primaryKey]
        );
        setSelectedRowKeys((prev) => {
          const newKeys = [...new Set([...prev, ...allKeys])];
          return newKeys;
        });
      } else {
        // Deselect all visible rows
        const visibleKeys = filteredData.map(
          (record) => record.id || record[primaryKey]
        );
        setSelectedRowKeys((prev) =>
          prev.filter((key) => !visibleKeys.includes(key))
        );
      }
    },
    getCheckboxProps: (record) => ({
      disabled: false,
      name: record.id || record[primaryKey],
    }),
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    loadData();
    if (onRefresh) onRefresh();
    message.success(
      editingRecord ? "Đã cập nhật thành công" : "Đã thêm mới thành công"
    );
  };

  // Format cell value for display
  const formatCellValue = (value) => {
    if (value === null || value === undefined) {
      return <span style={{ color: "#999" }}>N/A</span>;
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toLocaleString("vi-VN");
    }

    // Handle booleans
    if (typeof value === "boolean") {
      return (
        <Tag color={value ? "green" : "red"}>
          {value ? "Có" : "Không"}
        </Tag>
      );
    }

    // Handle arrays/objects (JSON)
    if (typeof value === "object") {
      return (
        <Tooltip title={JSON.stringify(value, null, 2)}>
          <span style={{ cursor: "help" }}>
            {Array.isArray(value) ? `[${value.length} items]` : "{...}"}
          </span>
        </Tooltip>
      );
    }

    // Handle long strings
    if (typeof value === "string" && value.length > 50) {
      return (
        <Tooltip title={value}>
          <span>{value.substring(0, 50)}...</span>
        </Tooltip>
      );
    }

    return String(value);
  };

  // Generate table columns from schema
  const generateColumns = () => {
    if (schema.length === 0 && data.length > 0) {
      // If no schema but we have data, use data keys
      const firstRecord = data[0];
      const keys = Object.keys(firstRecord).filter((key) => key !== "id");
      return [
        {
          title: "ID",
          dataIndex: "id",
          key: "id",
          width: 150,
          fixed: "left",
          render: (value, record) => value || record[primaryKey] || "N/A",
        },
        ...keys.slice(0, 10).map((key) => ({
          title: key,
          dataIndex: key,
          key: key,
          width: 150,
          render: (value) => formatCellValue(value, key),
        })),
        {
          title: "Thao tác",
          key: "actions",
          width: 120,
          fixed: "right",
          render: (_, record) => {
            const recordId = record.id || record[primaryKey];
            return (
              <Space>
                <Tooltip title="Chỉnh sửa">
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                    loading={actionLoading === recordId}
                  />
                </Tooltip>
                <Popconfirm
                  title="Xóa bản ghi"
                  description={`Bạn có chắc muốn xóa bản ghi này?`}
                  onConfirm={() => handleDelete(record)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Xóa">
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      loading={actionLoading === recordId}
                    />
                  </Tooltip>
                </Popconfirm>
              </Space>
            );
          },
        },
      ];
    }

    if (schema.length === 0) {
      return [
        {
          title: "ID",
          dataIndex: "id",
          key: "id",
          width: 200,
          fixed: "left",
        },
      ];
    }

    const columns = [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        width: 150,
        fixed: "left",
        render: (value, record) => {
          // Show Firestore document ID
          const displayId = value || record[primaryKey] || "N/A";
          return (
            <Tooltip title={`Document ID: ${displayId}`}>
              <span style={{ fontWeight: "bold", color: "#1890ff" }}>
                {displayId}
              </span>
            </Tooltip>
          );
        },
      },
    ];

    // Add other fields (limit to first 10 for performance, but show all if less than 15)
    const maxFields = schema.length <= 15 ? schema.length : 10;
    const displayFields = schema
      .filter((field) => field !== primaryKey && field !== "id")
      .slice(0, maxFields);

    displayFields.forEach((field) => {
      columns.push({
        title: field,
        dataIndex: field,
        key: field,
        width: 150,
        render: (value) => formatCellValue(value, field),
      });
    });

    // Add actions column
    columns.push({
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => {
        const recordId = record.id || record[primaryKey];
        return (
          <Space>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                loading={actionLoading === recordId}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa bản ghi"
              description={`Bạn có chắc muốn xóa bản ghi này?`}
              onConfirm={() => handleDelete(record)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  loading={actionLoading === recordId}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    });

    return columns;
  };

  return (
    <div className="collection-data-table">
      <Card>
        <div className="table-header">
          <Space>
            <Search
              placeholder="Tìm kiếm..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={filterData}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              Làm mới
            </Button>
            {selectedRowKeys.length > 0 && (
              <>
                <span style={{ color: "#1890ff", fontWeight: 500 }}>
                  Đã chọn: {selectedRowKeys.length}
                </span>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClearSelection}
                  size="large"
                >
                  Bỏ chọn
                </Button>
                <Popconfirm
                  title="Xóa nhiều bản ghi"
                  description={`Bạn có chắc muốn xóa ${selectedRowKeys.length} bản ghi đã chọn? Hành động này không thể hoàn tác.`}
                  onConfirm={handleBatchDelete}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, loading: batchDeleteLoading }}
                >
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    loading={batchDeleteLoading}
                    size="large"
                  >
                    Xóa đã chọn ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            size="large"
          >
            Thêm mới
          </Button>
        </div>

        <Table
          columns={generateColumns()}
          dataSource={filteredData}
          rowKey={(record) => record.id || record[primaryKey]}
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} bản ghi${
                selectedRowKeys.length > 0
                  ? ` (${selectedRowKeys.length} đã chọn)`
                  : ""
              }`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          scroll={{ x: "max-content" }}
          bordered
          size="small"
          locale={{
            emptyText: (
              <Empty
                description="Không có dữ liệu"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      <EditDataModal
        visible={isModalVisible}
        collectionName={collectionName}
        record={editingRecord}
        schema={schema}
        primaryKey={primaryKey}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default CollectionDataTable;

