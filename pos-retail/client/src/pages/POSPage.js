import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';
import toast from 'react-hot-toast';
import { FiSearch, FiMinus, FiPlus, FiTrash2, FiPrinter } from 'react-icons/fi';

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async (searchTerm = '') => {
    try {
      const { data } = await api.get('/products', { params: { search: searchTerm, is_active: 'true', limit: 100 } });
      setProducts(data.products);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/customers', { params: { limit: 100 } });
      setCustomers(data.customers);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchProducts(e.target.value);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        toast.error('Hết hàng trong kho!');
        return;
      }
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.stock_quantity <= 0) {
        toast.error('Hết hàng trong kho!');
        return;
      }
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        unit_price: parseFloat(product.sell_price),
        quantity: 1,
        max_stock: product.stock_quantity,
        discount: 0
      }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.max_stock) {
          toast.error('Vượt quá tồn kho!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity - item.discount), 0);
  const discountAmount = discount ? parseFloat(discount) : 0;
  const total = subtotal - discountAmount;
  const changeAmount = amountPaid ? Math.max(0, parseFloat(amountPaid) - total) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống!');
      return;
    }
    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          discount: item.discount
        })),
        customer_id: selectedCustomer || null,
        discount: discountAmount,
        discount_type: 'amount',
        payment_method: paymentMethod,
        amount_paid: parseFloat(amountPaid) || total,
        notes: ''
      };

      const { data } = await api.post('/orders', orderData);
      toast.success(`Tạo đơn hàng ${data.order_code} thành công!`);

      // Reset
      setCart([]);
      setDiscount('');
      setAmountPaid('');
      setSelectedCustomer('');
      setPaymentMethod('cash');
      setShowPayment(false);
      fetchProducts(search);

      // Print option
      if (window.confirm('Bạn có muốn in hóa đơn?')) {
        window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5002/api'}/invoices/${data.id}/pdf`, '_blank');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi tạo đơn hàng');
    }
  };

  return (
    <>
      <div className="header">
        <h1>Order (POS)</h1>
      </div>
      <div className="page-content">
        <div className="pos-layout">
          <div className="pos-products">
            <div className="search-bar">
              <input
                ref={searchRef}
                type="text"
                placeholder="Tìm món theo tên, mã..."
                value={search}
                onChange={handleSearch}
                autoFocus
              />
            </div>
            <div className="product-grid">
              {products.map(product => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => addToCart(product)}
                >
                  <div className="product-name">{product.name}</div>
                  <div className="product-price">{formatMoney(product.sell_price)}</div>
                  <div className="product-stock">Kho: {product.stock_quantity} {product.unit}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pos-cart">
            <div className="pos-cart-header">
              Giỏ hàng ({cart.length} sản phẩm)
            </div>
            <div className="pos-cart-items">
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                  Chưa có sản phẩm nào
                </div>
              )}
              {cart.map(item => (
                <div key={item.product_id} className="pos-cart-item">
                  <div className="item-info">
                    <div className="item-name">{item.product_name}</div>
                    <div className="item-price">{formatMoney(item.unit_price)}</div>
                  </div>
                  <div className="item-qty">
                    <button onClick={() => updateQuantity(item.product_id, -1)}><FiMinus size={12} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)}><FiPlus size={12} /></button>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, minWidth: 70, textAlign: 'right' }}>
                    {formatMoney(item.unit_price * item.quantity)}
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} style={{ color: '#ef4444', background: 'none' }}>
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pos-cart-footer">
              {!showPayment ? (
                <>
                  <div className="total-row">
                    <span>Tạm tính:</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  <div className="total-row grand-total">
                    <span>Tổng:</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => setShowPayment(true)}
                    disabled={cart.length === 0}
                  >
                    Thanh toán
                  </button>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Khách hàng</label>
                    <select className="form-control" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                      <option value="">Khách lẻ</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hình thức thanh toán</label>
                    <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="cash">Tiền mặt</option>
                      <option value="transfer">Chuyển khoản</option>
                      <option value="card">Thẻ</option>
                      <option value="debt">Công nợ</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Giảm giá (VNĐ)</label>
                    <input type="number" className="form-control" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Khách đưa</label>
                    <input type="number" className="form-control" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={total.toString()} />
                  </div>
                  <div className="total-row grand-total">
                    <span>Tổng:</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                  {changeAmount > 0 && (
                    <div className="total-row" style={{ color: '#34a853' }}>
                      <span>Tiền thừa:</span>
                      <span>{formatMoney(changeAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPayment(false)}>Quay lại</button>
                    <button className="btn btn-success" style={{ flex: 2 }} onClick={handleCheckout}>
                      <FiPrinter /> Hoàn tất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default POSPage;
