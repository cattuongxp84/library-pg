const { Category, Product } = require('../models');
const { sequelize } = require('../config/db');
const { fn, col } = sequelize;

exports.getAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      attributes: {
        include: [[fn('COUNT', col('Products.id')), 'product_count']]
      },
      include: [{ model: Product, attributes: [] }],
      group: ['Category.id'],
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    await category.update(req.body);
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    await category.update({ is_active: false });
    res.json({ message: 'Đã ẩn danh mục' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
