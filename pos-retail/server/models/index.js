const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// ============ USER MODEL ============
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'staff'), defaultValue: 'staff' },
  phone: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'users', timestamps: true });

// ============ CATEGORY MODEL ============
const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'categories', timestamps: true });

// ============ PRODUCT MODEL ============
const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  sku: { type: DataTypes.STRING, unique: true },
  barcode: { type: DataTypes.STRING },
  category_id: { type: DataTypes.INTEGER, references: { model: 'categories', key: 'id' } },
  cost_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sell_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  stock_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  min_stock: { type: DataTypes.INTEGER, defaultValue: 5 },
  unit: { type: DataTypes.STRING, defaultValue: 'cái' },
  description: { type: DataTypes.TEXT },
  image_url: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'products', timestamps: true });

// ============ CUSTOMER MODEL ============
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  total_debt: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'customers', timestamps: true });

// ============ SUPPLIER MODEL ============
const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  total_debt: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'suppliers', timestamps: true });

// ============ ORDER MODEL ============
const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_code: { type: DataTypes.STRING, unique: true, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, references: { model: 'customers', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_type: { type: DataTypes.ENUM('percent', 'amount'), defaultValue: 'amount' },
  tax: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  change_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_method: { type: DataTypes.ENUM('cash', 'transfer', 'card', 'debt'), defaultValue: 'cash' },
  status: { type: DataTypes.ENUM('completed', 'pending', 'cancelled'), defaultValue: 'completed' },
  notes: { type: DataTypes.TEXT },
  is_synced: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'orders', timestamps: true });

// ============ ORDER ITEM MODEL ============
const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, references: { model: 'orders', key: 'id' } },
  product_id: { type: DataTypes.INTEGER, references: { model: 'products', key: 'id' } },
  product_name: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
}, { tableName: 'order_items', timestamps: true });

// ============ STOCK IMPORT MODEL ============
const StockImport = sequelize.define('StockImport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  import_code: { type: DataTypes.STRING, unique: true, allowNull: false },
  supplier_id: { type: DataTypes.INTEGER, references: { model: 'suppliers', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_method: { type: DataTypes.ENUM('cash', 'transfer', 'debt'), defaultValue: 'cash' },
  notes: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('completed', 'pending', 'cancelled'), defaultValue: 'completed' }
}, { tableName: 'stock_imports', timestamps: true });

// ============ STOCK IMPORT ITEM MODEL ============
const StockImportItem = sequelize.define('StockImportItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  stock_import_id: { type: DataTypes.INTEGER, references: { model: 'stock_imports', key: 'id' } },
  product_id: { type: DataTypes.INTEGER, references: { model: 'products', key: 'id' } },
  product_name: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  total: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
}, { tableName: 'stock_import_items', timestamps: true });

// ============ DEBT TRANSACTION MODEL ============
const DebtTransaction = sequelize.define('DebtTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.ENUM('customer', 'supplier'), allowNull: false },
  reference_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  transaction_type: { type: DataTypes.ENUM('debt_increase', 'debt_payment'), allowNull: false },
  payment_method: { type: DataTypes.ENUM('cash', 'transfer', 'card'), defaultValue: 'cash' },
  order_id: { type: DataTypes.INTEGER },
  stock_import_id: { type: DataTypes.INTEGER },
  notes: { type: DataTypes.TEXT },
  user_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } }
}, { tableName: 'debt_transactions', timestamps: true });

// ============ ASSOCIATIONS ============
Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

Customer.hasMany(Order, { foreignKey: 'customer_id' });
Order.belongsTo(Customer, { foreignKey: 'customer_id' });

User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'seller' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

Supplier.hasMany(StockImport, { foreignKey: 'supplier_id' });
StockImport.belongsTo(Supplier, { foreignKey: 'supplier_id' });

User.hasMany(StockImport, { foreignKey: 'user_id' });
StockImport.belongsTo(User, { foreignKey: 'user_id', as: 'importer' });

StockImport.hasMany(StockImportItem, { foreignKey: 'stock_import_id', as: 'items' });
StockImportItem.belongsTo(StockImport, { foreignKey: 'stock_import_id' });

Product.hasMany(StockImportItem, { foreignKey: 'product_id' });
StockImportItem.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = {
  User, Category, Product, Customer, Supplier,
  Order, OrderItem, StockImport, StockImportItem, DebtTransaction
};
