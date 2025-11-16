/**
 * Activity Log Service
 * Handles activity logging and access history tracking
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";

class ActivityLogService {
  constructor() {
    this.collectionName = COLLECTIONS.ACTIVITY_LOG;
  }

  /**
   * Log user activity
   */
  async logActivity(activityData) {
    try {
      const logRef = collection(db, this.collectionName);
      
      const log = {
        userId: activityData.userId,
        userEmail: activityData.userEmail,
        userName: activityData.userName,
        action: activityData.action, // LOGIN, LOGOUT, CREATE_USER, UPDATE_USER, DELETE_USER, etc.
        entityType: activityData.entityType || null, // USER, CATEGORY, TRANSACTION, etc.
        entityId: activityData.entityId || null,
        details: activityData.details || {},
        ipAddress: activityData.ipAddress || null,
        userAgent: activityData.userAgent || null,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(logRef, log);
      console.log(`✅ Activity logged: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error logging activity:", error);
      throw error;
    }
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filters = {}) {
    try {
      const logRef = collection(db, this.collectionName);
      const conditions = [];

      if (filters.userId) {
        conditions.push(where("userId", "==", filters.userId));
      }
      if (filters.action) {
        conditions.push(where("action", "==", filters.action));
      }
      if (filters.entityType) {
        conditions.push(where("entityType", "==", filters.entityType));
      }
      if (filters.startDate) {
        conditions.push(where("timestamp", ">=", Timestamp.fromDate(filters.startDate)));
      }
      if (filters.endDate) {
        conditions.push(where("timestamp", "<=", Timestamp.fromDate(filters.endDate)));
      }

      // Add orderBy
      conditions.push(orderBy("timestamp", "desc"));
      
      // Add limit
      const limitCount = filters.limit || 100;
      conditions.push(limit(limitCount));

      const q = query(logRef, ...conditions);
      const snapshot = await getDocs(q);

      const logs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || null,
          createdAt: data.createdAt?.toDate?.() || null,
        });
      });

      return logs;
    } catch (error) {
      console.error("❌ Error getting activity logs:", error);
      throw error;
    }
  }

  /**
   * Subscribe to activity logs (real-time)
   */
  subscribeToActivityLogs(filters, callback, errorCallback) {
    try {
      const logRef = collection(db, this.collectionName);
      const conditions = [];

      if (filters?.userId) {
        conditions.push(where("userId", "==", filters.userId));
      }
      if (filters?.action) {
        conditions.push(where("action", "==", filters.action));
      }

      conditions.push(orderBy("timestamp", "desc"));
      conditions.push(limit(filters?.limit || 100));

      const q = query(logRef, ...conditions);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const logs = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            logs.push({
              id: docSnap.id,
              ...data,
              timestamp: data.timestamp?.toDate?.() || null,
              createdAt: data.createdAt?.toDate?.() || null,
            });
          });
          callback(logs);
        },
        (error) => {
          console.error("❌ Activity log subscription error:", error);
          if (errorCallback) errorCallback(error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("❌ Error setting up activity log subscription:", error);
      if (errorCallback) errorCallback(error);
      return () => {};
    }
  }

  /**
   * Get user access history
   */
  async getUserAccessHistory(userId, limitCount = 50) {
    try {
      return await this.getActivityLogs({
        userId,
        action: "LOGIN",
        limit: limitCount,
      });
    } catch (error) {
      console.error("❌ Error getting user access history:", error);
      throw error;
    }
  }

  /**
   * Get login statistics
   */
  async getLoginStatistics(startDate, endDate) {
    try {
      const logs = await this.getActivityLogs({
        action: "LOGIN",
        startDate,
        endDate,
        limit: 1000,
      });

      const stats = {
        total: logs.length,
        uniqueUsers: new Set(logs.map((log) => log.userId)).size,
        byDay: {},
        byHour: {},
      };

      logs.forEach((log) => {
        if (log.timestamp) {
          const date = log.timestamp.toISOString().split("T")[0];
          const hour = log.timestamp.getHours();

          stats.byDay[date] = (stats.byDay[date] || 0) + 1;
          stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error("❌ Error getting login statistics:", error);
      throw error;
    }
  }
}

export default new ActivityLogService();

