import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/format';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiSearch } from 'react-icons/fi';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', category_id: '', cost_price: '', sell_price: '', stock_quantity: '', min_stock: '5', unit: 'cái', description: '' });

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const fetchProducts = async (s = '') => {
    try {
      const { data } = await api.get('/products', { params: { search: s, limit: 100 } });
      setProducts(data.products);
    } catch (error) { toast.error('Lỗi tải sản phẩm'); }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (error) { console.error(error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, form);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await api.post('/products', form);
        toast.success('Thêm sản phẩm thành công');
      }
      setShowModal(false);
      setEditProduct(null);
      setForm({ name: '', sku: '', barcode: '', category_id: '', cost_price: '', sell_price: '', stock_quantity: '', min_stock: '5', unit: 'cái', description: '' });
      fetchProducts(search);
    } catch (error) { toast.error(error.response?.data?.message || 'Lỗi'); }
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name, sku: product.sku || '', barcode: product.barcode || '',
      category_id: product.category_id || '', cost_price: product.cost_price,
      sell_price: product.sell_price, stock_quantity: product.stock_quantity,
      min_stock: product.min_stock, unit: product.unit, description: product.description || ''
    });
    setShowModal(true);
  };

  return (
    <>
      <div className="header">
        <h1>Sản phẩm</h1>
        <button className="btn btn-primary" onClick={() => { setEditProduct(null); setForm({ name: '', sku: '', barcode: '', category_id: '', cost_price: '', sell_price: '', stock_quantity: '', min_stock: '5', unit: 'cái', description: '' }); setShowModal(true); }}>
          <FiPlus /> Thêm sản phẩm
        </button>
      </div>
      <div className="page-content">
        <div className="search-bar">
          <FiSearch style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input placeholder="Tìm sản phẩm..." value={search} onChange={(e) => { setSearch(e.target.value); fetchProducts(e.target.value); }} />
        </div>
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tên</th><th>SKU</th><th>Danh mục</th><th>Giá vốn</th><th>Giá bán</th><th>Tồn kho</th><th>Đơn vị</th><th></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>{p.Category?.name || '-'}</td>
                    <td>{formatMoney(p.cost_price)}</td>
                    <td style={{ fontWeight: 600, color: '#1a73e8' }}>{formatMoney(p.sell_price)}</td>
                    <td>
                      <span className={`badge ${p.stock_quantity <= p.min_stock ? 'badge-danger' : 'badge-success'}`}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td>{p.unit}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}><FiEdit2 /></button></td>
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
              <h3>{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', fontSize: 20 }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên sản phẩm *</label>
                <input className="form-control" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>SKU</label>
                  <input className="form-control" value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Barcode</label>
                  <input className="form-control" value={form.barcode} onChange={(e) => setForm({...form, barcode: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Danh mục</label>
                <select className="form-control" value={form.category_id} onChange={(e) => setForm({...form, category_id: e.target.value})}>
                  <option value="">Chọn danh mục</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Giá vốn</label>
                  <input type="number" className="form-control" value={form.cost_price} onChange={(e) => setForm({...form, cost_price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Giá bán *</label>
                  <input type="number" className="form-control" value={form.sell_price} onChange={(e) => setForm({...form, sell_price: e.target.value})} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Tồn kho</label>
                  <input type="number" className="form-control" value={form.stock_quantity} onChange={(e) => setForm({...form, stock_quantity: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Tồn tối thiểu</label>
                  <input type="number" className="form-control" value={form.min_stock} onChange={(e) => setForm({...form, min_stock: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Đơn vị</label>
                  <input className="form-control" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editProduct ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductsPage;
