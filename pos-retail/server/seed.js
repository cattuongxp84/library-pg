require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/db');
const { User, Category, Product, Customer, Supplier } = require('./models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    await sequelize.sync({ force: true });
    console.log('Tables created');

    // Create admin user
    const hashedPassword = await bcrypt.hash('123456', 10);
    await User.bulkCreate([
      { name: 'Admin', email: 'admin@cafe.com', password: hashedPassword, role: 'admin', phone: '0901234567' },
      { name: 'Thu ngân 1', email: 'staff@cafe.com', password: hashedPassword, role: 'staff', phone: '0901234568' }
    ]);
    console.log('✅ Users created');

    // Create categories
    const categories = await Category.bulkCreate([
      { name: 'Cà phê', description: 'Các loại cà phê truyền thống và hiện đại' },
      { name: 'Trà sữa', description: 'Trà sữa các vị, topping đa dạng' },
      { name: 'Nước ép & Sinh tố', description: 'Nước ép trái cây, sinh tố tươi' },
      { name: 'Bánh ngọt', description: 'Bánh ngọt, pastry phục vụ kèm đồ uống' },
      { name: 'Topping & Thêm', description: 'Topping, size up, extra shot' }
    ]);
    console.log('✅ Categories created');

    // Create products - Cafe menu
    await Product.bulkCreate([
      // Cà phê
      { name: 'Cà phê đen đá', sku: 'CF001', barcode: '1000000001', category_id: categories[0].id, cost_price: 8000, sell_price: 25000, stock_quantity: 500, unit: 'ly', min_stock: 50 },
      { name: 'Cà phê sữa đá', sku: 'CF002', barcode: '1000000002', category_id: categories[0].id, cost_price: 10000, sell_price: 29000, stock_quantity: 500, unit: 'ly', min_stock: 50 },
      { name: 'Bạc xỉu', sku: 'CF003', barcode: '1000000003', category_id: categories[0].id, cost_price: 12000, sell_price: 32000, stock_quantity: 300, unit: 'ly', min_stock: 30 },
      { name: 'Cappuccino', sku: 'CF004', barcode: '1000000004', category_id: categories[0].id, cost_price: 15000, sell_price: 45000, stock_quantity: 200, unit: 'ly', min_stock: 20 },
      { name: 'Latte', sku: 'CF005', barcode: '1000000005', category_id: categories[0].id, cost_price: 15000, sell_price: 45000, stock_quantity: 200, unit: 'ly', min_stock: 20 },
      // Trà sữa
      { name: 'Trà sữa trân châu', sku: 'TS001', barcode: '2000000001', category_id: categories[1].id, cost_price: 12000, sell_price: 35000, stock_quantity: 300, unit: 'ly', min_stock: 30 },
      { name: 'Trà sữa matcha', sku: 'TS002', barcode: '2000000002', category_id: categories[1].id, cost_price: 14000, sell_price: 39000, stock_quantity: 200, unit: 'ly', min_stock: 20 },
      { name: 'Trà đào cam sả', sku: 'TS003', barcode: '2000000003', category_id: categories[1].id, cost_price: 10000, sell_price: 35000, stock_quantity: 300, unit: 'ly', min_stock: 30 },
      // Nước ép & Sinh tố
      { name: 'Sinh tố bơ', sku: 'ST001', barcode: '3000000001', category_id: categories[2].id, cost_price: 15000, sell_price: 39000, stock_quantity: 100, unit: 'ly', min_stock: 10 },
      { name: 'Nước ép cam', sku: 'ST002', barcode: '3000000002', category_id: categories[2].id, cost_price: 12000, sell_price: 32000, stock_quantity: 150, unit: 'ly', min_stock: 15 },
      { name: 'Sinh tố dâu', sku: 'ST003', barcode: '3000000003', category_id: categories[2].id, cost_price: 14000, sell_price: 35000, stock_quantity: 100, unit: 'ly', min_stock: 10 },
      // Bánh ngọt
      { name: 'Bánh croissant', sku: 'BN001', barcode: '4000000001', category_id: categories[3].id, cost_price: 15000, sell_price: 35000, stock_quantity: 50, unit: 'cái', min_stock: 5 },
      { name: 'Bánh tiramisu', sku: 'BN002', barcode: '4000000002', category_id: categories[3].id, cost_price: 20000, sell_price: 45000, stock_quantity: 30, unit: 'miếng', min_stock: 5 },
      { name: 'Cookie socola', sku: 'BN003', barcode: '4000000003', category_id: categories[3].id, cost_price: 8000, sell_price: 20000, stock_quantity: 80, unit: 'cái', min_stock: 10 },
      // Topping
      { name: 'Trân châu đen', sku: 'TP001', barcode: '5000000001', category_id: categories[4].id, cost_price: 2000, sell_price: 5000, stock_quantity: 500, unit: 'phần', min_stock: 50 },
      { name: 'Thạch dừa', sku: 'TP002', barcode: '5000000002', category_id: categories[4].id, cost_price: 2000, sell_price: 5000, stock_quantity: 500, unit: 'phần', min_stock: 50 },
      { name: 'Extra shot espresso', sku: 'TP003', barcode: '5000000003', category_id: categories[4].id, cost_price: 5000, sell_price: 10000, stock_quantity: 300, unit: 'shot', min_stock: 30 },
    ]);
    console.log('✅ Products created');

    // Create customers
    await Customer.bulkCreate([
      { name: 'Nguyễn Minh Anh', phone: '0912345678', address: '123 Đường Lê Lợi, Q1' },
      { name: 'Trần Hải Long', phone: '0923456789', address: '456 Đường Nguyễn Huệ, Q1' },
      { name: 'Phạm Thị Mai', phone: '0934567890', address: '789 Đường Hai Bà Trưng, Q3', total_debt: 350000 }
    ]);
    console.log('✅ Customers created');

    // Create suppliers
    await Supplier.bulkCreate([
      { name: 'Công ty Cà phê Trung Nguyên', phone: '02812345678', address: 'KCN Long Thành, Đồng Nai' },
      { name: 'NCC Trà & Topping Hưng Phát', phone: '02823456789', address: 'Q.Bình Tân, TP.HCM' },
      { name: 'Tiệm bánh Sweet Home', phone: '02834567890', address: 'Q.3, TP.HCM', total_debt: 800000 }
    ]);
    console.log('✅ Suppliers created');

    console.log('\n🎉 Seed completed successfully!');
    console.log('☕ Admin: admin@cafe.com / 123456');
    console.log('☕ Staff: staff@cafe.com / 123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
