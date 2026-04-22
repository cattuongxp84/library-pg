const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'library_pro',
  username: process.env.DB_USER || 'library_ctx',
  password: process.env.DB_PASSWORD || 'library_password',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: {
    underscored: true,       // camelCase JS <-> snake_case DB
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
    // sync: alter=true updates schema without dropping data
    await sequelize.sync({ force: false, alter: true });
    console.log('Database synced');
  } catch (err) {
    console.error('DB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
