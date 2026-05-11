const { Op } = require('sequelize');
const { Customer, Supplier, DebtTransaction } = require('../models');

exports.getCustomerDebts = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: { total_debt: { [Op.gt]: 0 }, is_active: true },
      order: [['total_debt', 'DESC']]
    });
    const totalDebt = customers.reduce((sum, c) => sum + parseFloat(c.total_debt), 0);
    res.json({ customers, totalDebt });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getSupplierDebts = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { total_debt: { [Op.gt]: 0 }, is_active: true },
      order: [['total_debt', 'DESC']]
    });
    const totalDebt = suppliers.reduce((sum, s) => sum + parseFloat(s.total_debt), 0);
    res.json({ suppliers, totalDebt });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { type, reference_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const where = {};
    if (type) where.type = type;
    if (reference_id) where.reference_id = reference_id;
    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) where.createdAt[Op.gte] = new Date(from_date);
      if (to_date) where.createdAt[Op.lte] = new Date(to_date + 'T23:59:59');
    }

    const offset = (page - 1) * limit;
    const { rows: transactions, count } = await DebtTransaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ transactions, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const customerDebt = await Customer.sum('total_debt', { where: { is_active: true } }) || 0;
    const supplierDebt = await Supplier.sum('total_debt', { where: { is_active: true } }) || 0;

    res.json({
      customer_total_debt: customerDebt,
      supplier_total_debt: supplierDebt,
      net_debt: customerDebt - supplierDebt
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
