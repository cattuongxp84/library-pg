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
      { name: 'Admin', email: 'admin@pos.com', password: hashedPassword, role: 'admin', phone: '0901234567' },
      { name: 'Nhân viên 1', email: 'staff@pos.com', password: hashedPassword, role: 'staff', phone: '0901234568' }
    ]);
    console.log('✅ Users created');

    // Create categories
    const categories = await Category.bulkCreate([
      { name: 'Thực phẩm', description: 'Đồ ăn, thức uống' },
      { name: 'Đồ gia dụng', description: 'Vật dụng gia đình' },
      { name: 'Mỹ phẩm', description: 'Sản phẩm làm đẹp' },
      { name: 'Văn phòng phẩm', description: 'Dụng cụ văn phòng' },
      { name: 'Điện tử', description: 'Phụ kiện điện tử' }
    ]);
    console.log('✅ Categories created');

    // Create products
    await Product.bulkCreate([
      { name: 'Mì gói Hảo Hảo', sku: 'SP001', barcode: '8934563138011', category_id: categories[0].id, cost_price: 3500, sell_price: 5000, stock_quantity: 200, unit: 'gói' },
      { name: 'Nước suối Aquafina 500ml', sku: 'SP002', barcode: '8934588012013', category_id: categories[0].id, cost_price: 4000, sell_price: 6000, stock_quantity: 150, unit: 'chai' },
      { name: 'Sữa Vinamilk 180ml', sku: 'SP003', barcode: '8934673012014', category_id: categories[0].id, cost_price: 6000, sell_price: 8000, stock_quantity: 100, unit: 'hộp' },
      { name: 'Bàn chải đánh răng', sku: 'SP004', barcode: '8934673012015', category_id: categories[1].id, cost_price: 15000, sell_price: 25000, stock_quantity: 50, unit: 'cái' },
      { name: 'Nước rửa tay Lifebuoy', sku: 'SP005', barcode: '8934673012016', category_id: categories[1].id, cost_price: 25000, sell_price: 38000, stock_quantity: 30, unit: 'chai' },
      { name: 'Kem chống nắng', sku: 'SP006', barcode: '8934673012017', category_id: categories[2].id, cost_price: 80000, sell_price: 120000, stock_quantity: 20, unit: 'tuýp' },
      { name: 'Son môi', sku: 'SP007', barcode: '8934673012018', category_id: categories[2].id, cost_price: 100000, sell_price: 150000, stock_quantity: 15, unit: 'cây' },
      { name: 'Bút bi Thiên Long', sku: 'SP008', barcode: '8934673012019', category_id: categories[3].id, cost_price: 3000, sell_price: 5000, stock_quantity: 300, unit: 'cây' },
      { name: 'Vở 200 trang', sku: 'SP009', barcode: '8934673012020', category_id: categories[3].id, cost_price: 8000, sell_price: 12000, stock_quantity: 100, unit: 'cuốn' },
      { name: 'Sạc điện thoại USB-C', sku: 'SP010', barcode: '8934673012021', category_id: categories[4].id, cost_price: 50000, sell_price: 80000, stock_quantity: 25, unit: 'cái' },
      { name: 'Tai nghe có dây', sku: 'SP011', barcode: '8934673012022', category_id: categories[4].id, cost_price: 30000, sell_price: 55000, stock_quantity: 40, unit: 'cái' },
      { name: 'Coca Cola 330ml', sku: 'SP012', barcode: '8934673012023', category_id: categories[0].id, cost_price: 7000, sell_price: 10000, stock_quantity: 120, unit: 'lon' }
    ]);
    console.log('✅ Products created');

    // Create customers
    await Customer.bulkCreate([
      { name: 'Nguyễn Văn A', phone: '0912345678', address: '123 Đường Lê Lợi, Q1' },
      { name: 'Trần Thị B', phone: '0923456789', address: '456 Đường Nguyễn Huệ, Q1' },
      { name: 'Lê Văn C', phone: '0934567890', address: '789 Đường Hai Bà Trưng, Q3', total_debt: 250000 }
    ]);
    console.log('✅ Customers created');

    // Create suppliers
    await Supplier.bulkCreate([
      { name: 'Công ty TNHH Thực Phẩm ABC', phone: '02812345678', address: 'KCN Tân Bình, TP.HCM' },
      { name: 'Nhà phân phối Gia Dụng XYZ', phone: '02823456789', address: 'Q.Bình Tân, TP.HCM' },
      { name: 'Đại lý Văn phòng phẩm DEF', phone: '02834567890', address: 'Q.10, TP.HCM', total_debt: 500000 }
    ]);
    console.log('✅ Suppliers created');

    console.log('\n🎉 Seed completed successfully!');
    console.log('📧 Admin: admin@pos.com / 123456');
    console.log('📧 Staff: staff@pos.com / 123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
