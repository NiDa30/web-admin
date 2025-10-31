import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";

class UserService {
  constructor() {
    this.collectionName = COLLECTIONS.USERS; // ✅ Sử dụng constant
  }

  /**
   * Check Firestore ready
   */
  _checkFirestore() {
    if (!db) {
      throw new Error("Firestore chưa được khởi tạo");
    }
  }

  /**
   * Subscribe to users (Real-time)
   */
  subscribeToUsers(callback, errorCallback) {
    console.log(`🔔 Subscribing to ${this.collectionName}...`);

    try {
      this._checkFirestore();

      const usersRef = collection(db, this.collectionName);

      const unsubscribe = onSnapshot(
        usersRef,
        (snapshot) => {
          const users = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            users.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || null,
              updatedAt: data.updatedAt?.toDate?.() || null,
              lastLoginTime: data.lastLoginTime?.toDate?.() || null,
            });
          });

          // Sort in memory
          users.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
          });

          console.log(`✅ Loaded ${users.length} users from Firestore`);
          callback(users);
        },
        (error) => {
          console.error("❌ Subscription error:", error);
          if (errorCallback) errorCallback(error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("❌ Setup error:", error);
      if (errorCallback) errorCallback(error);
      return () => {};
    }
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    console.log(`📥 Fetching all ${this.collectionName}...`);

    try {
      this._checkFirestore();

      const usersRef = collection(db, this.collectionName);
      const snapshot = await getDocs(usersRef);

      if (snapshot.empty) {
        console.warn(`⚠️  Collection ${this.collectionName} is empty`);
        return [];
      }

      const users = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
          lastLoginTime: data.lastLoginTime?.toDate?.() || null,
        });
      });

      users.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt - a.createdAt;
      });

      console.log(`✅ Fetched ${users.length} users`);
      return users;
    } catch (error) {
      console.error("❌ Fetch error:", error);
      throw error;
    }
  }

  /**
   * Toggle user status
   */
  async toggleUserStatus(userId, currentStatus) {
    console.log(`🔄 Toggling user ${userId}: ${currentStatus}`);

    try {
      this._checkFirestore();

      const userRef = doc(db, this.collectionName, userId);
      const newStatus = currentStatus === "ACTIVE" ? "LOCKED" : "ACTIVE";

      await updateDoc(userRef, {
        accountStatus: newStatus,
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ User ${userId}: ${currentStatus} → ${newStatus}`);
      return newStatus;
    } catch (error) {
      console.error("❌ Toggle error:", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const users = await this.getAllUsers();

      return {
        total: users.length,
        active: users.filter((u) => u.accountStatus === "ACTIVE").length,
        locked: users.filter((u) => u.accountStatus === "LOCKED").length,
        admins: users.filter((u) => u.role === "ADMIN").length,
        regularUsers: users.filter((u) => u.role === "USER").length,
      };
    } catch (error) {
      console.error("❌ Stats error:", error);
      throw error;
    }
  }
}

export default new UserService();
