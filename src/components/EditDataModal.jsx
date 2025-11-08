import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  DatePicker,
  Select,
  message,
  Space,
  Button,
  Row,
  Col,
  Alert,
  Tag,
} from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";
import { createCollectionService } from "../services/collectionService";
import { Timestamp } from "firebase/firestore";

import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;

function EditDataModal({
  visible,
  collectionName,
  record,
  schema,
  primaryKey,
  onClose,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const service = createCollectionService(collectionName);
  const isEditMode = !!record;

  useEffect(() => {
    if (visible) {
      if (record) {
        // Edit mode: populate form with existing data
        const initialValues = {};
        schema.forEach((field) => {
          const value = record[field];
          if (value instanceof Date) {
            initialValues[field] = dayjs ? dayjs(value) : value;
          } else if (typeof value === "boolean") {
            initialValues[field] = value;
          } else if (typeof value === "object" && value !== null) {
            initialValues[field] = JSON.stringify(value, null, 2);
          } else {
            initialValues[field] = value;
          }
        });
        form.setFieldsValue(initialValues);
        setFormData(initialValues);
      } else {
        // Add mode: reset form
        form.resetFields();
        setFormData({});
      }
    }
  }, [visible, record, schema, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Process form values
      const processedData = {};
      schema.forEach((field) => {
        const value = values[field];

        // Skip primary key for new records (will be auto-generated)
        if (!isEditMode && field === primaryKey) {
          return;
        }

        // Handle date fields (dayjs objects or Date objects)
        if (dayjs && dayjs.isDayjs && dayjs.isDayjs(value)) {
          processedData[field] = Timestamp.fromDate(value.toDate());
        } else if (value instanceof Date) {
          processedData[field] = Timestamp.fromDate(value);
        }
        // Handle boolean fields
        else if (typeof value === "boolean") {
          processedData[field] = value;
        }
        // Handle number fields
        else if (typeof value === "number") {
          processedData[field] = value;
        }
        // Handle JSON strings
        else if (
          typeof value === "string" &&
          (value.startsWith("{") || value.startsWith("["))
        ) {
          try {
            processedData[field] = JSON.parse(value);
          } catch {
            processedData[field] = value;
          }
        }
        // Handle empty strings as null
        else if (value === "" || value === undefined) {
          processedData[field] = null;
        }
        // Default: string
        else {
          processedData[field] = value;
        }
      });

      if (isEditMode) {
        // Update existing record
        const recordId = record[primaryKey] || record.id;
        
        // Don't update primary key field
        const dataToUpdate = { ...processedData };
        if (primaryKey && dataToUpdate[primaryKey]) {
          delete dataToUpdate[primaryKey];
        }
        
        await service.update(recordId, dataToUpdate);
        message.success("Đã cập nhật thành công");
      } else {
        // Create new record
        const primaryKeyValue = processedData[primaryKey];
        
        // Remove primaryKey from data if it exists (will be set separately)
        const dataWithoutPrimaryKey = { ...processedData };
        if (primaryKeyValue) {
          delete dataWithoutPrimaryKey[primaryKey];
        }
        
        if (primaryKeyValue) {
          // Use custom ID if provided
          await service.createWithId(primaryKeyValue, dataWithoutPrimaryKey);
        } else {
          // Auto-generate ID - Firestore will generate document ID
          const newDocId = await service.create(dataWithoutPrimaryKey);
          // If primaryKey field exists in schema, update it with generated ID
          if (primaryKey && primaryKey !== "id") {
            await service.update(newDocId, { [primaryKey]: newDocId });
          }
        }
        message.success("Đã thêm mới thành công");
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving data:", error);
      if (error.errorFields) {
        // Form validation errors
        message.error("Vui lòng kiểm tra lại thông tin");
      } else {
        message.error(`Lỗi khi lưu: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    if (onClose) onClose();
  };

  // Determine field type and render appropriate input
  const renderFieldInput = (field) => {
    const fieldName = field.toLowerCase();

    // Date fields
    if (
      fieldName.includes("date") ||
      fieldName.includes("time") ||
      fieldName.includes("at") ||
      field === "createdAt" ||
      field === "updatedAt"
    ) {
      if (dayjs) {
        return (
          <DatePicker
            showTime
            format="DD/MM/YYYY HH:mm:ss"
            style={{ width: "100%" }}
            placeholder={`Chọn ${field}`}
          />
        );
      } else {
        // Fallback to datetime-local input if dayjs is not available
        return (
          <Input
            type="datetime-local"
            placeholder={`Chọn ${field}`}
            style={{ width: "100%" }}
          />
        );
      }
    }

    // Boolean fields
    if (
      fieldName.includes("is") ||
      fieldName.includes("has") ||
      fieldName.includes("was") ||
      typeof value === "boolean"
    ) {
      return <Switch checkedChildren="Có" unCheckedChildren="Không" />;
    }

    // Number fields
    if (
      fieldName.includes("amount") ||
      fieldName.includes("income") ||
      fieldName.includes("balance") ||
      fieldName.includes("count") ||
      fieldName.includes("order") ||
      fieldName.includes("rate") ||
      fieldName.includes("threshold") ||
      fieldName.includes("size") ||
      fieldName.includes("confidence") ||
      fieldName.includes("latitude") ||
      fieldName.includes("longitude") ||
      typeof value === "number"
    ) {
      return (
        <InputNumber
          style={{ width: "100%" }}
          placeholder={`Nhập ${field}`}
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
        />
      );
    }

    // Enum fields
    if (field === "type" || field === "status" || field === "role") {
      const options = getEnumOptions(field, collectionName);
      return (
        <Select placeholder={`Chọn ${field}`} allowClear>
          {options.map((option) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    }

    // JSON/Object fields
    if (
      fieldName.includes("keywords") ||
      fieldName.includes("tags") ||
      fieldName.includes("allocations") ||
      fieldName.includes("breakdown") ||
      fieldName.includes("details") ||
      (typeof value === "object" && value !== null)
    ) {
      return (
        <TextArea
          rows={4}
          placeholder={`Nhập JSON cho ${field}`}
          style={{ fontFamily: "monospace" }}
        />
      );
    }

    // Email field
    if (fieldName.includes("email")) {
      return <Input type="email" placeholder={`Nhập ${field}`} />;
    }

    // URL field
    if (fieldName.includes("url") || fieldName.includes("link")) {
      return <Input type="url" placeholder={`Nhập ${field}`} />;
    }

    // Password field
    if (fieldName.includes("password")) {
      return <Input.Password placeholder={`Nhập ${field}`} />;
    }

    // Long text fields
    if (
      fieldName.includes("description") ||
      fieldName.includes("message") ||
      fieldName.includes("note") ||
      fieldName.includes("insights")
    ) {
      return <TextArea rows={3} placeholder={`Nhập ${field}`} />;
    }

    // Default: text input
    return <Input placeholder={`Nhập ${field}`} />;
  };

  // Get enum options based on field and collection
  const getEnumOptions = (field) => {
    const enums = {
      type: ["INCOME", "EXPENSE"],
      status: ["ACTIVE", "COMPLETED", "CANCELLED", "LOCKED", "INACTIVE"],
      role: ["USER", "ADMIN"],
      accountStatus: ["ACTIVE", "LOCKED", "INACTIVE"],
      paymentMethod: [
        "CASH",
        "DEBIT_CARD",
        "CREDIT_CARD",
        "E_WALLET",
        "BANK_TRANSFER",
      ],
      frequency: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
      priority: ["LOW", "NORMAL", "HIGH", "URGENT"],
      deviceType: ["IOS", "ANDROID", "WEB"],
      reportType: ["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"],
      theme: ["LIGHT", "DARK", "AUTO"],
      syncStatus: ["SUCCESS", "CONFLICT", "FAILED"],
    };

    const fieldLower = field.toLowerCase();
    for (const [key, values] of Object.entries(enums)) {
      if (fieldLower.includes(key)) {
        return values;
      }
    }

    return [];
  };

  return (
    <Modal
      title={
        <Space>
          <span>{isEditMode ? "Chỉnh sửa" : "Thêm mới"}</span>
          <Tag color={isEditMode ? "blue" : "green"}>
            {collectionName}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={formData}
      >
        <Row gutter={16}>
          {schema.map((field) => {
            // Skip id field, show primaryKey as disabled in edit mode
            if (field === "id") {
              return null; // Don't show id field
            }

            // Primary key field handling
            const isPrimaryKey = field === primaryKey;
            const isRequired = isPrimaryKey || 
                              field === "userID" || 
                              field === "name" || 
                              field === "email" ||
                              field === "categoryID" ||
                              field === "amount" ||
                              field === "type";

            return (
              <Col span={12} key={field}>
                <Form.Item
                  label={
                    <span>
                      {field}
                      {isPrimaryKey && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          Primary Key
                        </Tag>
                      )}
                    </span>
                  }
                  name={field}
                  rules={[
                    {
                      required: isRequired && !isEditMode,
                      message: `Vui lòng nhập ${field}`,
                    },
                  ]}
                >
                  {isEditMode && isPrimaryKey ? (
                    <Input disabled />
                  ) : (
                    renderFieldInput(field)
                  )}
                </Form.Item>
              </Col>
            );
          })}
        </Row>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              Hủy
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={loading}
            >
              {isEditMode ? "Cập nhật" : "Thêm mới"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default EditDataModal;

