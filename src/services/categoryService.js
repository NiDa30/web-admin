// services/categoryService.js
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";

/**
 * Category Service - Quản lý categories trong Firestore
 */

// ===================================================================
// 📥 LẤY DỮ LIỆU (READ)
// ===================================================================

/**
 * Lấy tất cả categories theo type (expense/income)
 * @param {string} userId - ID của user
 * @param {string} type - 'expense' hoặc 'income'
 * @returns {Promise<Array>} Danh sách categories
 */
export const getCategoriesByType = async (userId, type) => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    // Normalize type to uppercase (EXPENSE/INCOME)
    const normalizedType = type.toUpperCase();

    let querySnapshot;

    // Try with orderBy first, fallback to without orderBy if index missing
    try {
      const q = query(
        categoriesRef,
        where("type", "==", normalizedType),
        orderBy("displayOrder", "asc")
      );
      querySnapshot = await getDocs(q);
    } catch (indexError) {
      console.warn(
        "OrderBy index missing, fetching without order:",
        indexError.message
      );
      // Fallback: get all then sort in memory
      const q = query(categoriesRef, where("type", "==", normalizedType));
      querySnapshot = await getDocs(q);
    }

    const categories = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // If userId is null (admin view), show all categories
      // Otherwise, show system defaults OR user's categories
      if (userId === null || userId === undefined) {
        categories.push({
          id: doc.id,
          ...data,
        });
      } else if (
        data.isSystemDefault ||
        data.userId === userId ||
        !data.userId
      ) {
        categories.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Sort by displayOrder in memory if orderBy wasn't available
    categories.sort((a, b) => {
      const orderA = a.displayOrder ?? a.order ?? 999;
      const orderB = b.displayOrder ?? b.order ?? 999;
      return orderA - orderB;
    });

    return categories;
  } catch (error) {
    console.error("Error getting categories:", error);
    throw error;
  }
};

/**
 * Lấy tất cả categories của user (cả expense và income)
 * @param {string} userId - ID của user
 * @returns {Promise<Object>} Object chứa expense và income categories
 */
export const getAllCategories = async (userId) => {
  try {
    const [expenseCategories, incomeCategories] = await Promise.all([
      getCategoriesByType(userId, "EXPENSE"),
      getCategoriesByType(userId, "INCOME"),
    ]);

    return {
      expense: expenseCategories,
      income: incomeCategories,
    };
  } catch (error) {
    console.error("Error getting all categories:", error);
    throw error;
  }
};

/**
 * Lấy một category theo ID
 * @param {string} categoryId - ID của category
 * @returns {Promise<Object>} Category data
 */
export const getCategoryById = async (categoryId) => {
  try {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (categorySnap.exists()) {
      return {
        id: categorySnap.id,
        ...categorySnap.data(),
      };
    } else {
      throw new Error("Category not found");
    }
  } catch (error) {
    console.error("Error getting category:", error);
    throw error;
  }
};

// ===================================================================
// ➕ THÊM MỚI (CREATE)
// ===================================================================

/**
 * Thêm category mới
 * @param {Object} categoryData - Dữ liệu category
 * @returns {Promise<Object>} Category vừa tạo với ID
 */
export const addCategory = async (categoryData) => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);

    // Chuẩn bị dữ liệu
    const newCategory = {
      ...categoryData,
      count: categoryData.count || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(categoriesRef, newCategory);

    return {
      id: docRef.id,
      ...newCategory,
    };
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

/**
 * Thêm nhiều categories cùng lúc (bulk insert)
 * @param {Array} categoriesData - Mảng các category data
 * @returns {Promise<Array>} Mảng categories đã tạo
 */
export const addMultipleCategories = async (categoriesData) => {
  try {
    const promises = categoriesData.map((category) => addCategory(category));
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error adding multiple categories:", error);
    throw error;
  }
};

// ===================================================================
// ✏️ CẬP NHẬT (UPDATE)
// ===================================================================

/**
 * Cập nhật category
 * @param {string} categoryId - ID của category
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @returns {Promise<void>}
 */
export const updateCategory = async (categoryId, updateData) => {
  try {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);

    await updateDoc(categoryRef, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    console.log("Category updated successfully");
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

/**
 * Cập nhật thứ tự categories
 * @param {Array} categoriesOrder - Mảng {id, order}
 * @returns {Promise<void>}
 */
export const updateCategoriesOrder = async (categoriesOrder) => {
  try {
    const promises = categoriesOrder.map(({ id, order }) =>
      updateCategory(id, { order })
    );

    await Promise.all(promises);
    console.log("Categories order updated successfully");
  } catch (error) {
    console.error("Error updating categories order:", error);
    throw error;
  }
};

/**
 * Tăng số lượng giao dịch của category
 * @param {string} categoryId - ID của category
 * @param {number} increment - Số lượng tăng thêm (mặc định 1)
 * @returns {Promise<void>}
 */
export const incrementCategoryCount = async (categoryId, increment = 1) => {
  try {
    const category = await getCategoryById(categoryId);
    await updateCategory(categoryId, {
      count: (category.count || 0) + increment,
    });
  } catch (error) {
    console.error("Error incrementing category count:", error);
    throw error;
  }
};

// ===================================================================
// 🗑️ XÓA (DELETE)
// ===================================================================

/**
 * Xóa category
 * @param {string} categoryId - ID của category
 * @returns {Promise<void>}
 */
export const deleteCategory = async (categoryId) => {
  try {
    const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
    await deleteDoc(categoryRef);
    console.log("Category deleted successfully");
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// ===================================================================
// 🔄 REALTIME LISTENER
// ===================================================================

/**
 * Lắng nghe thay đổi realtime của categories
 * @param {string} userId - ID của user
 * @param {string} type - 'expense' hoặc 'income'
 * @param {Function} callback - Hàm callback khi có thay đổi
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCategories = (userId, type, callback) => {
  const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
  const normalizedType = type.toUpperCase();

  // Try with orderBy first, but handle index errors
  let q;
  try {
    q = query(
      categoriesRef,
      where("type", "==", normalizedType),
      orderBy("displayOrder", "asc")
    );
  } catch (indexError) {
    console.warn(
      "OrderBy index missing, using simple query:",
      indexError.message
    );
    q = query(categoriesRef, where("type", "==", normalizedType));
  }

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const categories = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Include if system default OR belongs to user
        if (data.isSystemDefault || data.userId === userId || !data.userId) {
          categories.push({
            id: doc.id,
            ...data,
          });
        }
      });

      // Sort in memory if needed
      categories.sort((a, b) => {
        const orderA = a.displayOrder ?? a.order ?? 999;
        const orderB = b.displayOrder ?? b.order ?? 999;
        return orderA - orderB;
      });

      callback(categories);
    },
    (error) => {
      console.error("Error in categories subscription:", error);
    }
  );

  return unsubscribe;
};

// ===================================================================
// 🔧 HELPER FUNCTIONS
// ===================================================================

/**
 * Khởi tạo categories mặc định cho user mới
 * @param {string} userId - ID của user
 * @returns {Promise<Object>} Object chứa expense và income categories
 */
export const initializeDefaultCategories = async (userId) => {
  const DEFAULT_EXPENSE_CATEGORIES = [
    {
      name: "Ăn uống",
      icon: "food-apple",
      color: "#FF6347",
      order: 0,
      type: "expense",
    },
    {
      name: "Quần áo",
      icon: "tshirt-crew",
      color: "#32CD32",
      order: 1,
      type: "expense",
    },
    {
      name: "Hoa quả",
      icon: "fruit-cherries",
      color: "#00CED1",
      order: 2,
      type: "expense",
    },
    {
      name: "Mua sắm",
      icon: "shopping",
      color: "#FF69B4",
      order: 3,
      type: "expense",
    },
    {
      name: "Giao thông",
      icon: "bus",
      color: "#ADFF2F",
      order: 4,
      type: "expense",
    },
    {
      name: "Nhà ở",
      icon: "home",
      color: "#FFA500",
      order: 5,
      type: "expense",
    },
    {
      name: "Du lịch",
      icon: "airplane",
      color: "#20B2AA",
      order: 6,
      type: "expense",
    },
    {
      name: "Rượu và đồ uống",
      icon: "glass-wine",
      color: "#BA55D3",
      order: 7,
      type: "expense",
    },
    {
      name: "Chi phí điện nước",
      icon: "water",
      color: "#4682B4",
      order: 8,
      type: "expense",
    },
    { name: "Quà", icon: "gift", color: "#FF4500", order: 9, type: "expense" },
    {
      name: "Giáo dục",
      icon: "school",
      color: "#FFD700",
      order: 10,
      type: "expense",
    },
  ];

  const DEFAULT_INCOME_CATEGORIES = [
    {
      name: "Lương",
      icon: "cash-multiple",
      color: "#4CAF50",
      order: 0,
      type: "income",
    },
    {
      name: "Thưởng",
      icon: "gift",
      color: "#FF9800",
      order: 1,
      type: "income",
    },
    {
      name: "Đầu tư",
      icon: "chart-line",
      color: "#2196F3",
      order: 2,
      type: "income",
    },
    {
      name: "Kinh doanh",
      icon: "store",
      color: "#9C27B0",
      order: 3,
      type: "income",
    },
    {
      name: "Freelance",
      icon: "laptop",
      color: "#00BCD4",
      order: 4,
      type: "income",
    },
    {
      name: "Cho thuê",
      icon: "home-city",
      color: "#795548",
      order: 5,
      type: "income",
    },
    {
      name: "Lãi suất",
      icon: "percent",
      color: "#607D8B",
      order: 6,
      type: "income",
    },
    {
      name: "Bán hàng",
      icon: "sale",
      color: "#E91E63",
      order: 7,
      type: "income",
    },
    {
      name: "Khác",
      icon: "dots-horizontal",
      color: "#9E9E9E",
      order: 8,
      type: "income",
    },
  ];

  try {
    const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
      count: 0,
    }));

    const incomeCategories = DEFAULT_INCOME_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
      count: 0,
    }));

    const [expense, income] = await Promise.all([
      addMultipleCategories(expenseCategories),
      addMultipleCategories(incomeCategories),
    ]);

    return { expense, income };
  } catch (error) {
    console.error("Error initializing default categories:", error);
    throw error;
  }
};

/**
 * Kiểm tra user đã có categories chưa
 * @param {string} userId - ID của user
 * @returns {Promise<boolean>}
 */
export const userHasCategories = async (userId) => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const q = query(categoriesRef, where("userId", "==", userId));

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking user categories:", error);
    throw error;
  }
};
