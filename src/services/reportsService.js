/**
 * Reports Service
 * Handles report data fetching and calculations
 */

import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

/**
 * Get transactions by date range
 * Handles Firestore index requirements by fetching all data and filtering in memory if needed
 */
export const getTransactionsByDateRange = async (
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const txnRef = collection(db, COLLECTIONS.TRANSACTIONS);
    
    let snapshot;
    let transactions = [];

    // Strategy: Try to use indexed queries first, fall back to fetching all and filtering
    // Firestore allows multiple equality filters, but range queries + orderBy require composite index
    
    try {
      // Try optimized query with date range and filters
      const conditions = [
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate)),
      ];

      // Add equality filters (these don't require composite index with date range)
      if (filters.type) {
        conditions.push(where("type", "==", filters.type));
      }
      if (filters.userID) {
        conditions.push(where("userID", "==", filters.userID));
      }
      if (filters.categoryID) {
        conditions.push(where("categoryID", "==", filters.categoryID));
      }

      // Try with orderBy first (requires composite index)
      try {
        const q = query(txnRef, ...conditions, orderBy("date", "desc"));
        snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          let date = null;
          
          if (data.date) {
            if (data.date.toDate) {
              date = data.date.toDate();
            } else if (data.date instanceof Timestamp) {
              date = data.date.toDate();
            } else if (typeof data.date === "string") {
              date = new Date(data.date);
            } else {
              date = new Date(data.date);
            }
          }

          transactions.push({
            id: doc.id,
            ...data,
            date,
          });
        });

        // Already sorted by Firestore
        return transactions;
      } catch (orderByError) {
        // If orderBy fails, try without orderBy
        console.warn("OrderBy index missing, fetching without orderBy:", orderByError.message);
        
        const q = query(txnRef, ...conditions);
        snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          let date = null;
          
          if (data.date) {
            if (data.date.toDate) {
              date = data.date.toDate();
            } else if (data.date instanceof Timestamp) {
              date = data.date.toDate();
            } else if (typeof data.date === "string") {
              date = new Date(data.date);
            } else {
              date = new Date(data.date);
            }
          }

          transactions.push({
            id: doc.id,
            ...data,
            date,
          });
        });

        // Sort in memory
        transactions.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.getTime() - a.date.getTime();
        });

        return transactions;
      }
    } catch (queryError) {
      // Check if it's an index error
      const isIndexError = queryError.message && (
        queryError.message.includes("index") ||
        queryError.message.includes("requires an index") ||
        queryError.message.includes("The query requires an index") ||
        queryError.code === "failed-precondition"
      );

      if (isIndexError) {
        console.warn("Firestore index required, using fallback strategy:", queryError.message);
        
        // Extract index URL from error message if available
        const indexUrlMatch = queryError.message.match(/https:\/\/[^\s\)]+/);
        if (indexUrlMatch) {
          console.info("Index creation URL:", indexUrlMatch[0]);
          // Store URL for user notification
          queryError.indexUrl = indexUrlMatch[0];
        }

        // Fallback Strategy: Use date range only query (usually works without composite index)
        // Then filter and sort in memory
        try {
          console.log("Attempting fallback: date range query only...");
          const dateOnlyQuery = query(
            txnRef,
            where("date", ">=", Timestamp.fromDate(startDate)),
            where("date", "<=", Timestamp.fromDate(endDate))
          );
          const dateOnlySnapshot = await getDocs(dateOnlyQuery);
          
          console.log(`Fetched ${dateOnlySnapshot.size} transactions in date range`);
          
          dateOnlySnapshot.forEach((doc) => {
            const data = doc.data();
            let date = null;
            
            if (data.date) {
              if (data.date.toDate) {
                date = data.date.toDate();
              } else if (data.date instanceof Timestamp) {
                date = data.date.toDate();
              } else if (typeof data.date === "string") {
                date = new Date(data.date);
              } else {
                date = new Date(data.date);
              }
            }

            // Apply other filters in memory (type, userID, categoryID)
            let include = true;
            
            if (filters.type && data.type !== filters.type) {
              include = false;
            }
            if (filters.userID) {
              const userId = data.userID || data.userId;
              if (userId !== filters.userID) {
                include = false;
              }
            }
            if (filters.categoryID) {
              const categoryId = data.categoryID || data.categoryId;
              if (categoryId !== filters.categoryID) {
                include = false;
              }
            }

            if (include && date) {
              transactions.push({
                id: doc.id,
                ...data,
                date,
              });
            }
          });

          // Sort in memory (descending by date)
          transactions.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date.getTime() - a.date.getTime();
          });

          console.log(`✅ Successfully fetched ${transactions.length} transactions (fallback: date range + in-memory filtering)`);
          
          // Attach index URL to a custom property for error handling
          if (indexUrlMatch) {
            // Return transactions but signal that index is recommended
            transactions._indexUrl = indexUrlMatch[0];
            transactions._requiresIndex = true;
          }
          
          return transactions;
        } catch (dateOnlyError) {
          console.error("Date range query also failed:", dateOnlyError);
          
          // If even date range query fails, it might be a permissions issue or other error
          // Re-throw with helpful message
          if (dateOnlyError.message && dateOnlyError.message.includes("index")) {
            const fallbackIndexUrl = dateOnlyError.message.match(/https:\/\/[^\s\)]+/);
            if (fallbackIndexUrl) {
              dateOnlyError.indexUrl = fallbackIndexUrl[0];
            }
          }
          throw dateOnlyError;
        }
      } else {
        // Not an index error, re-throw original error
        throw queryError;
      }
    }
  } catch (error) {
    console.error("Error getting transactions by date range:", error);
    
    // Preserve index URL if available
    if (error.indexUrl) {
      const indexError = new Error(
        `Firestoreインデックスが必要です。以下のリンクからインデックスを作成してください:\n${error.indexUrl}\n\nインデックスの作成には数分かかる場合があります。作成後、ページをリフレッシュしてください。`
      );
      indexError.indexUrl = error.indexUrl;
      indexError.originalError = error;
      throw indexError;
    }
    
    // Provide helpful error message about index
    if (error.message && error.message.includes("index")) {
      const indexUrlMatch = error.message.match(/https:\/\/[^\s\)]+/);
      if (indexUrlMatch) {
        const indexUrl = indexUrlMatch[0];
        console.error("Index creation URL:", indexUrl);
        const indexError = new Error(
          `Firestoreインデックスが必要です。以下のリンクからインデックスを作成してください:\n${indexUrl}\n\nインデックスの作成には数分かかる場合があります。作成後、ページをリフレッシュしてください。`
        );
        indexError.indexUrl = indexUrl;
        throw indexError;
      }
    }
    
    throw error;
  }
};

/**
 * Get category map
 */
export const getCategoryMap = async () => {
  try {
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const defaultCategoriesRef = collection(db, COLLECTIONS.CATEGORIES_DEFAULT);
    
    const [categoriesSnapshot, defaultCategoriesSnapshot] = await Promise.all([
      getDocs(categoriesRef),
      getDocs(defaultCategoriesRef),
    ]);

    const categoryMap = new Map();

    categoriesSnapshot.forEach((doc) => {
      const data = doc.data();
      categoryMap.set(doc.id, {
        name: data.name || "Khác",
        id: doc.id,
        icon: data.icon,
        color: data.color,
      });
    });

    defaultCategoriesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!categoryMap.has(doc.id)) {
        categoryMap.set(doc.id, {
          name: data.name || "Khác",
          id: doc.id,
          icon: data.icon,
          color: data.color,
        });
      }
    });

    return categoryMap;
  } catch (error) {
    console.error("Error getting category map:", error);
    return new Map();
  }
};

/**
 * Get income and expense summary
 */
export const getIncomeExpenseSummary = async (startDate, endDate, filters = {}) => {
  try {
    const transactions = await getTransactionsByDateRange(
      startDate,
      endDate,
      filters
    );

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    transactions.forEach((txn) => {
      const amount = parseFloat(txn.amount) || 0;
      if (txn.type === "INCOME") {
        totalIncome += amount;
        incomeCount++;
      } else if (txn.type === "EXPENSE") {
        totalExpense += amount;
        expenseCount++;
      }
    });

    const balance = totalIncome - totalExpense;
    const totalTransactions = transactions.length;

    return {
      totalIncome,
      totalExpense,
      balance,
      incomeCount,
      expenseCount,
      totalTransactions,
      averageIncome: incomeCount > 0 ? totalIncome / incomeCount : 0,
      averageExpense: expenseCount > 0 ? totalExpense / expenseCount : 0,
    };
  } catch (error) {
    console.error("Error getting income expense summary:", error);
    throw error;
  }
};

/**
 * Get category statistics
 */
export const getCategoryStatistics = async (
  startDate,
  endDate,
  type = "EXPENSE",
  filters = {}
) => {
  try {
    const transactions = await getTransactionsByDateRange(startDate, endDate, {
      ...filters,
      type,
    });

    const categoryMap = await getCategoryMap();
    const statsMap = new Map();
    let totalAmount = 0;

    transactions.forEach((txn) => {
      const categoryId = txn.categoryID || txn.categoryId;
      const amount = parseFloat(txn.amount) || 0;

      if (categoryId && amount > 0) {
        const categoryInfo = categoryMap.get(categoryId) || {
          name: "Khác",
          id: categoryId,
          icon: "❓",
          color: "#999999",
        };

        const current = statsMap.get(categoryId) || {
          amount: 0,
          count: 0,
          name: categoryInfo.name,
          icon: categoryInfo.icon,
          color: categoryInfo.color,
          id: categoryId,
        };

        statsMap.set(categoryId, {
          ...current,
          amount: current.amount + amount,
          count: current.count + 1,
        });

        totalAmount += amount;
      }
    });

    const stats = Array.from(statsMap.values())
      .map((stat) => ({
        ...stat,
        percentage: totalAmount > 0 ? (stat.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      stats,
      totalAmount,
    };
  } catch (error) {
    console.error("Error getting category statistics:", error);
    throw error;
  }
};

/**
 * Get daily statistics
 */
export const getDailyStatistics = async (startDate, endDate, filters = {}) => {
  try {
    const transactions = await getTransactionsByDateRange(
      startDate,
      endDate,
      filters
    );

    const dailyMap = new Map();

    transactions.forEach((txn) => {
      if (!txn.date) return; // Skip transactions without date
      
      let date;
      if (txn.date instanceof Date) {
        date = txn.date;
      } else if (typeof txn.date === "string") {
        date = new Date(txn.date);
      } else {
        date = new Date(txn.date);
      }

      if (isNaN(date.getTime())) return; // Skip invalid dates

      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
      const amount = parseFloat(txn.amount) || 0;

      const current = dailyMap.get(dateKey) || {
        date: date, // Store Date object for chart compatibility
        dateKey: dateKey, // Keep string key for reference
        income: 0,
        expense: 0,
        count: 0,
        balance: 0,
      };

      if (txn.type === "INCOME") {
        current.income += amount;
      } else if (txn.type === "EXPENSE") {
        current.expense += amount;
      }
      current.count++;
      current.balance = current.income - current.expense;

      dailyMap.set(dateKey, current);
    });

    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.dateKey);
      const dateB = b.date instanceof Date ? b.date : new Date(b.dateKey);
      return dateA.getTime() - dateB.getTime();
    });

    return dailyStats;
  } catch (error) {
    console.error("Error getting daily statistics:", error);
    throw error;
  }
};

/**
 * Get monthly statistics
 */
export const getMonthlyStatistics = async (year, filters = {}) => {
  try {
    const monthlyStats = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const summary = await getIncomeExpenseSummary(startDate, endDate, filters);

      monthlyStats.push({
        month,
        monthName: `Tháng ${month}`,
        ...summary,
      });
    }

    return monthlyStats;
  } catch (error) {
    console.error("Error getting monthly statistics:", error);
    throw error;
  }
};

/**
 * Get yearly statistics
 */
export const getYearlyStatistics = async (startYear, endYear, filters = {}) => {
  try {
    const yearlyStats = [];

    for (let year = startYear; year <= endYear; year++) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const summary = await getIncomeExpenseSummary(startDate, endDate, filters);

      yearlyStats.push({
        year,
        ...summary,
      });
    }

    return yearlyStats;
  } catch (error) {
    console.error("Error getting yearly statistics:", error);
    throw error;
  }
};

/**
 * Get comparison with previous period
 */
export const getPeriodComparison = async (
  currentStartDate,
  currentEndDate,
  previousStartDate,
  previousEndDate,
  filters = {}
) => {
  try {
    const [current, previous] = await Promise.all([
      getIncomeExpenseSummary(currentStartDate, currentEndDate, filters),
      getIncomeExpenseSummary(previousStartDate, previousEndDate, filters),
    ]);

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      current,
      previous,
      incomeGrowth: calculateGrowth(current.totalIncome, previous.totalIncome),
      expenseGrowth: calculateGrowth(
        current.totalExpense,
        previous.totalExpense
      ),
      balanceGrowth: calculateGrowth(current.balance, previous.balance),
      transactionGrowth: calculateGrowth(
        current.totalTransactions,
        previous.totalTransactions
      ),
    };
  } catch (error) {
    console.error("Error getting period comparison:", error);
    throw error;
  }
};

/**
 * Get top transactions
 */
export const getTopTransactions = async (
  startDate,
  endDate,
  type = "EXPENSE",
  limitCount = 10,
  filters = {}
) => {
  try {
    const transactions = await getTransactionsByDateRange(startDate, endDate, {
      ...filters,
      type,
    });

    const sortedTransactions = transactions
      .map((txn) => ({
        ...txn,
        amount: parseFloat(txn.amount) || 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limitCount);

    const categoryMap = await getCategoryMap();

    return sortedTransactions.map((txn) => {
      const categoryId = txn.categoryID || txn.categoryId;
      const category = categoryMap.get(categoryId);
      return {
        ...txn,
        categoryName: category?.name || "Khác",
        categoryIcon: category?.icon || "❓",
        categoryColor: category?.color || "#999999",
      };
    });
  } catch (error) {
    console.error("Error getting top transactions:", error);
    throw error;
  }
};

/**
 * Export transactions to CSV
 */
export const exportTransactionsToCSV = async (
  startDate,
  endDate,
  filters = {}
) => {
  try {
    const transactions = await getTransactionsByDateRange(
      startDate,
      endDate,
      filters
    );
    const categoryMap = await getCategoryMap();

    const csvHeaders = [
      "ID",
      "Ngày",
      "Loại",
      "Danh mục",
      "Số tiền",
      "Mô tả",
      "Người dùng",
    ];

    const csvRows = transactions.map((txn) => {
      const categoryId = txn.categoryID || txn.categoryId;
      const category = categoryMap.get(categoryId);
      const date = txn.date instanceof Date ? txn.date : new Date(txn.date);

      return [
        txn.id || "",
        date.toLocaleDateString("vi-VN"),
        txn.type === "INCOME" ? "Thu nhập" : "Chi tiêu",
        category?.name || "Khác",
        (txn.amount || 0).toLocaleString("vi-VN"),
        txn.description || txn.note || "",
        txn.userID || "",
      ];
    });

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions_${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error exporting transactions to CSV:", error);
    throw error;
  }
};

/**
 * Get user list for filter
 */
export const getUserList = async () => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getDocs(usersRef);
    const users = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        name: data.name || data.email || "N/A",
        email: data.email || "",
      });
    });

    return users;
  } catch (error) {
    console.error("Error getting user list:", error);
    return [];
  }
};

/**
 * Get category list for filter
 */
export const getCategoryList = async (type = null) => {
  try {
    const categoryMap = await getCategoryMap();
    const categories = Array.from(categoryMap.values());

    if (type) {
      // Filter by type if needed (would need to fetch from transactions or store type in category)
      return categories;
    }

    return categories;
  } catch (error) {
    console.error("Error getting category list:", error);
    return [];
  }
};

