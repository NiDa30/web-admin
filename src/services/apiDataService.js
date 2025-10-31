// src/services/apiDataService.js
import { API_BASE_URL } from "../firebase";

class APIDataService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.cache = {};
  }

  /**
   * Fetch data từ API
   */
  async fetchAPI(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Lấy dữ liệu Family Info với phân trang
   */
  async getFamilyInfo(page = 1, limit = 10, filters = {}) {
    try {
      // Build query parameters
      let queryParams = `page=${page}&limit=${limit}`;

      if (filters.region) {
        queryParams += `&region=${encodeURIComponent(filters.region)}`;
      }

      if (filters.sex) {
        queryParams += `&sex=${encodeURIComponent(filters.sex)}`;
      }

      const result = await this.fetchAPI(`/api/family-info?${queryParams}`);

      return {
        data: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.totalPages,
      };
    } catch (error) {
      console.error("Error fetching Family Info:", error);
      throw error;
    }
  }

  /**
   * Lấy thống kê chi tiêu
   */
  async getExpensesStatistics() {
    try {
      // Kiểm tra cache
      if (this.cache.expensesStats) {
        return this.cache.expensesStats;
      }

      const result = await this.fetchAPI("/api/expenses/stats");

      // Tính thêm expensesByCategory từ data
      const stats = {
        ...result.data,
        expensesByCategory: {
          food:
            result.data.averageFoodExpenditure * result.data.totalHouseholds,
          education:
            result.data.averageEducationExpenditure *
            result.data.totalHouseholds,
          medical: result.data.averageMedical * result.data.totalHouseholds,
          transportation:
            result.data.averageTransportation * result.data.totalHouseholds,
          communication: 0, // Cần thêm vào API
          housing: 0, // Cần thêm vào API
        },
      };

      // Lưu cache
      this.cache.expensesStats = stats;
      return stats;
    } catch (error) {
      console.error("Error fetching expenses statistics:", error);
      throw error;
    }
  }

  /**
   * Lấy danh sách regions duy nhất
   */
  async getUniqueRegions() {
    try {
      // Tạm thời lấy từ family info
      const result = await this.fetchAPI("/api/family-info?limit=1000");
      const regions = [...new Set(result.data.map((item) => item.Region))];
      return regions.filter(Boolean).sort();
    } catch (error) {
      console.error("Error fetching unique regions:", error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {};
  }

  /**
   * Health check API
   */
  async healthCheck() {
    try {
      const result = await this.fetchAPI("/");
      return result;
    } catch (error) {
      console.error("API health check failed:", error);
      return { status: "error", message: error.message };
    }
  }
}

export default new APIDataService();
