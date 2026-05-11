const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const orderController = require('../controllers/orderController');
const customerController = require('../controllers/customerController');
const supplierController = require('../controllers/supplierController');
const stockController = require('../controllers/stockController');
const debtController = require('../controllers/debtController');
const reportController = require('../controllers/reportController');
const invoiceController = require('../controllers/invoiceController');
const syncController = require('../controllers/syncController');

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/register', auth, adminOnly, authController.register);
router.get('/auth/profile', auth, authController.getProfile);
router.put('/auth/change-password', auth, authController.changePassword);

// Product routes
router.get('/products', auth, productController.getAll);
router.get('/products/low-stock', auth, productController.getLowStock);
router.get('/products/barcode/:barcode', auth, productController.searchByBarcode);
router.get('/products/:id', auth, productController.getById);
router.post('/products', auth, productController.create);
router.put('/products/:id', auth, productController.update);
router.delete('/products/:id', auth, adminOnly, productController.delete);

// Category routes
router.get('/categories', auth, categoryController.getAll);
router.post('/categories', auth, categoryController.create);
router.put('/categories/:id', auth, categoryController.update);
router.delete('/categories/:id', auth, adminOnly, categoryController.delete);

// Order routes (POS)
router.get('/orders', auth, orderController.getAll);
router.get('/orders/daily-summary', auth, orderController.getDailySummary);
router.get('/orders/:id', auth, orderController.getById);
router.post('/orders', auth, orderController.create);
router.put('/orders/:id/cancel', auth, orderController.cancel);

// Customer routes
router.get('/customers', auth, customerController.getAll);
router.get('/customers/:id', auth, customerController.getById);
router.post('/customers', auth, customerController.create);
router.put('/customers/:id', auth, customerController.update);
router.delete('/customers/:id', auth, adminOnly, customerController.delete);
router.post('/customers/:id/pay-debt', auth, customerController.payDebt);

// Supplier routes
router.get('/suppliers', auth, supplierController.getAll);
router.get('/suppliers/:id', auth, supplierController.getById);
router.post('/suppliers', auth, supplierController.create);
router.put('/suppliers/:id', auth, supplierController.update);
router.delete('/suppliers/:id', auth, adminOnly, supplierController.delete);
router.post('/suppliers/:id/pay-debt', auth, supplierController.payDebt);

// Stock/Inventory routes
router.get('/stock/imports', auth, stockController.getAll);
router.get('/stock/imports/:id', auth, stockController.getById);
router.post('/stock/imports', auth, stockController.createImport);
router.get('/stock/inventory', auth, stockController.getInventoryReport);

// Debt routes
router.get('/debts/customers', auth, debtController.getCustomerDebts);
router.get('/debts/suppliers', auth, debtController.getSupplierDebts);
router.get('/debts/transactions', auth, debtController.getTransactions);
router.get('/debts/summary', auth, debtController.getSummary);

// Report routes
router.get('/reports/dashboard', auth, reportController.getDashboard);
router.get('/reports/revenue', auth, reportController.getRevenueReport);
router.get('/reports/top-products', auth, reportController.getTopProducts);

// Invoice routes
router.get('/invoices/:id/pdf', auth, invoiceController.generateInvoice);
router.get('/invoices/:id/data', auth, invoiceController.getInvoiceData);

// Sync routes
router.get('/sync/unsynced', auth, syncController.getUnsyncedData);
router.post('/sync/mark-synced', auth, syncController.markSynced);
router.get('/sync/export', auth, adminOnly, syncController.exportData);
router.post('/sync/import', auth, adminOnly, syncController.importData);

module.exports = router;
