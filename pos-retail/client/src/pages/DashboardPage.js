import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';
import { FiShoppingCart, FiDollarSign, FiPackage, FiUsers } from 'react-icons/fi';

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/reports/dashboard');
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-content">Loading...</div>;

  return (
    <>
      <div className="header">
        <h1>Tổng quan</h1>
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiShoppingCart style={{ color: '#1a73e8' }} />
              </div>
              <span className="stat-label">Đơn hôm nay</span>
            </div>
            <div className="stat-value text-primary">{dashboard?.today?.orders || 0}</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiDollarSign style={{ color: '#34a853' }} />
              </div>
              <span className="stat-label">Doanh thu hôm nay</span>
            </div>
            <div className="stat-value text-success">{formatMoney(dashboard?.today?.revenue || 0)}</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiPackage style={{ color: '#d97706' }} />
              </div>
              <span className="stat-label">Nguyên liệu sắp hết</span>
            </div>
            <div className="stat-value text-warning">{dashboard?.inventory?.lowStockProducts || 0}</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiUsers style={{ color: '#7c3aed' }} />
              </div>
              <span className="stat-label">Khách hàng</span>
            </div>
            <div className="stat-value">{dashboard?.totalCustomers || 0}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Doanh thu tháng</h3>
            <div className="stat-value text-success" style={{ fontSize: 28 }}>
              {formatMoney(dashboard?.month?.revenue || 0)}
            </div>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
              {dashboard?.month?.orders || 0} đơn hàng
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Menu</h3>
            <div className="stat-value text-primary" style={{ fontSize: 28 }}>
              {dashboard?.inventory?.totalProducts || 0}
            </div>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
              món trong menu
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
