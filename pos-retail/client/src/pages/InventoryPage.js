import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney, formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import { FiPlus, FiEye } from 'react-icons/fi';

const InventoryPage = () => {
  const [imports, setImports] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [tab, setTab] = useState('inventory');
  const [showModal, setShowModal] = useState(false);
  const [importItems, setImportItems] = useState([{ product_id: '', quantity: '', unit_price: '' }]);
  const [importForm, setImportForm] = useState({ supplier_id: '', payment_method: 'cash', amount_paid: '', notes: '' });

  useEffect(() => {
    fetchInventory();
    fetchImports();
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/stock/inventory');
      setProducts(data.products);
    } catch (error) { console.error(error); }
  };

  const fetchImports = async () => {
    try {
      const { data } = await api.get('/stock/imports');
      setImports(data.imports);
    } catch (error) { console.error(error); }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products', { params: { limit: 200 } });
      setProducts(data.products);
    } catch (error) { console.error(error); }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers', { params: { limit: 100 } });
      setSuppliers(data.suppliers);
    } catch (error) { console.error(error); }
  };

  const addImportItem = () => {
    setImportItems([...importItems, { product_id: '', quantity: '', unit_price: '' }]);
  };

  const removeImportItem = (index) => {
    setImportItems(importItems.filter((_, i) => i !== index));
  };

  const updateImportItem = (index, field, value) => {
    setImportItems(importItems.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleCreateImport = async (e) => {
    e.preventDefault();
    try {
      const items = importItems.filter(i => i.product_id && i.quantity && i.unit_price);
      if (items.length === 0) { toast.error('Thêm ít nhất 1 sản phẩm'); return; }
      const total = items.reduce((sum, i) => sum + (parseInt(i.quantity) * parseFloat(i.unit_price)), 0);
      await api.post('/stock/imports', {
        ...importForm,
        items: items.map(i => ({ product_id: parseInt(i.product_id), quantity: parseInt(i.quantity), unit_price: parseFloat(i.unit_price) })),
        amount_paid: importForm.amount_paid || total
      });
      toast.success('Tạo phiếu nhập kho thành công');
      setShowModal(false);
      setImportItems([{ product_id: '', quantity: '', unit_price: '' }]);
      fetchImports();
      fetchInventory();
    } catch (error) { toast.error(error.response?.data?.message || 'Lỗi'); }
  };

  return (
    <>
      <div className="header">
        <h1>Kho / Nguyên liệu</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Nhập kho</button>
      </div>
      <div className="page-content">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn ${tab === 'inventory' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('inventory')}>Tồn kho</button>
          <button className={`btn ${tab === 'imports' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('imports')}>Phiếu nhập</button>
        </div>

        {tab === 'inventory' && (
          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Tồn kho</th><th>Tối thiểu</th><th>Giá vốn</th><th>Giá trị tồn</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td>{p.sku}</td>
                      <td><span className={`badge ${p.stock_quantity <= p.min_stock ? 'badge-danger' : 'badge-success'}`}>{p.stock_quantity} {p.unit}</span></td>
                      <td>{p.min_stock}</td>
                      <td>{formatMoney(p.cost_price)}</td>
                      <td>{formatMoney(parseFloat(p.cost_price) * p.stock_quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'imports' && (
          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>Mã phiếu</th><th>Thời gian</th><th>NCC</th><th>Tổng</th><th>Đã trả</th><th>NV</th></tr></thead>
                <tbody>
                  {imports.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 500 }}>{i.import_code}</td>
                      <td>{formatDate(i.createdAt)}</td>
                      <td>{i.Supplier?.name || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(i.total)}</td>
                      <td>{formatMoney(i.amount_paid)}</td>
                      <td>{i.importer?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>Nhập kho</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', fontSize: 20 }}>&times;</button>
            </div>
            <form onSubmit={handleCreateImport}>
              <div className="form-group">
                <label>Nhà cung cấp</label>
                <select className="form-control" value={importForm.supplier_id} onChange={(e) => setImportForm({...importForm, supplier_id: e.target.value})}>
                  <option value="">Chọn NCC</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 500, fontSize: 13 }}>Sản phẩm nhập</label>
                {importItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginTop: 8 }}>
                    <select className="form-control" value={item.product_id} onChange={(e) => updateImportItem(idx, 'product_id', e.target.value)}>
                      <option value="">Chọn SP</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" className="form-control" placeholder="SL" value={item.quantity} onChange={(e) => updateImportItem(idx, 'quantity', e.target.value)} />
                    <input type="number" className="form-control" placeholder="Giá nhập" value={item.unit_price} onChange={(e) => updateImportItem(idx, 'unit_price', e.target.value)} />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeImportItem(idx)}>X</button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={addImportItem}><FiPlus /> Thêm SP</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Thanh toán</label>
                  <select className="form-control" value={importForm.payment_method} onChange={(e) => setImportForm({...importForm, payment_method: e.target.value})}>
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản</option>
                    <option value="debt">Công nợ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Đã trả</label>
                  <input type="number" className="form-control" value={importForm.amount_paid} onChange={(e) => setImportForm({...importForm, amount_paid: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Tạo phiếu nhập</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryPage;
