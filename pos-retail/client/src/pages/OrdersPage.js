import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney, formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import { FiEye, FiXCircle, FiPrinter } from 'react-icons/fi';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders', { params: { search, limit: 50 } });
      setOrders(data.orders);
    } catch (error) { toast.error('Lỗi tải đơn hàng'); }
  };

  const viewOrder = async (id) => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setSelectedOrder(data);
    } catch (error) { toast.error('Lỗi'); }
  };

  const cancelOrder = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) return;
    try {
      await api.put(`/orders/${id}/cancel`);
      toast.success('Đã hủy đơn hàng');
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) { toast.error(error.response?.data?.message || 'Lỗi'); }
  };

  const printInvoice = (id) => {
    window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5002/api'}/invoices/${id}/pdf`, '_blank');
  };

  const statusLabel = { completed: 'Hoàn thành', pending: 'Chờ', cancelled: 'Đã hủy' };
  const statusClass = { completed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger' };
  const paymentLabel = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', debt: 'Công nợ' };

  return (
    <>
      <div className="header"><h1>Đơn hàng</h1></div>
      <div className="page-content">
        <div className="search-bar">
          <input placeholder="Tìm mã đơn hàng..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchOrders()} />
          <button className="btn btn-primary" onClick={fetchOrders}>Tìm</button>
        </div>
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Mã HD</th><th>Thời gian</th><th>Khách hàng</th><th>Tổng</th><th>Thanh toán</th><th>Trạng thái</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>{o.order_code}</td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>{o.Customer?.name || 'Khách lẻ'}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(o.total)}</td>
                    <td>{paymentLabel[o.payment_method]}</td>
                    <td><span className={`badge ${statusClass[o.status]}`}>{statusLabel[o.status]}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => viewOrder(o.id)}><FiEye /></button>
                        <button className="btn btn-outline btn-sm" onClick={() => printInvoice(o.id)}><FiPrinter /></button>
                        {o.status === 'completed' && (
                          <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o.id)}><FiXCircle /></button>
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

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Đơn hàng {selectedOrder.order_code}</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', fontSize: 20 }}>&times;</button>
            </div>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#64748b' }}>
              <p>Thời gian: {formatDate(selectedOrder.createdAt)}</p>
              <p>Nhân viên: {selectedOrder.seller?.name}</p>
              <p>Khách hàng: {selectedOrder.Customer?.name || 'Khách lẻ'}</p>
            </div>
            <table>
              <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
              <tbody>
                {selectedOrder.items?.map(item => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unit_price)}</td>
                    <td>{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <p>Tạm tính: {formatMoney(selectedOrder.subtotal)}</p>
              {parseFloat(selectedOrder.discount) > 0 && <p>Giảm giá: -{formatMoney(selectedOrder.discount)}</p>}
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1a73e8' }}>Tổng: {formatMoney(selectedOrder.total)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrdersPage;
