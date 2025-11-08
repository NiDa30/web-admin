/**
 * Firestore Collection Names
 *
 * Convention:
 * - Keys: UPPERCASE_PLURAL
 * - Values: lowercase_plural
 * - Always use PLURAL for collections in Firestore
 */

export const COLLECTIONS = {
  // Core entities
  USERS: "USER",
  CATEGORIES: "CATEGORIES",
  CATEGORIES_DEFAULT: "CATEGORIES_DEFAULT",
  TRANSACTIONS: "TRANSACTIONS",
  BUDGETS: "BUDGET",
  GOALS: "GOAL",

  // Recurring & History
  RECURRING_TRANSACTIONS: "RECURRING_TXN",
  BUDGET_HISTORY: "BUDGET_HISTORY",
  GOAL_CONTRIBUTIONS: "GOAL_CONTRIBUTION",

  // System
  SYNC_LOGS: "SYNC_LOG",
  NOTIFICATIONS: "NOTIFICATION",
  DEVICES: "DEVICE",

  // Media & Attachments
  ATTACHMENTS: "ATTACHMENT",

  // Payment & Merchants
  PAYMENT_METHODS: "PAYMENT_METHHOD", // Note: Firebase has typo
  MERCHANTS: "MERCHART", // Note: Firebase has typo

  // Tags & Organization
  TAGS: "TAG",
  TRANSACTION_TAGS: "TRANSACTION_TAG",
  SPLIT_TRANSACTIONS: "SPLIT_TRANSACTION",

  // Reports & Settings
  REPORTS: "REPORT",
  APP_SETTINGS: "APP_SETTINGS",
  CATEGORY_BUDGET_TEMPLATES: "CATEGORY_BUDGET_TEMPLATE",

  // Expenses (lowercase collection name)
  EXPENSES: "expenses",
};

// Freeze object để prevent modification
Object.freeze(COLLECTIONS);

// Export default
export default COLLECTIONS;

// Helper: Get all collection names as array
export const getAllCollections = () => Object.values(COLLECTIONS);

// Helper: Check if collection exists
export const isValidCollection = (name) => getAllCollections().includes(name);

// Helper: Get collection count
export const getCollectionCount = () => Object.keys(COLLECTIONS).length;

// Helper: Log all collections (for debugging)
export const logCollections = () => {
  console.log("📚 Available Collections:");
  console.table(COLLECTIONS);
};
