import BaseService from "./BaseService";
import { COLLECTIONS } from "../constants/collections";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

class TransactionService extends BaseService {
  constructor() {
    super(COLLECTIONS.TRANSACTIONS);
  }

  /**
   * Get transactions by user
   */
  async getByUser(userId) {
    return this.queryWhere("userID", "==", userId);
  }

  /**
   * Get transactions by date range
   */
  async getByDateRange(startDate, endDate) {
    try {
      const colRef = this.getCollectionRef();
      const q = query(
        colRef,
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate)),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(q);
      const transactions = [];

      snapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...this._transformData(doc.data()),
        });
      });

      return transactions;
    } catch (error) {
      console.error("Error getting transactions by date:", error);
      throw error;
    }
  }

  /**
   * Get monthly summary
   */
  async getMonthlySummary(userId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const colRef = this.getCollectionRef();
      const q = query(
        colRef,
        where("userID", "==", userId),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate))
      );

      const snapshot = await getDocs(q);

      let totalIncome = 0;
      let totalExpense = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === "INCOME") {
          totalIncome += data.amount;
        } else {
          totalExpense += data.amount;
        }
      });

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        count: snapshot.size,
      };
    } catch (error) {
      console.error("Error getting monthly summary:", error);
      throw error;
    }
  }
}

export default new TransactionService();
