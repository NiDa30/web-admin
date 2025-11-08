/**
 * Sync Service
 * Handles synchronization between Firestore and SQLite
 * Firestore is the Source of Truth
 */

import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";
import {
  getTableName,
  getCollectionName,
  getPrimaryKeyField,
} from "../constants/databaseMapping";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  query,
  where,
} from "firebase/firestore";

class SyncService {
  constructor() {
    this.batchSize = 500; // Firestore batch limit
  }

  /**
   * Convert Firestore Timestamp to ISO string
   */
  _timestampToISO(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate) {
      return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    return timestamp;
  }

  /**
   * Convert ISO string to Firestore Timestamp
   */
  _isoToTimestamp(isoString) {
    if (!isoString) return null;
    try {
      return Timestamp.fromDate(new Date(isoString));
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform Firestore document to SQLite format
   */
  _transformFirestoreToSQLite(data, collectionName) {
    const transformed = { ...data };
    const primaryKey = getPrimaryKeyField(collectionName);

    // Set primary key from document ID if not present
    if (!transformed[primaryKey] && data.id) {
      transformed[primaryKey] = data.id;
    }

    // Convert all Timestamp fields to ISO strings
    Object.keys(transformed).forEach((key) => {
      const value = transformed[key];
      if (value?.toDate) {
        transformed[key] = this._timestampToISO(value);
      } else if (value instanceof Date) {
        transformed[key] = value.toISOString();
      } else if (key.includes("At") || key.includes("Time") || key === "date") {
        // Try to convert date strings
        if (typeof value === "string" && value.includes("T")) {
          transformed[key] = value;
        }
      }
    });

    return transformed;
  }

  /**
   * Transform SQLite data to Firestore format
   */
  _transformSQLiteToFirestore(data, collectionName) {
    const transformed = { ...data };
    const primaryKey = getPrimaryKeyField(collectionName);

    // Remove primary key from data (will use as document ID)
    const docId = transformed[primaryKey];
    delete transformed[primaryKey];

    // Convert ISO strings to Timestamps
    Object.keys(transformed).forEach((key) => {
      const value = transformed[key];
      if (
        (key.includes("At") || key.includes("Time") || key === "date") &&
        typeof value === "string"
      ) {
        const timestamp = this._isoToTimestamp(value);
        if (timestamp) {
          transformed[key] = timestamp;
        }
      }
    });

    return { docId, data: transformed };
  }

  /**
   * Export all data from Firestore to JSON format (for CSV generation)
   */
  async exportCollectionToJSON(collectionName) {
    try {
      console.log(`📤 Exporting ${collectionName} from Firestore...`);

      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);

      const items = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const transformed = this._transformFirestoreToSQLite(
          { id: docSnap.id, ...data },
          collectionName
        );
        items.push(transformed);
      });

      console.log(`✅ Exported ${items.length} documents from ${collectionName}`);
      return items;
    } catch (error) {
      console.error(`❌ Error exporting ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Export all collections to JSON
   */
  async exportAllCollectionsToJSON() {
    const collections = Object.values(COLLECTIONS);
    const results = {};

    for (const collectionName of collections) {
      try {
        results[collectionName] = await this.exportCollectionToJSON(
          collectionName
        );
      } catch (error) {
        console.error(
          `❌ Failed to export ${collectionName}:`,
          error.message
        );
        results[collectionName] = [];
      }
    }

    return results;
  }

  /**
   * Import data from SQLite format to Firestore
   */
  async importCollectionFromData(collectionName, dataArray) {
    try {
      console.log(
        `📥 Importing ${dataArray.length} documents to ${collectionName}...`
      );

      const batches = [];
      let currentBatch = writeBatch(db);
      let batchCount = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const item = dataArray[i];
        const { docId, data } = this._transformSQLiteToFirestore(
          item,
          collectionName
        );

        if (!docId) {
          console.warn(`⚠️ Skipping item without ID:`, item);
          continue;
        }

        const docRef = doc(db, collectionName, docId);
        currentBatch.set(docRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });

        batchCount++;

        // Commit batch when it reaches the limit
        if (batchCount >= this.batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      }

      // Add remaining batch
      if (batchCount > 0) {
        batches.push(currentBatch);
      }

      // Commit all batches
      for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        console.log(
          `✅ Committed batch ${i + 1}/${batches.length} for ${collectionName}`
        );
      }

      console.log(`✅ Imported ${dataArray.length} documents to ${collectionName}`);
      return { collection: collectionName, count: dataArray.length };
    } catch (error) {
      console.error(`❌ Error importing to ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Sync single collection from Firestore to SQLite format
   * Returns data ready for SQLite insertion
   */
  async syncCollectionFromFirestore(collectionName, sqliteDB) {
    try {
      console.log(`🔄 Syncing ${collectionName} from Firestore to SQLite...`);

      const data = await this.exportCollectionToJSON(collectionName);
      const tableName = getTableName(collectionName);
      const primaryKey = getPrimaryKeyField(collectionName);

      if (!sqliteDB) {
        // Return data for external SQLite insertion
        return { tableName, data, primaryKey };
      }

      // Insert into SQLite
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const columnNames = columns.join(", ");

        sqliteDB.beginTransaction();

        try {
          // Clear existing data (optional - you might want to merge instead)
          // sqliteDB.execSync(`DELETE FROM ${tableName}`);

          for (const item of data) {
            const values = columns.map((col) => item[col] || null);
            const insertQuery = `INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
            sqliteDB.runSync(insertQuery, values);
          }

          sqliteDB.commitTransaction();
          console.log(`✅ Synced ${data.length} records to ${tableName}`);
        } catch (error) {
          sqliteDB.rollbackTransaction();
          throw error;
        }
      }

      return { tableName, count: data.length };
    } catch (error) {
      console.error(`❌ Error syncing ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Sync all collections from Firestore
   */
  async syncAllFromFirestore(sqliteDB) {
    const collections = Object.values(COLLECTIONS);
    const results = [];

    for (const collectionName of collections) {
      try {
        const result = await this.syncCollectionFromFirestore(
          collectionName,
          sqliteDB
        );
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to sync ${collectionName}:`, error.message);
        results.push({
          collection: collectionName,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get unsynced records from SQLite (where isSynced = false)
   */
  getUnsyncedRecords(sqliteDB, tableName) {
    try {
      const query = `SELECT * FROM ${tableName} WHERE isSynced = 0 OR isSynced IS NULL`;
      const records = sqliteDB.getAllSync(query);
      return records;
    } catch (error) {
      console.error(`❌ Error getting unsynced records from ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Mark record as synced in SQLite
   */
  markAsSynced(sqliteDB, tableName, recordId, primaryKey) {
    try {
      const query = `UPDATE ${tableName} SET isSynced = 1 WHERE ${primaryKey} = ?`;
      sqliteDB.runSync(query, [recordId]);
    } catch (error) {
      console.error(`❌ Error marking record as synced:`, error);
    }
  }

  /**
   * Sync unsynced records from SQLite to Firestore
   */
  async syncUnsyncedToFirestore(sqliteDB, collectionName) {
    try {
      const tableName = getTableName(collectionName);
      const primaryKey = getPrimaryKeyField(collectionName);

      const unsyncedRecords = this.getUnsyncedRecords(sqliteDB, tableName);

      if (unsyncedRecords.length === 0) {
        console.log(`✅ No unsynced records in ${tableName}`);
        return { collection: collectionName, count: 0 };
      }

      console.log(
        `📤 Syncing ${unsyncedRecords.length} unsynced records from ${tableName} to Firestore...`
      );

      await this.importCollectionFromData(collectionName, unsyncedRecords);

      // Mark all as synced
      for (const record of unsyncedRecords) {
        this.markAsSynced(sqliteDB, tableName, record[primaryKey], primaryKey);
      }

      return { collection: collectionName, count: unsyncedRecords.length };
    } catch (error) {
      console.error(`❌ Error syncing unsynced records:`, error);
      throw error;
    }
  }
}

export default new SyncService();

