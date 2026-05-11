const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { StockImport, StockImportItem, Product, Supplier, User, DebtTransaction } = require('../models');

const generateImportCode = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `NK${dateStr}${rand}`;
};

exports.createImport = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, supplier_id, payment_method, amount_paid, notes } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Phiếu nhập phải có ít nhất 1 sản phẩm' });
    }

    let total = 0;
    const importItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không tồn tại` });
      }

      const itemTotal = item.quantity * parseFloat(item.unit_price);
      total += itemTotal;

      importItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: itemTotal
      });

      await product.update(
        {
          stock_quantity: product.stock_quantity + item.quantity,
          cost_price: item.unit_price
        },
        { transaction: t }
      );
    }

    const paid = parseFloat(amount_paid) || 0;

    const stockImport = await StockImport.create({
      import_code: generateImportCode(),
      supplier_id: supplier_id || null,
      user_id: req.user.id,
      total,
      amount_paid: paid,
      payment_method: payment_method || 'cash',
      notes,
      status: 'completed'
    }, { transaction: t });

    for (const item of importItems) {
      await StockImportItem.create(
        { ...item, stock_import_id: stockImport.id },
        { transaction: t }
      );
    }

    if (payment_method === 'debt' && supplier_id) {
      const supplier = await Supplier.findByPk(supplier_id, { transaction: t });
      const debtAmount = total - paid;
      if (debtAmount > 0 && supplier) {
        await supplier.update(
          { total_debt: parseFloat(supplier.total_debt) + debtAmount },
          { transaction: t }
        );
        await DebtTransaction.create({
          type: 'supplier',
          reference_id: supplier_id,
          amount: debtAmount,
          transaction_type: 'debt_increase',
          stock_import_id: stockImport.id,
          user_id: req.user.id,
          notes: `Công nợ từ phiếu nhập ${stockImport.import_code}`
        }, { transaction: t });
      }
    }

    await t.commit();

    const fullImport = await StockImport.findByPk(stockImport.id, {
      include: [
        { model: StockImportItem, as: 'items' },
        { model: Supplier },
        { model: User, as: 'importer', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json(fullImport);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { search, from_date, to_date, page = 1, limit = 20 } = req.query;
    const where = {};

    if (search) {
      where.import_code = { [Op.iLike]: `%${search}%` };
    }
    if (from_date || to_date) {
      where.createdAt = {};
      if (from_date) where.createdAt[Op.gte] = new Date(from_date);
      if (to_date) where.createdAt[Op.lte] = new Date(to_date + 'T23:59:59');
    }

    const offset = (page - 1) * limit;
    const { rows: imports, count } = await StockImport.findAndCountAll({
      where,
      include: [
        { model: Supplier, attributes: ['id', 'name'] },
        { model: User, as: 'importer', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({ imports, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const stockImport = await StockImport.findByPk(req.params.id, {
      include: [
        { model: StockImportItem, as: 'items', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
        { model: Supplier },
        { model: User, as: 'importer', attributes: ['id', 'name'] }
      ]
    });
    if (!stockImport) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập' });
    res.json(stockImport);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const { category_id, low_stock } = req.query;
    const where = { is_active: true };
    if (category_id) where.category_id = category_id;
    if (low_stock === 'true') {
      where.stock_quantity = { [Op.lte]: sequelize.col('min_stock') };
    }

    const products = await Product.findAll({
      where,
      attributes: ['id', 'name', 'sku', 'stock_quantity', 'min_stock', 'cost_price', 'sell_price', 'unit'],
      order: [['stock_quantity', 'ASC']]
    });

    const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.cost_price) * p.stock_quantity), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (parseFloat(p.sell_price) * p.stock_quantity), 0);

    res.json({
      products,
      summary: {
        total_products: products.length,
        total_stock_value: totalValue,
        total_retail_value: totalRetailValue,
        low_stock_count: products.filter(p => p.stock_quantity <= p.min_stock).length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
