import React from 'react'

const LogsPage = () => {
  const syncLogs = [
    { id: 1, user: 'Nguyễn Văn A', device: 'iPhone 13', time: '05/10/2025 14:30:15', status: 'success', records: 23 },
    { id: 2, user: 'Trần Thị B', device: 'Samsung S23', time: '05/10/2025 12:15:42', status: 'success', records: 15 },
    { id: 3, user: 'Phạm Thị D', device: 'iPad Pro', time: '05/10/2025 13:45:20', status: 'success', records: 8 },
    { id: 4, user: 'Lê Văn C', device: 'Xiaomi 12', time: '01/10/2025 09:20:11', status: 'failed', records: 0 },
    { id: 5, user: 'Hoàng Văn E', device: 'iPhone 14', time: '05/10/2025 11:22:33', status: 'success', records: 12 },
    { id: 6, user: 'Đỗ Thị F', device: 'Samsung A54', time: '05/10/2025 10:15:28', status: 'success', records: 19 },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Log đồng bộ dữ liệu</h2>
      
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Người dùng</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Thiết bị</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Thời gian</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Số bản ghi</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {syncLogs.map((log) => (
              <tr key={log.id} className="hover:bg-teal-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-800">{log.user}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.device}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.time}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{log.records} bản ghi</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    log.status === 'success' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Tổng số lần đồng bộ hôm nay</p>
          <p className="text-2xl font-bold text-blue-600">247</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Thành công</p>
          <p className="text-2xl font-bold text-green-600">243</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Thất bại</p>
          <p className="text-2xl font-bold text-red-600">4</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Tỷ lệ thành công</p>
          <p className="text-2xl font-bold text-teal-600">98.4%</p>
        </div>
      </div>
    </div>
  )
}

export default LogsPage