const { Order, OrderItem, Product, Customer, Supplier, StockImport, StockImportItem } = require('../models');
const { Op } = require('sequelize');

exports.getUnsyncedData = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { is_synced: false },
      include: [{ model: OrderItem, as: 'items' }]
    });

    res.json({
      unsynced_orders: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.markSynced = async (req, res) => {
  try {
    const { order_ids } = req.body;
    if (!order_ids || order_ids.length === 0) {
      return res.status(400).json({ message: 'Cần danh sách ID đơn hàng' });
    }

    await Order.update(
      { is_synced: true },
      { where: { id: { [Op.in]: order_ids } } }
    );

    res.json({ message: `Đã đánh dấu ${order_ids.length} đơn hàng đã sync` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.exportData = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = {};
    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) where.createdAt[Op.gte] = new Date(from_date);
      if (to_date) where.createdAt[Op.lte] = new Date(to_date + 'T23:59:59');
    }

    const orders = await Order.findAll({
      where: { ...where, status: 'completed' },
      include: [{ model: OrderItem, as: 'items' }]
    });

    const products = await Product.findAll({ where: { is_active: true } });
    const customers = await Customer.findAll({ where: { is_active: true } });
    const suppliers = await Supplier.findAll({ where: { is_active: true } });

    res.json({
      exported_at: new Date().toISOString(),
      data: { orders, products, customers, suppliers }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.importData = async (req, res) => {
  try {
    const { products, customers, suppliers } = req.body;
    let imported = { products: 0, customers: 0, suppliers: 0 };

    if (products && products.length > 0) {
      for (const p of products) {
        await Product.upsert(p);
        imported.products++;
      }
    }

    if (customers && customers.length > 0) {
      for (const c of customers) {
        await Customer.upsert(c);
        imported.customers++;
      }
    }

    if (suppliers && suppliers.length > 0) {
      for (const s of suppliers) {
        await Supplier.upsert(s);
        imported.suppliers++;
      }
    }

    res.json({ message: 'Import thành công', imported });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
