import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
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
   * Subscribe to users (Real-time) with improved error handling
   */
  subscribeToUsers(callback, errorCallback) {
    console.log(`🔔 Subscribing to ${this.collectionName}...`);

    try {
      this._checkFirestore();

      const usersRef = collection(db, this.collectionName);

      const unsubscribe = onSnapshot(
        usersRef,
        (snapshot) => {
          try {
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
          } catch (callbackError) {
            console.error("❌ Error processing snapshot:", callbackError);
            if (errorCallback) errorCallback(callbackError);
          }
        },
        (error) => {
          // Ignore AbortError (user cancelled request)
          if (
            error.name === "AbortError" ||
            error.message?.includes("aborted")
          ) {
            console.log("ℹ️ Request was aborted, ignoring error");
            return;
          }

          // Check for network/timeout errors
          const isNetworkError =
            error.code === "unavailable" ||
            error.code === "deadline-exceeded" ||
            error.message?.includes("Failed to fetch") ||
            error.message?.includes("timeout") ||
            error.message?.includes("Could not reach") ||
            error.message?.includes("network");

          if (isNetworkError) {
            console.warn(
              "⚠️ Network error in subscription, will retry automatically:",
              error.message
            );
            // Firestore will automatically retry, so we don't need to do anything
            // Just log the warning
          } else {
            console.error("❌ Subscription error:", error);
            if (errorCallback) errorCallback(error);
          }
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
   * Get all users with retry logic
   */
  async getAllUsers(retries = 3) {
    console.log(`📥 Fetching all ${this.collectionName}...`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this._checkFirestore();

        const usersRef = collection(db, this.collectionName);

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 20000); // 20 seconds
        });

        const snapshot = await Promise.race([
          getDocs(usersRef),
          timeoutPromise,
        ]);

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
        // Ignore AbortError
        if (error.name === "AbortError" || error.message?.includes("aborted")) {
          console.log("ℹ️ Request was aborted");
          return [];
        }

        const isTimeout =
          error.message?.includes("timeout") ||
          error.message?.includes("Could not reach") ||
          error.code === "unavailable" ||
          error.code === "deadline-exceeded" ||
          error.message?.includes("Failed to fetch");

        if (isTimeout && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(
            `⚠️ Get all users timeout (attempt ${attempt}/${retries}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error("❌ Fetch error:", error);

        // If it's a network error and we've exhausted retries, return empty array
        if (isTimeout && attempt === retries) {
          console.warn(
            "⚠️ Network timeout after retries, returning empty array"
          );
          return [];
        }

        throw error;
      }
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
   * Get user by email with retry logic
   */
  async getUserByEmail(email, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this._checkFirestore();

        const usersRef = collection(db, this.collectionName);
        const q = query(usersRef, where("email", "==", email));

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 15000); // 15 seconds
        });

        const snapshot = await Promise.race([getDocs(q), timeoutPromise]);

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
        // Ignore AbortError
        if (error.name === "AbortError" || error.message?.includes("aborted")) {
          console.log("ℹ️ Request was aborted");
          return null;
        }

        const isTimeout =
          error.message?.includes("timeout") ||
          error.message?.includes("Could not reach") ||
          error.message?.includes("Failed to fetch") ||
          error.code === "unavailable" ||
          error.code === "deadline-exceeded";

        if (isTimeout && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.warn(
            `⚠️ Get user by email timeout (attempt ${attempt}/${retries}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error("❌ Get user by email error:", error);

        // If it's a network error and we've exhausted retries, return null instead of throwing
        if (isTimeout && attempt === retries) {
          console.warn("⚠️ Network timeout after retries, returning null");
          return null;
        }

        throw error;
      }
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
   * Create a new user account with retry logic
   * @param {Object} userData - User data (email, name, phoneNumber, etc.)
   * @param {boolean} isAdmin - Whether to create as admin
   * @param {string} createdBy - ID of user creating this account
   * @returns {Promise<string>} - New user ID
   */
  async createUser(userData, isAdmin = false, createdBy = null, retries = 3) {
    console.log(`🆕 Creating new user: ${userData.email}, Admin: ${isAdmin}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this._checkFirestore();

        // Check if user already exists (with timeout handling)
        const existingUser = await this.getUserByEmail(userData.email, 1);
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

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 15000); // 15 seconds
        });

        const docRef = await Promise.race([
          addDoc(usersRef, newUser),
          timeoutPromise,
        ]);

        console.log(`✅ Created user: ${docRef.id} (${userData.email})`);
        return docRef.id;
      } catch (error) {
        // Ignore AbortError
        if (error.name === "AbortError" || error.message?.includes("aborted")) {
          console.log("ℹ️ Request was aborted");
          throw new Error("Request was cancelled");
        }

        const isTimeout =
          error.message?.includes("timeout") ||
          error.message?.includes("Could not reach") ||
          error.message?.includes("Failed to fetch") ||
          error.code === "unavailable" ||
          error.code === "deadline-exceeded";

        // Don't retry if it's a duplicate email error
        if (error.message?.includes("đã được sử dụng")) {
          throw error;
        }

        if (isTimeout && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.warn(
            `⚠️ Create user timeout (attempt ${attempt}/${retries}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error("❌ Create user error:", error);
        throw error;
      }
    }
  }

  /**
   * Check if email is super admin email
   */
  isSuperAdminEmail(email) {
    const SUPER_ADMIN_EMAIL = "thachdien142004@gmail.com";
    return email && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  }

  /**
   * Change user password (Admin function)
   * Uses Cloud Functions to change password using Firebase Admin SDK
   * @param {string} userId - User ID to change password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changeUserPassword(userId, newPassword) {
    console.log(`🔐 Changing password for user ${userId}`);

    try {
      // Validate password
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
      }

      // Import Firebase Functions
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const { app } = await import("../firebase");

      // Get Functions instance
      const functions = getFunctions(app);
      const changePasswordFunction = httpsCallable(functions, "changeUserPassword");

      // Call the Cloud Function
      const result = await changePasswordFunction({
        userId: userId,
        newPassword: newPassword,
      });

      console.log(`✅ Password changed successfully for user ${userId}`);
      return result.data;
    } catch (error) {
      console.error("❌ Change password error:", error);

      // Handle specific error codes
      if (error.code === "functions/permission-denied") {
        throw new Error("Bạn không có quyền thay đổi mật khẩu");
      } else if (error.code === "functions/not-found") {
        throw new Error("Không tìm thấy người dùng");
      } else if (error.code === "functions/invalid-argument") {
        throw new Error(error.message || "Dữ liệu không hợp lệ");
      } else if (error.code === "functions/unauthenticated") {
        throw new Error("Bạn cần đăng nhập để thực hiện thao tác này");
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Không thể thay đổi mật khẩu. Vui lòng thử lại sau.");
      }
    }
  }
}

export default new UserService();
