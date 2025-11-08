/**
 * Notification Service
 * Handles notification creation and management
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";

class NotificationService {
  constructor() {
    this.collectionName = COLLECTIONS.NOTIFICATIONS;
  }

  /**
   * Create a notification
   */
  async createNotification(notificationData) {
    try {
      const notificationRef = collection(db, this.collectionName);
      
      const notification = {
        userID: notificationData.userID,
        type: notificationData.type || "SYSTEM",
        title: notificationData.title,
        message: notificationData.message || "",
        isRead: false,
        priority: notificationData.priority || "NORMAL",
        relatedEntityType: notificationData.relatedEntityType || null,
        relatedEntityID: notificationData.relatedEntityID || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(notificationRef, notification);
      console.log(`✅ Created notification: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Create admin role change notification
   */
  async createAdminRoleNotification(userId, newRole, changedBy, changedByName) {
    try {
      const title = newRole === "ADMIN" 
        ? "Bạn đã được cấp quyền Quản trị viên"
        : "Quyền Quản trị viên của bạn đã bị thu hồi";
      
      const message = newRole === "ADMIN"
        ? `Quản trị viên ${changedByName || changedBy} đã cấp quyền Quản trị viên cho tài khoản của bạn. Bạn hiện có thể quản lý hệ thống.`
        : `Quản trị viên ${changedByName || changedBy} đã thu hồi quyền Quản trị viên của bạn. Tài khoản của bạn hiện là Người dùng thông thường.`;

      return await this.createNotification({
        userID: userId,
        type: "SYSTEM",
        title,
        message,
        priority: "HIGH",
        relatedEntityType: "USER",
        relatedEntityID: userId,
      });
    } catch (error) {
      console.error("❌ Error creating admin role notification:", error);
      throw error;
    }
  }

  /**
   * Create account creation notification
   */
  async createAccountCreationNotification(userId, createdBy, createdByName, isAdmin = false) {
    try {
      const title = isAdmin
        ? "Tài khoản Quản trị viên đã được tạo"
        : "Tài khoản của bạn đã được tạo";
      
      const message = isAdmin
        ? `Quản trị viên ${createdByName || createdBy} đã tạo tài khoản Quản trị viên cho bạn. Bạn có thể đăng nhập và bắt đầu quản lý hệ thống.`
        : `Tài khoản của bạn đã được tạo bởi ${createdByName || createdBy}. Bạn có thể đăng nhập và sử dụng hệ thống.`;

      return await this.createNotification({
        userID: userId,
        type: "SYSTEM",
        title,
        message,
        priority: isAdmin ? "HIGH" : "NORMAL",
        relatedEntityType: "USER",
        relatedEntityID: userId,
      });
    } catch (error) {
      console.error("❌ Error creating account creation notification:", error);
      throw error;
    }
  }

  /**
   * Create new user registration notification for Super Admin
   */
  async createNewUserRegistrationNotification(newUserEmail, newUserName, newUserId) {
    try {
      const SUPER_ADMIN_EMAIL = "thachdien142004@gmail.com";
      
      // Get Super Admin user by email
      const { getUserByEmail } = await import("../services/userService");
      const superAdmin = await getUserByEmail(SUPER_ADMIN_EMAIL);
      
      if (!superAdmin) {
        console.warn("Super Admin not found, skipping notification");
        return null;
      }

      const title = "Yêu cầu đăng ký tài khoản mới";
      const message = `Người dùng ${newUserName} (${newUserEmail}) đã đăng ký tài khoản mới. Vui lòng xem xét và phê duyệt tài khoản này trong trang Quản lý người dùng.`;

      const notificationId = await this.createNotification({
        userID: superAdmin.id,
        type: "SYSTEM",
        title,
        message,
        priority: "HIGH",
        relatedEntityType: "USER",
        relatedEntityID: newUserId,
      });

      console.log(`✅ Notification sent to Super Admin (${SUPER_ADMIN_EMAIL}):`, {
        notificationId,
        newUserEmail,
        newUserName,
        newUserId
      });

      return notificationId;
    } catch (error) {
      console.error("❌ Error creating new user registration notification:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        updatedAt: Timestamp.now(),
      });
      console.log(`✅ Marked notification ${notificationId} as read`);
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, limitCount = 50) {
    try {
      const notificationsRef = collection(db, this.collectionName);
      const q = query(
        notificationsRef,
        where("userID", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const notifications = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        notifications.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
        });
      });

      return notifications;
    } catch (error) {
      console.error("❌ Error getting user notifications:", error);
      throw error;
    }
  }

  /**
   * Subscribe to user notifications (real-time)
   */
  subscribeToUserNotifications(userId, callback, errorCallback) {
    try {
      const notificationsRef = collection(db, this.collectionName);
      const q = query(
        notificationsRef,
        where("userID", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifications = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            notifications.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || null,
              updatedAt: data.updatedAt?.toDate?.() || null,
            });
          });
          callback(notifications);
        },
        (error) => {
          console.error("❌ Notification subscription error:", error);
          if (errorCallback) errorCallback(error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("❌ Error setting up notification subscription:", error);
      if (errorCallback) errorCallback(error);
      return () => {};
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const notificationsRef = collection(db, this.collectionName);
      const q = query(
        notificationsRef,
        where("userID", "==", userId),
        where("isRead", "==", false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error("❌ Error getting unread count:", error);
      return 0;
    }
  }
}

export default new NotificationService();

