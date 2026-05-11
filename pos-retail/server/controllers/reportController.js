const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/db');
const { Order, OrderItem, Product, Customer, StockImport } = require('../models');

exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const todayOrders = await Order.findAll({
      where: { createdAt: { [Op.between]: [startOfDay, endOfDay] }, status: 'completed' }
    });

    const monthOrders = await Order.findAll({
      where: { createdAt: { [Op.between]: [startOfMonth, endOfMonth] }, status: 'completed' }
    });

    const totalProducts = await Product.count({ where: { is_active: true } });
    const lowStockProducts = await Product.count({
      where: {
        is_active: true,
        stock_quantity: { [Op.lte]: col('min_stock') }
      }
    });
    const totalCustomers = await Customer.count({ where: { is_active: true } });

    res.json({
      today: {
        orders: todayOrders.length,
        revenue: todayOrders.reduce((sum, o) => sum + parseFloat(o.total), 0)
      },
      month: {
        orders: monthOrders.length,
        revenue: monthOrders.reduce((sum, o) => sum + parseFloat(o.total), 0)
      },
      inventory: { totalProducts, lowStockProducts },
      totalCustomers
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getRevenueReport = async (req, res) => {
  try {
    const { from_date, to_date, group_by = 'day' } = req.query;
    const startDate = from_date ? new Date(from_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to_date ? new Date(to_date + 'T23:59:59') : new Date();

    let dateFormat;
    if (group_by === 'month') dateFormat = 'YYYY-MM';
    else if (group_by === 'week') dateFormat = 'IYYY-IW';
    else dateFormat = 'YYYY-MM-DD';

    const revenue = await Order.findAll({
      where: {
        createdAt: { [Op.between]: [startDate, endDate] },
        status: 'completed'
      },
      attributes: [
        [fn('to_char', col('createdAt'), dateFormat), 'period'],
        [fn('COUNT', col('id')), 'order_count'],
        [fn('SUM', col('total')), 'total_revenue'],
        [fn('SUM', col('amount_paid')), 'total_collected']
      ],
      group: [fn('to_char', col('createdAt'), dateFormat)],
      order: [[fn('to_char', col('createdAt'), dateFormat), 'ASC']],
      raw: true
    });

    res.json(revenue);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { from_date, to_date, limit = 10 } = req.query;
    const startDate = from_date ? new Date(from_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to_date ? new Date(to_date + 'T23:59:59') : new Date();

    const topProducts = await OrderItem.findAll({
      attributes: [
        'product_id',
        'product_name',
        [fn('SUM', col('quantity')), 'total_sold'],
        [fn('SUM', col('OrderItem.total')), 'total_revenue']
      ],
      include: [{
        model: Order,
        where: {
          createdAt: { [Op.between]: [startDate, endDate] },
          status: 'completed'
        },
        attributes: []
      }],
      group: ['product_id', 'product_name'],
      order: [[fn('SUM', col('quantity')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
