const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Product, Category } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const { search, category_id, is_active, page = 1, limit = 50 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (category_id) where.category_id = category_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const offset = (page - 1) * limit;
    const { rows: products, count } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset
    });
    res.json({ products, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category }]
    });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    await product.update(req.body);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    await product.update({ is_active: false });
    res.json({ message: 'Đã ẩn sản phẩm' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        is_active: true,
        stock_quantity: { [Op.lte]: sequelize.col('min_stock') }
      },
      include: [{ model: Category, attributes: ['id', 'name'] }],
      order: [['stock_quantity', 'ASC']]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.searchByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({
      where: { barcode, is_active: true },
      include: [{ model: Category, attributes: ['id', 'name'] }]
    });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
