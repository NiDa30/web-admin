/**
 * Validate Database Structure
 * Validates that CSV files match the expected database structure
 */

import { COLLECTIONS } from "../constants/collections";
import { getPrimaryKeyField } from "../constants/databaseMapping";

/**
 * Expected field structures for each collection
 */
const EXPECTED_STRUCTURES = {
  USER: [
    "userID",
    "email",
    "passwordHash",
    "name",
    "role",
    "accountStatus",
    "monthlyIncome",
    "currentBalance",
    "failedLoginAttempts",
    "lastLoginTime",
    "currency",
    "language",
    "timezone",
    "emailVerified",
    "phoneNumber",
    "avatarURL",
    "budgetRule",
    "createdAt",
    "updatedAt",
  ],
  CATEGORY: [
    "categoryID",
    "name",
    "type",
    "isSystemDefault",
    "keywords",
    "icon",
    "color",
    "parentCategoryID",
    "displayOrder",
    "isHidden",
    "createdAt",
  ],
  TRANSACTION: [
    "transactionID",
    "userID",
    "categoryID",
    "amount",
    "type",
    "date",
    "description",
    "paymentMethod",
    "merchantName",
    "merchantLocation",
    "latitude",
    "longitude",
    "tags",
    "isSynced",
    "lastModifiedAt",
    "location",
    "isDeleted",
    "deletedAt",
    "createdBy",
    "hasAttachment",
    "recurTxnID",
    "parentTransactionID",
    "createdAt",
  ],
  BUDGET: [
    "budgetID",
    "userID",
    "categoryID",
    "monthYear",
    "budgetAmount",
    "spentAmount",
    "warningThreshold",
    "createdAt",
    "updatedAt",
  ],
  GOAL: [
    "goalID",
    "userID",
    "name",
    "targetAmount",
    "savedAmount",
    "startDate",
    "endDate",
    "monthlyContribution",
    "status",
    "createdAt",
    "updatedAt",
  ],
  RECURRING_TXN: [
    "recurTxnID",
    "userID",
    "categoryID",
    "amount",
    "frequency",
    "startDate",
    "nextDueDate",
    "description",
    "type",
    "isActive",
    "createdAt",
  ],
  BUDGET_HISTORY: [
    "historyID",
    "budgetID",
    "userID",
    "changeType",
    "oldAmount",
    "newAmount",
    "oldWarningThreshold",
    "newWarningThreshold",
    "reason",
    "notes",
    "changedAt",
    "changedBy",
  ],
  GOAL_CONTRIBUTION: [
    "contributionID",
    "goalID",
    "userID",
    "amount",
    "contributionType",
    "sourceTransactionID",
    "note",
    "contributedAt",
    "createdBy",
  ],
  SYNC_LOG: [
    "logID",
    "userID",
    "deviceID",
    "syncTime",
    "status",
    "conflictDetails",
    "tableName",
    "recordID",
    "action",
    "createdAt",
  ],
  NOTIFICATION: [
    "notificationID",
    "userID",
    "type",
    "title",
    "message",
    "isRead",
    "priority",
    "relatedEntityType",
    "relatedEntityID",
    "actionURL",
    "createdAt",
    "readAt",
    "expiresAt",
  ],
  DEVICE: [
    "deviceID",
    "userID",
    "deviceUUID",
    "deviceName",
    "deviceType",
    "osVersion",
    "appVersion",
    "fcmToken",
    "isActive",
    "lastSyncAt",
    "lastActiveAt",
    "createdAt",
  ],
  ATTACHMENT: [
    "attachmentID",
    "transactionID",
    "fileURL",
    "fileName",
    "fileType",
    "fileSize",
    "mimeType",
    "thumbnailURL",
    "ocrRawText",
    "ocrConfidence",
    "wasEdited",
    "uploadedAt",
    "uploadedBy",
    "createdAt",
  ],
  PAYMENT_METHOD: [
    "methodID",
    "userID",
    "methodType",
    "name",
    "lastFourDigits",
    "icon",
    "color",
    "isDefault",
    "isActive",
    "displayOrder",
    "balance",
    "notes",
    "createdAt",
    "updatedAt",
  ],
  MERCHANT: [
    "merchantID",
    "name",
    "category",
    "defaultCategoryID",
    "logo",
    "address",
    "latitude",
    "longitude",
    "phone",
    "website",
    "keywords",
    "usageCount",
    "isVerified",
    "createdAt",
  ],
  TAG: [
    "tagID",
    "userID",
    "name",
    "color",
    "icon",
    "description",
    "usageCount",
    "createdAt",
  ],
  TRANSACTION_TAG: [
    "id",
    "transactionID",
    "tagID",
    "taggedAt",
  ],
  SPLIT_TRANSACTION: [
    "splitID",
    "parentTransactionID",
    "childTransactionID",
    "splitAmount",
    "splitPercentage",
    "participantName",
    "notes",
    "createdAt",
  ],
  REPORT: [
    "reportID",
    "userID",
    "reportType",
    "period",
    "totalIncome",
    "totalExpense",
    "balance",
    "savingsRate",
    "transactionCount",
    "categoryBreakdown",
    "topCategories",
    "comparisonPrevious",
    "insights",
    "generatedAt",
  ],
  APP_SETTINGS: [
    "settingID",
    "userID",
    "currency",
    "language",
    "timezone",
    "dateFormat",
    "theme",
    "budgetRule",
    "notificationEnabled",
    "notificationTime",
    "reminderFrequency",
    "biometricEnabled",
    "autoBackup",
    "backupFrequency",
    "privacyMode",
    "createdAt",
    "updatedAt",
  ],
  CATEGORY_BUDGET_TEMPLATE: [
    "templateID",
    "templateName",
    "description",
    "isSystemDefault",
    "userID",
    "allocations",
    "createdAt",
  ],
};

/**
 * Validate CSV structure
 */
export function validateCSVStructure(csvHeaders, collectionName) {
  const expectedFields = EXPECTED_STRUCTURES[collectionName];
  
  if (!expectedFields) {
    return {
      valid: false,
      error: `No expected structure defined for ${collectionName}`,
    };
  }

  const missingFields = expectedFields.filter(
    (field) => !csvHeaders.includes(field)
  );
  const extraFields = csvHeaders.filter(
    (field) => !expectedFields.includes(field)
  );

  return {
    valid: missingFields.length === 0,
    missingFields,
    extraFields,
    expectedFields,
    actualFields: csvHeaders,
  };
}

/**
 * Parse CSV headers
 */
export function parseCSVHeaders(csvContent) {
  const lines = csvContent.split("\n");
  if (lines.length === 0) {
    return [];
  }
  return lines[0].split(",").map((h) => h.trim());
}

/**
 * Validate all CSV files
 */
export async function validateAllCSVFiles(csvFiles) {
  const results = {};

  for (const [collectionName, csvContent] of Object.entries(csvFiles)) {
    if (!csvContent) {
      results[collectionName] = {
        valid: false,
        error: "Empty CSV content",
      };
      continue;
    }

    const headers = parseCSVHeaders(csvContent);
    const validation = validateCSVStructure(headers, collectionName);
    results[collectionName] = validation;
  }

  return results;
}

/**
 * Generate structure report
 */
export function generateStructureReport(validationResults) {
  const report = {
    total: Object.keys(validationResults).length,
    valid: 0,
    invalid: 0,
    details: {},
  };

  for (const [collectionName, result] of Object.entries(validationResults)) {
    if (result.valid) {
      report.valid++;
    } else {
      report.invalid++;
    }

    report.details[collectionName] = {
      valid: result.valid,
      missingFields: result.missingFields || [],
      extraFields: result.extraFields || [],
      error: result.error || null,
    };
  }

  return report;
}

export default {
  validateCSVStructure,
  parseCSVHeaders,
  validateAllCSVFiles,
  generateStructureReport,
  EXPECTED_STRUCTURES,
};

