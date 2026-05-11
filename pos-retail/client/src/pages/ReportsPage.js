import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';
import toast from 'react-hot-toast';

const ReportsPage = () => {
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const [revRes, topRes] = await Promise.all([
        api.get('/reports/revenue', { params: { from_date: fromDate, to_date: toDate, group_by: 'day' } }),
        api.get('/reports/top-products', { params: { from_date: fromDate, to_date: toDate, limit: 10 } })
      ]);
      setRevenue(revRes.data);
      setTopProducts(topRes.data);
    } catch (error) { toast.error('Lỗi tải báo cáo'); }
  };

  const totalRevenue = revenue.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0);
  const totalOrders = revenue.reduce((sum, r) => sum + parseInt(r.order_count || 0), 0);

  return (
    <>
      <div className="header"><h1>Báo cáo</h1></div>
      <div className="page-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Từ ngày</label>
              <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Đến ngày</label>
              <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={fetchReports}>Xem báo cáo</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Tổng doanh thu</div>
            <div className="stat-value text-success">{formatMoney(totalRevenue)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tổng đơn hàng</div>
            <div className="stat-value text-primary">{totalOrders}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Trung bình/đơn</div>
            <div className="stat-value">{formatMoney(totalOrders > 0 ? totalRevenue / totalOrders : 0)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Doanh thu theo ngày</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>Ngày</th><th>Đơn</th><th>Doanh thu</th></tr></thead>
                <tbody>
                  {revenue.map((r, i) => (
                    <tr key={i}>
                      <td>{r.period}</td>
                      <td>{r.order_count}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(r.total_revenue)}</td>
                    </tr>
                  ))}
                  {revenue.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Top sản phẩm bán chạy</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>Sản phẩm</th><th>SL bán</th><th>Doanh thu</th></tr></thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{p.product_name}</td>
                      <td>{p.total_sold}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(p.total_revenue)}</td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
