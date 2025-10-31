// src/components/FamilyDataTable.jsx
import React, { useState, useEffect } from "react";
import csvDataService from "../services/csvDataService";
import "../styles/DataTable.css";

const FamilyDataTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    region: "",
    sex: "",
  });
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    loadData();
  }, [pagination.page, filters]);

  const loadRegions = async () => {
    const regionsList = await csvDataService.getUniqueRegions();
    setRegions(regionsList);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await csvDataService.getFamilyInfo(
        pagination.page,
        10,
        filters
      );

      setData(result.data);
      setPagination({
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      });
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      alert("Không thể tải dữ liệu. Vui lòng kiểm tra file CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset về trang 1
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      {/* Header */}
      <div className="table-header">
        <h2>📊 Thông tin Hộ Gia đình</h2>
        <div className="table-info">
          <span className="badge">Tổng số: {pagination.total} hộ</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Khu vực:</label>
          <select
            value={filters.region}
            onChange={(e) => handleFilterChange("region", e.target.value)}
          >
            <option value="">Tất cả</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Giới tính Chủ hộ:</label>
          <select
            value={filters.sex}
            onChange={(e) => handleFilterChange("sex", e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="Male">Nam</option>
            <option value="Female">Nữ</option>
          </select>
        </div>

        <button
          className="btn-reset"
          onClick={() => setFilters({ region: "", sex: "" })}
        >
          🔄 Reset
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Giới tính Chủ hộ</th>
              <th>Tuổi</th>
              <th>Tình trạng</th>
              <th>Nghề nghiệp</th>
              <th>Số thành viên</th>
              <th>Chi tiêu thực phẩm</th>
              <th>Chi tiêu giáo dục</th>
              <th>Khu vực</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  Không có dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index}>
                  <td>{(pagination.page - 1) * 10 + index + 1}</td>
                  <td>
                    <span
                      className={`badge-gender ${item["Household Head Sex"]}`}
                    >
                      {item["Household Head Sex"] === "Male"
                        ? "👨 Nam"
                        : "👩 Nữ"}
                    </span>
                  </td>
                  <td>{item["Household Head Age"]}</td>
                  <td>{item["Household Head Marital Status"]}</td>
                  <td className="occupation-cell">
                    {item["Household Head Occupation"]?.substring(0, 30)}...
                  </td>
                  <td className="text-center">
                    {item["Total Number of Family members"]}
                  </td>
                  <td className="currency">
                    {formatCurrency(item["Total Food Expenditure"])}
                  </td>
                  <td className="currency">
                    {formatCurrency(item["Education Expenditure"])}
                  </td>
                  <td>
                    <span className="badge-region">{item.Region}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => handlePageChange(1)}
          disabled={pagination.page === 1}
          className="btn-page"
        >
          ⏮️ Đầu
        </button>
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="btn-page"
        >
          ← Trước
        </button>

        <span className="page-info">
          Trang <strong>{pagination.page}</strong> / {pagination.totalPages}
        </span>

        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
          className="btn-page"
        >
          Sau →
        </button>
        <button
          onClick={() => handlePageChange(pagination.totalPages)}
          disabled={pagination.page === pagination.totalPages}
          className="btn-page"
        >
          Cuối ⏭️
        </button>
      </div>
    </div>
  );
};

function formatCurrency(value) {
  if (!value) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default FamilyDataTable;
