import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiDollarSign } from 'react-icons/fi';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [payCustomer, setPayCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/customers', { params: { search, limit: 100 } });
      setCustomers(data.customers);
    } catch (error) { toast.error('Lỗi'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCustomer) {
        await api.put(`/customers/${editCustomer.id}`, form);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/customers', form);
        toast.success('Thêm khách hàng thành công');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (error) { toast.error('Lỗi'); }
  };

  const handlePayDebt = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${payCustomer.id}/pay-debt`, { amount: parseFloat(payAmount), payment_method: 'cash' });
      toast.success('Thanh toán công nợ thành công');
      setShowPayModal(false);
      setPayAmount('');
      fetchCustomers();
    } catch (error) { toast.error(error.response?.data?.message || 'Lỗi'); }
  };

  return (
    <>
      <div className="header">
        <h1>Khách hàng</h1>
        <button className="btn btn-primary" onClick={() => { setEditCustomer(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setShowModal(true); }}>
          <FiPlus /> Thêm
        </button>
      </div>
      <div className="page-content">
        <div className="search-bar">
          <input placeholder="Tìm khách hàng..." value={search} onChange={(e) => { setSearch(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()} />
          <button className="btn btn-primary" onClick={fetchCustomers}>Tìm</button>
        </div>
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Tên</th><th>SĐT</th><th>Địa chỉ</th><th>Công nợ</th><th></th></tr></thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.address}</td>
                    <td style={{ fontWeight: 600, color: parseFloat(c.total_debt) > 0 ? '#ea4335' : '#34a853' }}>
                      {formatMoney(c.total_debt)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditCustomer(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setShowModal(true); }}><FiEdit2 /></button>
                        {parseFloat(c.total_debt) > 0 && (
                          <button className="btn btn-success btn-sm" onClick={() => { setPayCustomer(c); setShowPayModal(true); }}><FiDollarSign /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', fontSize: 20 }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label>Tên *</label><input className="form-control" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>SĐT</label><input className="form-control" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
              <div className="form-group"><label>Email</label><input className="form-control" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
              <div className="form-group"><label>Địa chỉ</label><input className="form-control" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{editCustomer ? 'Cập nhật' : 'Thêm'}</button>
            </form>
          </div>
        </div>
      )}

      {showPayModal && payCustomer && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thu công nợ - {payCustomer.name}</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', fontSize: 20 }}>&times;</button>
            </div>
            <p style={{ marginBottom: 16 }}>Công nợ hiện tại: <strong style={{ color: '#ea4335' }}>{formatMoney(payCustomer.total_debt)}</strong></p>
            <form onSubmit={handlePayDebt}>
              <div className="form-group"><label>Số tiền thanh toán</label><input type="number" className="form-control" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required max={payCustomer.total_debt} /></div>
              <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Xác nhận thanh toán</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomersPage;
