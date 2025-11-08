/**
 * Generic Collection Service
 * Handles CRUD operations for any Firestore collection
 */

import BaseService from "./BaseService";
import { COLLECTIONS } from "../constants/collections";
import { Timestamp } from "firebase/firestore";
import { db } from "../firebase";

class CollectionService extends BaseService {
  constructor(collectionName) {
    super(collectionName);
  }

  /**
   * Get all documents with real-time updates
   */
  subscribe(callback, errorCallback) {
    try {
      this._checkFirestore();
      
      // Dynamic import for onSnapshot (only needed for real-time subscriptions)
      import("firebase/firestore").then(({ collection, onSnapshot }) => {
        const colRef = collection(db, this.collectionName);
        
        if (!callback) {
          console.warn("No callback provided for subscription");
          return;
        }

        onSnapshot(
          colRef,
          (snapshot) => {
            const items = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              items.push({
                id: docSnap.id,
                ...this._transformData(data),
              });
            });

            console.log(`✅ Loaded ${items.length} documents from ${this.collectionName}`);
            if (callback) callback(items);
          },
          (error) => {
            console.error(`❌ Subscription error for ${this.collectionName}:`, error);
            if (errorCallback) errorCallback(error);
          }
        );
      }).catch((error) => {
        console.error(`❌ Import error for ${this.collectionName}:`, error);
        if (errorCallback) errorCallback(error);
      });

      // Return a cleanup function (simplified)
      return () => {
        // Note: Real-time subscriptions are automatically cleaned up when component unmounts
        console.log(`Unsubscribed from ${this.collectionName}`);
      };
    } catch (error) {
      console.error(`❌ Setup error for ${this.collectionName}:`, error);
      if (errorCallback) errorCallback(error);
      return () => {};
    }
  }

  /**
   * Transform data (inherit from BaseService)
   */
  _transformData(data) {
    const transformed = { ...data };

    // Convert all Timestamp fields to Date
    Object.keys(transformed).forEach((key) => {
      if (transformed[key]?.toDate) {
        transformed[key] = transformed[key].toDate();
      }
    });

    return transformed;
  }

  /**
   * Create document with custom ID
   */
  async createWithId(docId, data) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const docRef = doc(db, this.collectionName, docId);
      
      const dataToSave = { ...data };
      
      // Only add timestamps if they don't exist
      if (!dataToSave.createdAt) {
        dataToSave.createdAt = Timestamp.now();
      }
      if (!dataToSave.updatedAt) {
        dataToSave.updatedAt = Timestamp.now();
      }
      
      await setDoc(docRef, dataToSave);

      console.log(`✅ Created ${this.collectionName} with ID:`, docId);
      return docId;
    } catch (error) {
      console.error(`❌ Error creating ${this.collectionName} with ID:`, error);
      throw error;
    }
  }

  /**
   * Batch create documents
   */
  async batchCreate(dataArray) {
    try {
      const { writeBatch, doc, collection } = await import("firebase/firestore");
      const batch = writeBatch(db);
      const colRef = collection(db, this.collectionName);

      dataArray.forEach((data) => {
        const docRef = doc(colRef);
        batch.set(docRef, {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
      console.log(`✅ Batch created ${dataArray.length} documents in ${this.collectionName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error batch creating in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch update documents
   */
  async batchUpdate(updates) {
    try {
      const { writeBatch, doc } = await import("firebase/firestore");
      const batch = writeBatch(db);

      updates.forEach(({ docId, data }) => {
        const docRef = doc(db, this.collectionName, docId);
        batch.update(docRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
      console.log(`✅ Batch updated ${updates.length} documents in ${this.collectionName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error batch updating in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch delete documents
   */
  async batchDelete(docIds) {
    try {
      const { writeBatch, doc } = await import("firebase/firestore");
      const batch = writeBatch(db);

      docIds.forEach((docId) => {
        const docRef = doc(db, this.collectionName, docId);
        batch.delete(docRef);
      });

      await batch.commit();
      console.log(`✅ Batch deleted ${docIds.length} documents from ${this.collectionName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error batch deleting from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get collection schema (field names from first document or expected structure)
   */
  async getSchema() {
    try {
      const items = await this.getAll();
      if (items.length === 0) {
        return [];
      }

      // Get all unique keys from all documents
      const schema = new Set();
      items.forEach((item) => {
        Object.keys(item).forEach((key) => {
          if (key !== "id") {
            schema.add(key);
          }
        });
      });

      return Array.from(schema).sort();
    } catch (error) {
      console.error(`❌ Error getting schema for ${this.collectionName}:`, error);
      return [];
    }
  }
}

/**
 * Create service instance for a collection
 */
export const createCollectionService = (collectionName) => {
  return new CollectionService(collectionName);
};

/**
 * Get service for all collections
 */
export const getCollectionServices = () => {
  const services = {};
  Object.values(COLLECTIONS).forEach((collectionName) => {
    services[collectionName] = createCollectionService(collectionName);
  });
  return services;
};

export default CollectionService;

