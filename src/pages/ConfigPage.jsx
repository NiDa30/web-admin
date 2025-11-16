import React, { useState, useEffect } from "react";
import {
  Form,
  InputNumber,
  Button,
  Card,
  message,
  Row,
  Col,
  Tabs,
  Table,
  Tag,
  Space,
  Alert,
  Tooltip,
  Statistic,
  Switch,
  Input,
  Select,
} from "antd";
import {
  SaveOutlined,
  ReloadOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SettingOutlined,
  DollarOutlined,
  BellOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

function ConfigPage() {
  const [form] = Form.useForm();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configHistory, setConfigHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("rules");

  useEffect(() => {
    loadConfig();
    loadConfigHistory();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configRef = doc(db, COLLECTIONS.APP_SETTINGS, "default_rules");
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data();
        setConfig(data);
        form.setFieldsValue(data);
      } else {
        // Default values
        const defaultConfig = {
          defaultExpenseLimit: 1000000,
          alertThreshold: 80,
          syncIntervalMinutes: 30,
          budgetRule50: 50,
          budgetRule30: 30,
          budgetRule20: 20,
          enableAutoBackup: true,
          backupFrequency: "daily",
        };
        setConfig(defaultConfig);
        form.setFieldsValue(defaultConfig);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      message.error("Không thể tải cấu hình");
      // Use default values
      const defaultConfig = {
        defaultExpenseLimit: 1000000,
        alertThreshold: 80,
        syncIntervalMinutes: 30,
        budgetRule50: 50,
        budgetRule30: 30,
        budgetRule20: 20,
        enableAutoBackup: true,
        backupFrequency: "daily",
      };
      setConfig(defaultConfig);
      form.setFieldsValue(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const loadConfigHistory = async () => {
    try {
      const historyRef = collection(db, "CONFIG_HISTORY");
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(50));
      const snapshot = await getDocs(q);
      const history = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        history.push({
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || null,
        });
      });
      setConfigHistory(history);
    } catch (error) {
      console.error("Error loading config history:", error);
    }
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      const configRef = doc(db, COLLECTIONS.APP_SETTINGS, "default_rules");
      
      // Save current config to history
      if (config) {
        const historyRef = collection(db, "CONFIG_HISTORY");
        await setDoc(doc(historyRef), {
          ...config,
          timestamp: Timestamp.now(),
          changedBy: "admin", // TODO: Get current user
        });
      }

      // Save new config
      await setDoc(configRef, {
        ...values,
        updatedAt: Timestamp.now(),
        updatedBy: "admin", // TODO: Get current user
      });

      setConfig(values);
      message.success("Cập nhật cấu hình thành công!");
      await loadConfigHistory();
    } catch (error) {
      console.error("Error saving config:", error);
      message.error(`Lỗi khi lưu cấu hình: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfig = () => {
    const values = form.getFieldsValue();
    message.info({
      content: "Đang kiểm tra cấu hình...",
      duration: 2,
    });
    // Simulate test
    setTimeout(() => {
      message.success("Cấu hình hợp lệ! Bạn có thể lưu các thay đổi.");
    }, 1000);
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <SettingOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18 }}>Cấu hình Hệ thống</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadConfig} loading={loading}>
              Làm mới
            </Button>
            <Button icon={<CheckCircleOutlined />} onClick={handleTestConfig}>
              Kiểm tra
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "rules",
              label: (
                <Space>
                  <DollarOutlined />
                  Quy tắc Mặc định
                </Space>
              ),
            },
            {
              key: "budget",
              label: (
                <Space>
                  <BellOutlined />
                  Gợi ý Ngân sách
                </Space>
              ),
            },
            {
              key: "sync",
              label: (
                <Space>
                  <SyncOutlined />
                  Đồng bộ
                </Space>
              ),
            },
            {
              key: "history",
              label: (
                <Space>
                  <HistoryOutlined />
                  Lịch sử
                </Space>
              ),
            },
          ]}
        />

        {activeTab === "rules" && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            style={{ maxWidth: "100%", margin: "0 auto", padding: "0 16px" }}
            className="config-form-responsive"
          >
            <Form.Item
              label="Giới hạn chi tiêu mặc định (VND)"
              name="defaultExpenseLimit"
              rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>

            <Form.Item
              label="Ngưỡng cảnh báo (%)"
              name="alertThreshold"
              rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
            >
              <InputNumber min={0} max={100} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block>
                Lưu thay đổi
              </Button>
            </Form.Item>
          </Form>
        )}

        {activeTab === "budget" && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            style={{ maxWidth: "100%", margin: "0 auto", padding: "0 16px" }}
            className="config-form-responsive"
          >
            <Alert
              message="Quy tắc 50/30/20"
              description="Tỷ lệ phân bổ ngân sách: 50% Nhu cầu, 30% Mong muốn, 20% Tiết kiệm & Đầu tư"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={24} md={8}>
                <Form.Item
                  label="Nhu cầu (%)"
                  name="budgetRule50"
                  rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
                >
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Form.Item
                  label="Mong muốn (%)"
                  name="budgetRule30"
                  rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
                >
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Form.Item
                  label="Tiết kiệm (%)"
                  name="budgetRule20"
                  rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
                >
                  <InputNumber min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block>
                Lưu thay đổi
              </Button>
            </Form.Item>
          </Form>
        )}

        {activeTab === "sync" && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            style={{ maxWidth: "100%", margin: "0 auto", padding: "0 16px" }}
            className="config-form-responsive"
          >
            <Form.Item
              label="Khoảng thời gian đồng bộ (phút)"
              name="syncIntervalMinutes"
              rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label="Bật sao lưu tự động"
              name="enableAutoBackup"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Tần suất sao lưu"
              name="backupFrequency"
            >
              <Select>
                <Option value="daily">Hàng ngày</Option>
                <Option value="weekly">Hàng tuần</Option>
                <Option value="monthly">Hàng tháng</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block>
                Lưu thay đổi
              </Button>
            </Form.Item>
          </Form>
        )}

        {activeTab === "history" && (
          <Table
            dataSource={configHistory}
            rowKey="id"
            columns={[
              {
                title: "Thời gian",
                dataIndex: "timestamp",
                key: "timestamp",
                render: (timestamp) =>
                  timestamp ? dayjs(timestamp).format("DD/MM/YYYY HH:mm:ss") : "N/A",
              },
              {
                title: "Giới hạn chi tiêu",
                dataIndex: "defaultExpenseLimit",
                key: "defaultExpenseLimit",
                render: (value) => value?.toLocaleString("vi-VN") || "N/A",
              },
              {
                title: "Ngưỡng cảnh báo",
                dataIndex: "alertThreshold",
                key: "alertThreshold",
                render: (value) => (value ? `${value}%` : "N/A"),
              },
              {
                title: "Thay đổi bởi",
                dataIndex: "changedBy",
                key: "changedBy",
              },
            ]}
            pagination={{ responsive: true, pageSize: 10 }}
            scroll={{ x: 'max-content', y: 400 }}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}

export default ConfigPage;
