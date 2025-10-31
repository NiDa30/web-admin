import React, { useState, useEffect } from "react";
import { Form, InputNumber, Button, Card, message } from "antd";

function ConfigPage() {
  const [form] = Form.useForm();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // ✅ Giả lập fetch API
    const mockConfig = {
      defaultExpenseLimit: 1000,
      alertThreshold: 80,
      syncIntervalMinutes: 30,
    };
    setConfig(mockConfig);
    form.setFieldsValue(mockConfig);
  }, [form]);

  const handleSave = (values) => {
    // ✅ Gọi API PUT /config/default-rules (giả lập)
    setConfig(values);
    message.success("Cập nhật cấu hình thành công!");
  };

  return (
    <Card
      title="⚙️ Cấu hình quy tắc mặc định"
      style={{ maxWidth: 500, margin: "0 auto" }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={config}
      >
        <Form.Item
          label="Giới hạn chi tiêu mặc định"
          name="defaultExpenseLimit"
          rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Ngưỡng cảnh báo (%)"
          name="alertThreshold"
          rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
        >
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Khoảng thời gian đồng bộ (phút)"
          name="syncIntervalMinutes"
          rules={[{ required: true, message: "Vui lòng nhập giá trị" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            💾 Lưu thay đổi
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default ConfigPage;
