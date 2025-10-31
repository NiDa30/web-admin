/**
 * Firestore Collection Names
 *
 * Convention:
 * - Keys: UPPERCASE_PLURAL
 * - Values: lowercase_plural
 * - Always use PLURAL for collections in Firestore
 */

export const COLLECTIONS = {
  // Core entities (PLURAL)
  USERS: "USER", // ✅ Đổi từ USER → USERS
  CATEGORIES: "CATEGORY",
  TRANSACTIONS: "TRANSACTION",
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
  PAYMENT_METHODS: "PAYMENT_METHHOD",
  MERCHANTS: "MERCHART",

  // Tags & Organization
  TAGS: "TAG",
  TRANSACTION_TAGS: "TRANSACTION_TAG",
  SPLIT_TRANSACTIONS: "SPLIT_TRANSACTION",

  // Reports & Settings
  REPORTS: "REPORT",
  APP_SETTINGS: "APP_SETTINGS",
  CATEGORY_BUDGET_TEMPLATES: "CATEGORY_BUDGET_TEMPLATE",
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
