import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney, formatDate } from '../utils/format';
import toast from 'react-hot-toast';

const DebtsPage = () => {
  const [tab, setTab] = useState('customers');
  const [customerDebts, setCustomerDebts] = useState({ customers: [], totalDebt: 0 });
  const [supplierDebts, setSupplierDebts] = useState({ suppliers: [], totalDebt: 0 });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [cRes, sRes, tRes, sumRes] = await Promise.all([
        api.get('/debts/customers'),
        api.get('/debts/suppliers'),
        api.get('/debts/transactions', { params: { limit: 50 } }),
        api.get('/debts/summary')
      ]);
      setCustomerDebts(cRes.data);
      setSupplierDebts(sRes.data);
      setTransactions(tRes.data.transactions);
      setSummary(sumRes.data);
    } catch (error) { toast.error('Lỗi tải dữ liệu'); }
  };

  return (
    <>
      <div className="header"><h1>Công nợ</h1></div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Khách hàng nợ</div>
            <div className="stat-value text-success">{formatMoney(summary.customer_total_debt)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Nợ nhà cung cấp</div>
            <div className="stat-value text-danger">{formatMoney(summary.supplier_total_debt)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ròng (KH nợ - NCC nợ)</div>
            <div className="stat-value text-primary">{formatMoney(summary.net_debt)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn ${tab === 'customers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('customers')}>KH nợ</button>
          <button className={`btn ${tab === 'suppliers' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('suppliers')}>Nợ NCC</button>
          <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('history')}>Lịch sử</button>
        </div>

        {tab === 'customers' && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Khách hàng còn nợ (Tổng: {formatMoney(customerDebts.totalDebt)})</h3>
            <table>
              <thead><tr><th>Khách hàng</th><th>SĐT</th><th>Công nợ</th></tr></thead>
              <tbody>
                {customerDebts.customers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td style={{ fontWeight: 600, color: '#ea4335' }}>{formatMoney(c.total_debt)}</td>
                  </tr>
                ))}
                {customerDebts.customers.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>Không có công nợ</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'suppliers' && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Nợ nhà cung cấp (Tổng: {formatMoney(supplierDebts.totalDebt)})</h3>
            <table>
              <thead><tr><th>Nhà cung cấp</th><th>SĐT</th><th>Công nợ</th></tr></thead>
              <tbody>
                {supplierDebts.suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.phone}</td>
                    <td style={{ fontWeight: 600, color: '#ea4335' }}>{formatMoney(s.total_debt)}</td>
                  </tr>
                ))}
                {supplierDebts.suppliers.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>Không có công nợ</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'history' && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Lịch sử giao dịch công nợ</h3>
            <table>
              <thead><tr><th>Thời gian</th><th>Loại</th><th>Giao dịch</th><th>Số tiền</th><th>Ghi chú</th></tr></thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td>{formatDate(t.createdAt)}</td>
                    <td><span className={`badge ${t.type === 'customer' ? 'badge-info' : 'badge-warning'}`}>{t.type === 'customer' ? 'Khách hàng' : 'NCC'}</span></td>
                    <td><span className={`badge ${t.transaction_type === 'debt_payment' ? 'badge-success' : 'badge-danger'}`}>{t.transaction_type === 'debt_payment' ? 'Thanh toán' : 'Tăng nợ'}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(t.amount)}</td>
                    <td>{t.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default DebtsPage;
