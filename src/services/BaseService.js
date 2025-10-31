import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

class BaseService {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  /**
   * Check Firestore
   */
  _checkFirestore() {
    if (!db) {
      throw new Error("Firestore not initialized");
    }
  }

  /**
   * Get collection reference
   */
  getCollectionRef() {
    this._checkFirestore();
    return collection(db, this.collectionName);
  }

  /**
   * Get document reference
   */
  getDocRef(docId) {
    this._checkFirestore();
    return doc(db, this.collectionName, docId);
  }

  /**
   * Get all documents
   */
  async getAll() {
    console.log(`📥 Fetching all ${this.collectionName}...`);

    try {
      const colRef = this.getCollectionRef();
      const snapshot = await getDocs(colRef);

      if (snapshot.empty) {
        console.warn(`⚠️  ${this.collectionName} is empty`);
        return [];
      }

      const items = [];
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...this._transformData(doc.data()),
        });
      });

      console.log(`✅ Fetched ${items.length} ${this.collectionName}`);
      return items;
    } catch (error) {
      console.error(`❌ Error fetching ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get by ID
   */
  async getById(docId) {
    try {
      const docRef = this.getDocRef(docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`Document ${docId} not found`);
      }

      return {
        id: docSnap.id,
        ...this._transformData(docSnap.data()),
      };
    } catch (error) {
      console.error(`❌ Error getting document ${docId}:`, error);
      throw error;
    }
  }

  /**
   * Create document
   */
  async create(data) {
    try {
      const colRef = this.getCollectionRef();
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ Created ${this.collectionName}:`, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error(`❌ Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async update(docId, data) {
    try {
      const docRef = this.getDocRef(docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ Updated ${this.collectionName}:`, docId);
      return true;
    } catch (error) {
      console.error(`❌ Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async delete(docId) {
    try {
      const docRef = this.getDocRef(docId);
      await deleteDoc(docRef);

      console.log(`✅ Deleted ${this.collectionName}:`, docId);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Transform Firestore data (convert Timestamps)
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
   * Query with conditions
   */
  async queryWhere(field, operator, value) {
    try {
      const colRef = this.getCollectionRef();
      const q = query(colRef, where(field, operator, value));
      const snapshot = await getDocs(q);

      const items = [];
      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...this._transformData(doc.data()),
        });
      });

      return items;
    } catch (error) {
      console.error(`❌ Query error:`, error);
      throw error;
    }
  }
}

export default BaseService;
