const { Op } = require('sequelize');
const { Supplier, StockImport, DebtTransaction } = require('../models');

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
    const { rows: suppliers, count } = await Supplier.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset
    });
    res.json({ suppliers, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    const imports = await StockImport.findAll({
      where: { supplier_id: supplier.id },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    const debtHistory = await DebtTransaction.findAll({
      where: { type: 'supplier', reference_id: supplier.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    res.json({ supplier, imports, debtHistory });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    await supplier.update(req.body);
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    await supplier.update({ is_active: false });
    res.json({ message: 'Đã ẩn nhà cung cấp' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.payDebt = async (req, res) => {
  try {
    const { amount, payment_method, notes } = req.body;
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
    if (parseFloat(amount) > parseFloat(supplier.total_debt)) {
      return res.status(400).json({ message: 'Số tiền thanh toán vượt quá công nợ' });
    }
    await supplier.update({ total_debt: parseFloat(supplier.total_debt) - parseFloat(amount) });
    await DebtTransaction.create({
      type: 'supplier',
      reference_id: supplier.id,
      amount: parseFloat(amount),
      transaction_type: 'debt_payment',
      payment_method: payment_method || 'cash',
      user_id: req.user.id,
      notes: notes || 'Thanh toán công nợ nhà cung cấp'
    });
    res.json({ message: 'Thanh toán công nợ thành công', supplier });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
