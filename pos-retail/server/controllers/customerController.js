const { Op } = require('sequelize');
const { Customer, Order, DebtTransaction } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = { is_active: true };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    const offset = (page - 1) * limit;
    const { rows: customers, count } = await Customer.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset
    });
    res.json({ customers, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    const orders = await Order.findAll({
      where: { customer_id: customer.id },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    const debtHistory = await DebtTransaction.findAll({
      where: { type: 'customer', reference_id: customer.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    res.json({ customer, orders, debtHistory });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    await customer.update(req.body);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    await customer.update({ is_active: false });
    res.json({ message: 'Đã ẩn khách hàng' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.payDebt = async (req, res) => {
  try {
    const { amount, payment_method, notes } = req.body;
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    if (parseFloat(amount) > parseFloat(customer.total_debt)) {
      return res.status(400).json({ message: 'Số tiền thanh toán vượt quá công nợ' });
    }
    await customer.update({ total_debt: parseFloat(customer.total_debt) - parseFloat(amount) });
    await DebtTransaction.create({
      type: 'customer',
      reference_id: customer.id,
      amount: parseFloat(amount),
      transaction_type: 'debt_payment',
      payment_method: payment_method || 'cash',
      user_id: req.user.id,
      notes: notes || 'Thanh toán công nợ'
    });
    res.json({ message: 'Thanh toán công nợ thành công', customer });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
