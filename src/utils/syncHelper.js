/**
 * Sync Helper Utilities
 * Helper functions for database synchronization
 */

import syncService from "../services/syncService";
import { COLLECTIONS } from "../constants/collections";

/**
 * Validate data structure before sync
 */
export function validateDataStructure(data, collectionName) {
  if (!data || !Array.isArray(data)) {
    throw new Error(`Invalid data: expected array for ${collectionName}`);
  }

  // Check for required fields based on collection
  const requiredFields = {
    USER: ["userID", "email"],
    CATEGORY: ["categoryID", "name", "type"],
    TRANSACTION: ["transactionID", "userID", "amount", "type", "date"],
    BUDGET: ["budgetID", "userID", "categoryID", "budgetAmount"],
    GOAL: ["goalID", "userID", "name", "targetAmount"],
  };

  const required = requiredFields[collectionName];
  if (!required) {
    return true; // No validation for this collection
  }

  for (const item of data) {
    for (const field of required) {
      if (!item[field]) {
        throw new Error(
          `Missing required field "${field}" in ${collectionName} record: ${JSON.stringify(item)}`
        );
      }
    }
  }

  return true;
}

/**
 * Compare two records to find differences
 */
export function compareRecords(record1, record2, ignoreFields = ["updatedAt", "createdAt"]) {
  const differences = {};

  const allKeys = new Set([
    ...Object.keys(record1),
    ...Object.keys(record2),
  ]);

  for (const key of allKeys) {
    if (ignoreFields.includes(key)) {
      continue;
    }

    const value1 = record1[key];
    const value2 = record2[key];

    if (JSON.stringify(value1) !== JSON.stringify(value2)) {
      differences[key] = {
        old: value1,
        new: value2,
      };
    }
  }

  return differences;
}

/**
 * Merge two records (Firestore wins on conflict)
 */
export function mergeRecords(localRecord, firestoreRecord, preferFirestore = true) {
  if (preferFirestore) {
    return {
      ...localRecord,
      ...firestoreRecord,
      // Keep local sync status if it's not synced
      isSynced: localRecord.isSynced === false ? false : true,
    };
  } else {
    return {
      ...firestoreRecord,
      ...localRecord,
    };
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics(sqliteDB) {
  const tables = Object.values(COLLECTIONS);
  const stats = {};

  for (const collectionName of tables) {
    try {
      const tableName = syncService._getTableName(collectionName);
      
      // Get total count
      const totalQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
      const totalResult = sqliteDB.getFirstSync(totalQuery);
      const total = totalResult?.count || 0;

      // Get synced count
      const syncedQuery = `SELECT COUNT(*) as count FROM ${tableName} WHERE isSynced = 1`;
      const syncedResult = sqliteDB.getFirstSync(syncedQuery);
      const synced = syncedResult?.count || 0;

      // Get unsynced count
      const unsynced = total - synced;

      stats[collectionName] = {
        total,
        synced,
        unsynced,
        syncPercentage: total > 0 ? ((synced / total) * 100).toFixed(2) : 0,
      };
    } catch (error) {
      console.error(`Error getting stats for ${collectionName}:`, error);
      stats[collectionName] = {
        total: 0,
        synced: 0,
        unsynced: 0,
        syncPercentage: 0,
        error: error.message,
      };
    }
  }

  return stats;
}

/**
 * Clean up old sync logs
 */
export async function cleanupSyncLogs(sqliteDB, daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    const query = `DELETE FROM SYNC_LOG WHERE createdAt < ?`;
    const result = sqliteDB.runSync(query, [cutoffISO]);

    console.log(`✅ Cleaned up sync logs older than ${daysToKeep} days`);
    return result;
  } catch (error) {
    console.error("❌ Error cleaning up sync logs:", error);
    throw error;
  }
}

/**
 * Export sync statistics to JSON
 */
export async function exportSyncStatistics(sqliteDB, outputPath) {
  const stats = await getSyncStatistics(sqliteDB);
  const json = JSON.stringify(stats, null, 2);

  if (outputPath) {
    const fs = require("fs");
    fs.writeFileSync(outputPath, json, "utf-8");
    console.log(`✅ Exported sync statistics to ${outputPath}`);
  }

  return stats;
}

export default {
  validateDataStructure,
  compareRecords,
  mergeRecords,
  getSyncStatistics,
  cleanupSyncLogs,
  exportSyncStatistics,
};

