// services/dashboardService.js
import {
  collection,
  getDocs,
  query,
  where,
  getCountFromServer,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants/collections";

/**
 * Dashboard Service - Kết nối Firebase
 * Using collections: USER, TRANSACTION, CATEGORY
 */

// THỐNG KÊ TỔNG QUAN

export const getTotalUsers = async () => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getCountFromServer(usersRef);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error getting total users:", error);
    return 0;
  }
};

export const getNewUsersThisMonth = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(
      usersRef,
      where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
    );

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error getting new users:", error);
    return 0;
  }
};

export const getTransactionsThisMonth = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const txnRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(
      txnRef,
      where("date", ">=", Timestamp.fromDate(startOfMonth))
    );

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error getting transactions:", error);
    return 0;
  }
};

export const getTotalExpenseThisMonth = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const txnRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(
      txnRef,
      where("type", "==", "EXPENSE"),
      where("date", ">=", Timestamp.fromDate(startOfMonth))
    );

    const querySnapshot = await getDocs(q);
    let total = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      total += parseFloat(data.amount) || 0;
    });

    return total;
  } catch (error) {
    console.error("Error getting total expense:", error);
    return 0;
  }
};

export const getLockedAccounts = async () => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where("accountStatus", "==", "LOCKED"));

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error getting locked accounts:", error);
    return 0;
  }
};

// DỮ LIỆU BIỂU ĐỒ

export const getMonthlyTrends = async () => {
  try {
    const monthlyData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        1
      );

      const usersRef = collection(db, COLLECTIONS.USERS);
      const usersQuery = query(
        usersRef,
        where("createdAt", ">=", Timestamp.fromDate(monthDate)),
        where("createdAt", "<", Timestamp.fromDate(nextMonthDate))
      );

      let usersCount = 0;
      try {
        const usersSnapshot = await getCountFromServer(usersQuery);
        usersCount = usersSnapshot.data().count;
      } catch (err) {
        console.warn(`Cannot get users for month ${i}:`, err.message);
      }

      const txnRef = collection(db, COLLECTIONS.TRANSACTIONS);
      let txnQuery = query(
        txnRef,
        where("date", ">=", Timestamp.fromDate(monthDate)),
        where("date", "<", Timestamp.fromDate(nextMonthDate))
      );

      let txnCount = 0;
      try {
        const txnSnapshot = await getCountFromServer(txnQuery);
        txnCount = txnSnapshot.data().count;
      } catch (err) {
        console.warn(`Cannot get txn for month ${i}:`, err.message);
      }

      monthlyData.push({
        month: `T${monthDate.getMonth() + 1}`,
        users: usersCount,
        transactions: txnCount,
      });
    }

    return monthlyData;
  } catch (error) {
    console.error("Error getting monthly trends:", error);
    return [];
  }
};

export const getCategoryStats = async () => {
  try {
    console.log("getCategoryStats: Starting...");

    // Lấy tất cả categories để map categoryID -> name
    const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
    const categoriesSnapshot = await getDocs(categoriesRef);
    const categoryMap = new Map();

    categoriesSnapshot.forEach((doc) => {
      const data = doc.data();
      categoryMap.set(doc.id, {
        name: data.name || "Khác",
        id: doc.id,
      });
    });

    console.log(`Loaded ${categoryMap.size} categories`);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    console.log("Querying from:", startOfMonth.toISOString());

    const txnRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(
      txnRef,
      where("type", "==", "EXPENSE"),
      where("date", ">=", Timestamp.fromDate(startOfMonth))
    );

    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} expense transactions`);

    if (querySnapshot.empty) {
      console.warn("No expense transactions found");
      return [];
    }

    const statsMap = new Map();
    let totalAmount = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const categoryId = data.categoryID || data.categoryId;
      const amount = parseFloat(data.amount) || 0;

      if (categoryId && amount > 0) {
        const categoryInfo = categoryMap.get(categoryId) || {
          name: "Khác",
          id: categoryId,
        };
        const current = statsMap.get(categoryId) || {
          amount: 0,
          count: 0,
          name: categoryInfo.name,
        };

        statsMap.set(categoryId, {
          amount: current.amount + amount,
          count: current.count + 1,
          name: categoryInfo.name,
        });

        totalAmount += amount;
      }
    });

    console.log("Total expense amount:", totalAmount);
    console.log("Categories found:", statsMap.size);

    if (totalAmount === 0) {
      console.warn("Total amount is 0");
      return [];
    }

    const categoryStats = Array.from(statsMap.entries()).map(([id, data]) => {
      const percentage = Math.round((data.amount / totalAmount) * 100);
      return {
        id,
        name: data.name,
        value: percentage,
        amount: data.amount,
        count: data.count,
      };
    });

    console.log("Category stats before sort:", categoryStats);

    categoryStats.sort((a, b) => b.value - a.value);

    let finalStats = categoryStats;

    if (categoryStats.length > 5) {
      const top5 = categoryStats.slice(0, 5);
      const others = categoryStats.slice(5);
      const othersTotal = others.reduce((sum, cat) => sum + cat.value, 0);

      finalStats = [
        ...top5,
        {
          id: "others",
          name: "Khác",
          value: othersTotal,
          amount: others.reduce((sum, cat) => sum + cat.amount, 0),
          count: others.reduce((sum, cat) => sum + cat.count, 0),
        },
      ];
    }

    console.log("Final category stats:", finalStats);
    return finalStats;
  } catch (error) {
    console.error("Error getting category stats:", error);
    console.error("Error details:", error.message);
    return [];
  }
};

// DASHBOARD OVERVIEW

export const getDashboardData = async () => {
  try {
    console.log("Loading dashboard data from Firebase...");

    const [
      totalUsers,
      newUsers,
      transactionsCount,
      totalExpense,
      lockedAccounts,
      monthlyTrends,
      categoryStats,
    ] = await Promise.all([
      getTotalUsers(),
      getNewUsersThisMonth(),
      getTransactionsThisMonth(),
      getTotalExpenseThisMonth(),
      getLockedAccounts(),
      getMonthlyTrends(),
      getCategoryStats(),
    ]);

    const previousMonthUsers =
      monthlyTrends.length > 1
        ? monthlyTrends[monthlyTrends.length - 2].users
        : 0;

    const usersGrowth =
      previousMonthUsers > 0
        ? Math.round(
            ((newUsers - previousMonthUsers) / previousMonthUsers) * 100
          )
        : 0;

    const previousMonthTxn =
      monthlyTrends.length > 1
        ? monthlyTrends[monthlyTrends.length - 2].transactions
        : 0;

    const txnGrowth =
      previousMonthTxn > 0
        ? Math.round(
            ((transactionsCount - previousMonthTxn) / previousMonthTxn) * 100
          )
        : 0;

    const dashboardData = {
      stats: {
        totalUsers,
        newUsers,
        transactionsCount,
        totalExpense,
        lockedAccounts,
        usersGrowth,
        txnGrowth,
      },
      charts: {
        monthlyTrends,
        categoryStats,
      },
    };

    console.log("Dashboard data loaded successfully:", dashboardData);
    return dashboardData;
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    throw error;
  }
};

// REALTIME LISTENER

export const subscribeToDashboard = (callback) => {
  const txnRef = collection(db, COLLECTIONS.TRANSACTIONS);

  const unsubscribe = onSnapshot(
    txnRef,
    async () => {
      const dashboardData = await getDashboardData();
      callback(dashboardData);
    },
    (error) => {
      console.error("Error in dashboard subscription:", error);
    }
  );

  return unsubscribe;
};

// HELPER FUNCTIONS

export const formatCurrency = (amount) => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString("vi-VN");
};

export const formatCount = (count) => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const calculateGrowth = (current, previous) => {
  if (previous === 0) return "0%";
  const growth = Math.round(((current - previous) / previous) * 100);
  return `${growth > 0 ? "↑" : "↓"} ${Math.abs(growth)}%`;
};
