const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Order, OrderItem, Product, Customer, User, DebtTransaction } = require('../models');

const generateOrderCode = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `HD${dateStr}${timeStr}${rand}`;
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, customer_id, discount, discount_type, tax, payment_method, amount_paid, notes } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không tồn tại` });
      }
      if (product.stock_quantity < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock_quantity} trong kho`
        });
      }

      const itemTotal = item.quantity * parseFloat(product.sell_price) - (item.discount || 0);
      subtotal += itemTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.sell_price,
        discount: item.discount || 0,
        total: itemTotal
      });

      await product.update(
        { stock_quantity: product.stock_quantity - item.quantity },
        { transaction: t }
      );
    }

    let discountAmount = 0;
    if (discount) {
      discountAmount = discount_type === 'percent' ? subtotal * (discount / 100) : parseFloat(discount);
    }
    const taxAmount = tax ? subtotal * (parseFloat(tax) / 100) : 0;
    const total = subtotal - discountAmount + taxAmount;
    const paid = parseFloat(amount_paid) || 0;
    const changeAmount = paid > total ? paid - total : 0;

    const order = await Order.create({
      order_code: generateOrderCode(),
      customer_id: customer_id || null,
      user_id: req.user.id,
      subtotal,
      discount: discountAmount,
      discount_type: discount_type || 'amount',
      tax: taxAmount,
      total,
      amount_paid: paid,
      change_amount: changeAmount,
      payment_method: payment_method || 'cash',
      status: 'completed',
      notes,
      is_synced: false
    }, { transaction: t });

    for (const item of orderItems) {
      await OrderItem.create({ ...item, order_id: order.id }, { transaction: t });
    }

    if (payment_method === 'debt' && customer_id) {
      const customer = await Customer.findByPk(customer_id, { transaction: t });
      const debtAmount = total - paid;
      if (debtAmount > 0) {
        await customer.update(
          { total_debt: parseFloat(customer.total_debt) + debtAmount },
          { transaction: t }
        );
        await DebtTransaction.create({
          type: 'customer',
          reference_id: customer_id,
          amount: debtAmount,
          transaction_type: 'debt_increase',
          order_id: order.id,
          user_id: req.user.id,
          notes: `Công nợ từ đơn hàng ${order.order_code}`
        }, { transaction: t });
      }
    }

    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Customer },
        { model: User, as: 'seller', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json(fullOrder);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { search, status, payment_method, from_date, to_date, page = 1, limit = 20 } = req.query;
    const where = {};

    if (search) {
      where.order_code = { [Op.iLike]: `%${search}%` };
    }
    if (status) where.status = status;
    if (payment_method) where.payment_method = payment_method;
    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) where.createdAt[Op.gte] = new Date(from_date);
      if (to_date) where.createdAt[Op.lte] = new Date(to_date + 'T23:59:59');
    }

    const offset = (page - 1) * limit;
    const { rows: orders, count } = await Order.findAndCountAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'seller', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ orders, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
        { model: Customer },
        { model: User, as: 'seller', attributes: ['id', 'name'] }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.cancel = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    if (order.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ message: 'Đơn hàng đã bị hủy trước đó' });
    }

    for (const item of order.items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (product) {
        await product.update(
          { stock_quantity: product.stock_quantity + item.quantity },
          { transaction: t }
        );
      }
    }

    if (order.payment_method === 'debt' && order.customer_id) {
      const customer = await Customer.findByPk(order.customer_id, { transaction: t });
      const debtAmount = parseFloat(order.total) - parseFloat(order.amount_paid);
      if (debtAmount > 0 && customer) {
        await customer.update(
          { total_debt: Math.max(0, parseFloat(customer.total_debt) - debtAmount) },
          { transaction: t }
        );
      }
    }

    await order.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();
    res.json({ message: 'Đã hủy đơn hàng', order });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const orders = await Order.findAll({
      where: {
        createdAt: { [Op.between]: [startOfDay, endOfDay] },
        status: 'completed'
      }
    });

    const summary = {
      date: startOfDay.toISOString().slice(0, 10),
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + parseFloat(o.total), 0),
      total_cash: orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + parseFloat(o.amount_paid), 0),
      total_transfer: orders.filter(o => o.payment_method === 'transfer').reduce((sum, o) => sum + parseFloat(o.amount_paid), 0),
      total_debt: orders.filter(o => o.payment_method === 'debt').reduce((sum, o) => sum + parseFloat(o.total) - parseFloat(o.amount_paid), 0)
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
