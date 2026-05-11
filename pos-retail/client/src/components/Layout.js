import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiShoppingCart, FiPackage, FiFileText, FiUsers, FiTruck, FiDatabase, FiDollarSign, FiBarChart2, FiLogOut } from 'react-icons/fi';

const navItems = [
  { path: '/', icon: FiHome, label: 'Tổng quan' },
  { path: '/pos', icon: FiShoppingCart, label: 'Bán hàng (POS)' },
  { path: '/products', icon: FiPackage, label: 'Menu' },
  { path: '/orders', icon: FiFileText, label: 'Đơn hàng' },
  { path: '/customers', icon: FiUsers, label: 'Khách hàng' },
  { path: '/suppliers', icon: FiTruck, label: 'Nhà cung cấp' },
  { path: '/inventory', icon: FiDatabase, label: 'Kho / Nguyên liệu' },
  { path: '/debts', icon: FiDollarSign, label: 'Công nợ' },
  { path: '/reports', icon: FiBarChart2, label: 'Báo cáo' },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Cafe POS</h2>
          <p>Quản lý quán cafe</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            {user?.name} ({user?.role})
          </div>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <FiLogOut />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
