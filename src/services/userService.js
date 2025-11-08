import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDoc,
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

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      this._checkFirestore();

      const usersRef = collection(db, this.collectionName);
      const q = query(usersRef, where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
        lastLoginTime: data.lastLoginTime?.toDate?.() || null,
      };
    } catch (error) {
      console.error("❌ Get user by email error:", error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      this._checkFirestore();

      const userRef = doc(db, this.collectionName, userId);
      const { getDoc } = await import("firebase/firestore");
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const data = userSnap.data();
      return {
        id: userSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
        lastLoginTime: data.lastLoginTime?.toDate?.() || null,
      };
    } catch (error) {
      console.error("❌ Get user by ID error:", error);
      throw error;
    }
  }

  /**
   * Check if user is super admin
   * Super admin is the first admin (created first) or has isSuperAdmin = true
   */
  async isSuperAdmin(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      // Check if user has isSuperAdmin flag
      if (user.isSuperAdmin === true) {
        return true;
      }

      // If no isSuperAdmin flag, check if this is the first admin (created first)
      if (user.role === "ADMIN") {
        const allUsers = await this.getAllUsers();
        const admins = allUsers
          .filter((u) => u.role === "ADMIN")
          .sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return a.createdAt - b.createdAt;
          });

        // First admin is super admin
        if (admins.length > 0 && admins[0].id === userId) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("❌ Check super admin error:", error);
      return false;
    }
  }

  /**
   * Change user role (only super admin can do this)
   * @param {string} targetUserId - User ID to change role
   * @param {string} newRole - New role: "ADMIN" or "USER"
   * @param {string} currentUserId - Current user ID (must be super admin)
   */
  async changeUserRole(targetUserId, newRole, currentUserId) {
    console.log(
      `🔄 Changing user ${targetUserId} role to ${newRole} by ${currentUserId}`
    );

    try {
      this._checkFirestore();

      // Check if current user is super admin
      const isSuper = await this.isSuperAdmin(currentUserId);
      if (!isSuper) {
        throw new Error(
          "Chỉ có Super Admin mới có quyền thay đổi vai trò người dùng"
        );
      }

      // Get target user
      const targetUser = await this.getUserById(targetUserId);
      if (!targetUser) {
        throw new Error("Không tìm thấy người dùng");
      }

      // Prevent changing super admin role
      if (targetUser.isSuperAdmin === true) {
        throw new Error("Không thể thay đổi vai trò của Super Admin");
      }

      // Prevent new admins from changing other admins
      if (
        targetUser.role === "ADMIN" &&
        newRole === "USER" &&
        !(await this.isSuperAdmin(currentUserId))
      ) {
        throw new Error("Bạn không có quyền hạ cấp Admin khác");
      }

      // Update role
      const userRef = doc(db, this.collectionName, targetUserId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: Timestamp.now(),
        // If promoting to admin, set isSuperAdmin to false (regular admin)
        ...(newRole === "ADMIN" && { isSuperAdmin: false }),
      });

      console.log(`✅ User ${targetUserId}: ${targetUser.role} → ${newRole}`);
      return newRole;
    } catch (error) {
      console.error("❌ Change role error:", error);
      throw error;
    }
  }

  /**
   * Create a new user account
   * @param {Object} userData - User data (email, name, phoneNumber, etc.)
   * @param {boolean} isAdmin - Whether to create as admin
   * @param {string} createdBy - ID of user creating this account
   * @returns {Promise<string>} - New user ID
   */
  async createUser(userData, isAdmin = false, createdBy = null) {
    console.log(`🆕 Creating new user: ${userData.email}, Admin: ${isAdmin}`);

    try {
      this._checkFirestore();

      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error("Email đã được sử dụng");
      }

      const usersRef = collection(db, this.collectionName);
      
      // Determine account status
      // If created by admin (createdBy is not null), status is ACTIVE
      // If self-registered (createdBy is null), status is PENDING (waiting for approval)
      const accountStatus = createdBy ? "ACTIVE" : "PENDING";

      const newUser = {
        email: userData.email,
        name: userData.name || userData.email.split("@")[0],
        phoneNumber: userData.phoneNumber || null,
        role: isAdmin ? "ADMIN" : "USER",
        accountStatus: accountStatus,
        isSuperAdmin: false, // New users are never super admin
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: createdBy || null,
        lastLoginTime: null,
      };

      const docRef = await addDoc(usersRef, newUser);
      console.log(`✅ Created user: ${docRef.id} (${userData.email})`);
      return docRef.id;
    } catch (error) {
      console.error("❌ Create user error:", error);
      throw error;
    }
  }

  /**
   * Check if email is super admin email
   */
  isSuperAdminEmail(email) {
    const SUPER_ADMIN_EMAIL = "thachdien142004@gmail.com";
    return email && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  }
}

export default new UserService();
