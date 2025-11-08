/**
 * Default Categories Data
 * These categories are managed by admin and stored in CATEGORIES_DEFAULT collection
 */

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: "1", name: "Ăn uống", icon: "food-apple", color: "#FF6347", type: "EXPENSE", displayOrder: 0, isSystemDefault: true },
  { id: "2", name: "Quần áo", icon: "tshirt-crew", color: "#32CD32", type: "EXPENSE", displayOrder: 1, isSystemDefault: true },
  { id: "3", name: "Hoa quả", icon: "fruit-cherries", color: "#00CED1", type: "EXPENSE", displayOrder: 2, isSystemDefault: true },
  { id: "4", name: "Mua sắm", icon: "shopping", color: "#FF69B4", type: "EXPENSE", displayOrder: 3, isSystemDefault: true },
  { id: "5", name: "Giao thông", icon: "bus", color: "#ADFF2F", type: "EXPENSE", displayOrder: 4, isSystemDefault: true },
  { id: "6", name: "Nhà ở", icon: "home", color: "#FFA500", type: "EXPENSE", displayOrder: 5, isSystemDefault: true },
  { id: "7", name: "Du lịch", icon: "airplane", color: "#20B2AA", type: "EXPENSE", displayOrder: 6, isSystemDefault: true },
  { id: "8", name: "Rượu và đồ uống", icon: "glass-wine", color: "#BA55D3", type: "EXPENSE", displayOrder: 7, isSystemDefault: true },
  { id: "9", name: "Chi phí điện nước", icon: "water", color: "#4682B4", type: "EXPENSE", displayOrder: 8, isSystemDefault: true },
  { id: "10", name: "Quà", icon: "gift", color: "#FF4500", type: "EXPENSE", displayOrder: 9, isSystemDefault: true },
  { id: "11", name: "Giáo dục", icon: "school", color: "#FFD700", type: "EXPENSE", displayOrder: 10, isSystemDefault: true },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { id: "i1", name: "Lương", icon: "cash-multiple", color: "#4CAF50", type: "INCOME", displayOrder: 0, isSystemDefault: true },
  { id: "i2", name: "Thưởng", icon: "gift", color: "#FF9800", type: "INCOME", displayOrder: 1, isSystemDefault: true },
  { id: "i3", name: "Đầu tư", icon: "chart-line", color: "#2196F3", type: "INCOME", displayOrder: 2, isSystemDefault: true },
  { id: "i4", name: "Kinh doanh", icon: "store", color: "#9C27B0", type: "INCOME", displayOrder: 3, isSystemDefault: true },
  { id: "i5", name: "Freelance", icon: "laptop", color: "#00BCD4", type: "INCOME", displayOrder: 4, isSystemDefault: true },
  { id: "i6", name: "Cho thuê", icon: "home-city", color: "#795548", type: "INCOME", displayOrder: 5, isSystemDefault: true },
  { id: "i7", name: "Lãi suất", icon: "percent", color: "#607D8B", type: "INCOME", displayOrder: 6, isSystemDefault: true },
  { id: "i8", name: "Bán hàng", icon: "sale", color: "#E91E63", type: "INCOME", displayOrder: 7, isSystemDefault: true },
  { id: "i9", name: "Khác", icon: "dots-horizontal", color: "#9E9E9E", type: "INCOME", displayOrder: 8, isSystemDefault: true },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

