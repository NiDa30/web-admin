/**
 * Database Structure Mapping
 * Maps Firestore collections to SQLite table names
 * Both use UPPERCASE naming convention for consistency
 */

export const COLLECTION_TO_TABLE_MAP = {
  // Core entities
  USER: "USER",
  CATEGORIES: "CATEGORY", // Firestore: CATEGORIES → SQLite: CATEGORY (User categories)
  CATEGORIES_DEFAULT: "CATEGORY_DEFAULT", // Firestore: CATEGORIES_DEFAULT → SQLite: CATEGORY_DEFAULT (System default categories)
  TRANSACTIONS: "TRANSACTION", // Firestore: TRANSACTIONS → SQLite: TRANSACTION
  BUDGET: "BUDGET",
  GOAL: "GOAL",

  // Recurring & History
  RECURRING_TXN: "RECURRING_TXN",
  BUDGET_HISTORY: "BUDGET_HISTORY",
  GOAL_CONTRIBUTION: "GOAL_CONTRIBUTION",

  // System
  SYNC_LOG: "SYNC_LOG",
  ACTIVITY_LOG: "ACTIVITY_LOG", // Added
  NOTIFICATION: "NOTIFICATION",
  DEVICE: "DEVICE",

  // Media & Attachments
  ATTACHMENT: "ATTACHMENT",

  // Payment & Merchants (Note: Firestore has typos)
  PAYMENT_METHHOD: "PAYMENT_METHOD", // Note: Firestore typo - PAYMENT_METHHOD, SQLite uses correct spelling
  MERCHART: "MERCHANT", // Note: Firestore typo - MERCHART, SQLite uses correct spelling

  // Tags & Organization
  TAG: "TAG",
  TRANSACTION_TAG: "TRANSACTION_TAG",
  SPLIT_TRANSACTION: "SPLIT_TRANSACTION",

  // Reports & Settings
  REPORT: "REPORT",
  APP_SETTINGS: "APP_SETTINGS",
  CATEGORY_BUDGET_TEMPLATE: "CATEGORY_BUDGET_TEMPLATE",

  // Expenses (lowercase in Firestore)
  expenses: "EXPENSES", // Firestore: expenses → SQLite: EXPENSES
};

// Reverse mapping: SQLite table to Firestore collection
export const TABLE_TO_COLLECTION_MAP = Object.fromEntries(
  Object.entries(COLLECTION_TO_TABLE_MAP).map(([key, value]) => [value, key])
);

// Field name mappings (snake_case to camelCase conversion helpers)
export const FIELD_NAME_MAP = {
  // Common fields
  id: {
    USER: "userID",
    CATEGORIES: "categoryID", // Firestore collection name (User categories)
    CATEGORIES_DEFAULT: "categoryID", // Firestore collection name (Default categories)
    CATEGORY: "categoryID", // SQLite table name
    CATEGORY_DEFAULT: "categoryID", // SQLite table name (Default categories)
    TRANSACTIONS: "transactionID", // Firestore collection name
    TRANSACTION: "transactionID", // SQLite table name
    BUDGET: "budgetID",
    GOAL: "goalID",
    RECURRING_TXN: "recurTxnID",
    BUDGET_HISTORY: "historyID",
    GOAL_CONTRIBUTION: "contributionID",
    SYNC_LOG: "logID",
    ACTIVITY_LOG: "logID", // Added
    NOTIFICATION: "notificationID",
    DEVICE: "deviceID",
    ATTACHMENT: "attachmentID",
    PAYMENT_METHOD: "methodID",
    PAYMENT_METHHOD: "methodID", // Firestore typo
    MERCHANT: "merchantID",
    MERCHART: "merchantID", // Firestore typo
    TAG: "tagID",
    TRANSACTION_TAG: "id",
    SPLIT_TRANSACTION: "splitID",
    REPORT: "reportID",
    APP_SETTINGS: "settingID",
    CATEGORY_BUDGET_TEMPLATE: "templateID",
    expenses: "expenseID", // Firestore collection name (lowercase)
    EXPENSES: "expenseID", // SQLite table name (uppercase)
  },
};

/**
 * Convert Firestore collection name to SQLite table name
 */
export const getTableName = (collectionName) => {
  return COLLECTION_TO_TABLE_MAP[collectionName] || collectionName;
};

/**
 * Convert SQLite table name to Firestore collection name
 */
export const getCollectionName = (tableName) => {
  return TABLE_TO_COLLECTION_MAP[tableName] || tableName;
};

/**
 * Get primary key field name for a table/collection
 */
export const getPrimaryKeyField = (tableOrCollectionName) => {
  // Handle Firestore collection names directly (e.g., CATEGORIES, TRANSACTIONS, expenses)
  if (FIELD_NAME_MAP.id[tableOrCollectionName]) {
    return FIELD_NAME_MAP.id[tableOrCollectionName];
  }

  // Try table name mapping (for SQLite table names)
  const tableName = getTableName(tableOrCollectionName);
  if (FIELD_NAME_MAP.id[tableName]) {
    return FIELD_NAME_MAP.id[tableName];
  }

  // Try to find in COLLECTION_TO_TABLE_MAP values
  const collectionName = Object.keys(COLLECTION_TO_TABLE_MAP).find(
    (key) => COLLECTION_TO_TABLE_MAP[key] === tableOrCollectionName
  );
  if (collectionName && FIELD_NAME_MAP.id[collectionName]) {
    return FIELD_NAME_MAP.id[collectionName];
  }

  // Fallback to "id"
  return "id";
};

export default {
  COLLECTION_TO_TABLE_MAP,
  TABLE_TO_COLLECTION_MAP,
  FIELD_NAME_MAP,
  getTableName,
  getCollectionName,
  getPrimaryKeyField,
};
