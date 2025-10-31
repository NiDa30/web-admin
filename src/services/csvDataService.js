// src/services/csvDataService.js
import Papa from "papaparse";

class CSVDataService {
  constructor() {
    this.cache = {};
  }

  /**
   * Đọc file CSV từ public folder
   */
  async loadCSV(fileName) {
    // Kiểm tra cache
    if (this.cache[fileName]) {
      return this.cache[fileName];
    }

    try {
      const response = await fetch(`/data/${fileName}.csv`);
      const csvText = await response.text();

      const result = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      // Lưu vào cache
      this.cache[fileName] = result.data;
      return result.data;
    } catch (error) {
      console.error(`Lỗi khi đọc file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Lấy dữ liệu Family Info với phân trang
   */
  async getFamilyInfo(page = 1, limit = 10, filters = {}) {
    const data = await this.loadCSV("family_info");

    // Áp dụng filters
    let filteredData = data;

    if (filters.region) {
      filteredData = filteredData.filter(
        (item) => item.Region === filters.region
      );
    }

    if (filters.sex) {
      filteredData = filteredData.filter(
        (item) => item["Household Head Sex"] === filters.sex
      );
    }

    // Phân trang
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      data: filteredData.slice(startIndex, endIndex),
      total: filteredData.length,
      page,
      totalPages: Math.ceil(filteredData.length / limit),
    };
  }

  /**
   * Lấy thống kê chi tiêu
   */
  async getExpensesStatistics() {
    const expenses = await this.loadCSV("household_expenses");

    const stats = {
      totalHouseholds: expenses.length,
      averageFoodExpenditure: this.calculateAverage(
        expenses,
        "Total Food Expenditure"
      ),
      averageEducationExpenditure: this.calculateAverage(
        expenses,
        "Education Expenditure"
      ),
      averageTransportation: this.calculateAverage(
        expenses,
        "Transportation Expenditure"
      ),
      averageMedical: this.calculateAverage(
        expenses,
        "Medical Care Expenditure"
      ),
      expensesByCategory: {
        food: this.sumField(expenses, "Total Food Expenditure"),
        education: this.sumField(expenses, "Education Expenditure"),
        medical: this.sumField(expenses, "Medical Care Expenditure"),
        transportation: this.sumField(expenses, "Transportation Expenditure"),
        communication: this.sumField(expenses, "Communication Expenditure"),
        housing: this.sumField(expenses, "Housing and water Expenditure"),
      },
    };

    return stats;
  }

  /**
   * Lấy danh sách regions duy nhất
   */
  async getUniqueRegions() {
    const data = await this.loadCSV("family_info");
    const regions = [...new Set(data.map((item) => item.Region))];
    return regions.filter(Boolean).sort();
  }

  // Helper functions
  calculateAverage(data, field) {
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
    return sum / data.length;
  }

  sumField(data, field) {
    return data.reduce((acc, item) => acc + (item[field] || 0), 0);
  }
}

export default new CSVDataService();
