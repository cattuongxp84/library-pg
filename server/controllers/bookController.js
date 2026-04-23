const { Op } = require('sequelize');
const { Book, Category } = require('../models');
const { isLanIP } = require('../middleware/lanAccess');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Helper: làm tròn giá tiền ───────────────────────────────────────────────
const roundPrice = (price) => {
  if (!price || price <= 0) return 0;
  return Math.ceil(price / 10000) * 10000;
};

// ─── Helper: lọc sách theo quyền mạng ────────────────────────────────────────
const buildAccessFilter = (req) => {
  const isLAN  = req.isLAN  || false;
  const isAuth = !!req.user;
  const isStaff = isAuth && ['admin', 'librarian'].includes(req.user.role);

  if (isStaff) return {};

  const allowed = ['public'];
  if (isLAN)  allowed.push('lan');
  if (isAuth) allowed.push('private');

  return { access_level: { [Op.in]: allowed } };
};

// ─── GET /api/books ───────────────────────────────────────────────────────────
exports.getBooks = async (req, res) => {
  try {
    const { search, category, available, has_pdf, page = 1, limit = 12, sort = 'created_at', order = 'DESC' } = req.query;
    const where = { is_active: true };

    if (search) {
      where[Op.or] = [
        { title:  { [Op.iLike]: `%${search}%` } },
        { author: { [Op.iLike]: `%${search}%` } },
        { isbn:   { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (category)             where.category_id      = category;
    if (available === 'true')  where.available_copies = { [Op.gt]: 0 };
    if (available === 'false') where.available_copies = 0;
    if (has_pdf === 'true')    where.pdf_url = { [Op.ne]: null };
    if (has_pdf === 'false')   where.pdf_url = null;

    const { count, rows } = await Book.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/books/:id ───────────────────────────────────────────────────────
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    });
    if (!book || !book.is_active)
      return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });

    res.json({ success: true, data: book });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/books ──────────────────────────────────────────────────────────
exports.createBook = async (req, res) => {
  try {
    const bookData = { ...req.body };
    if (bookData.deposit) {
      bookData.deposit = roundPrice(parseInt(bookData.deposit));
    }
    const book = await Book.create(bookData);
    res.status(201).json({ success: true, data: book });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/books/:id ───────────────────────────────────────────────────────
exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });
    const updateData = { ...req.body };
    if (updateData.deposit !== undefined) {
      updateData.deposit = roundPrice(parseInt(updateData.deposit));
    }
    await book.update(updateData);
    res.json({ success: true, data: book });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/books/:id ────────────────────────────────────────────────────
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });
    await book.update({ is_active: false });
    res.json({ success: true, message: 'Đã xóa sách' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/books/:id/pdf ──────────────────────────────────────────────────
exports.uploadBookPdf = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file PDF' });

    // Xóa PDF cũ trên Cloudinary nếu có
    if (book.pdf_url && book.pdf_url.includes('cloudinary')) {
      try {
        const parts   = book.pdf_url.split('/');
        const folder  = parts[parts.length - 2];
        const filename = parts[parts.length - 1].replace('.pdf', '');
        await cloudinary.uploader.destroy(`${folder}/${filename}`, { resource_type: 'raw' });
      } catch (e) {
        console.warn('Không xóa được PDF cũ trên Cloudinary:', e.message);
      }
    }

    // req.file.path là Cloudinary URL khi dùng multer-storage-cloudinary
    const pdf_url       = req.file.path;
    const is_public_pdf = req.body.is_public_pdf === 'true';
    const access_level  = req.body.access_level  || book.access_level || 'public';
    await book.update({ pdf_url, is_public_pdf, access_level });
    res.json({ success: true, data: book });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/books/:id/pdf ────────────────────────────────────────────────
exports.deleteBookPdf = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });

    // Xóa file trên Cloudinary
    if (book.pdf_url && book.pdf_url.includes('cloudinary')) {
      try {
        const parts    = book.pdf_url.split('/');
        const folder   = parts[parts.length - 2];
        const filename = parts[parts.length - 1].replace('.pdf', '');
        await cloudinary.uploader.destroy(`${folder}/${filename}`, { resource_type: 'raw' });
      } catch (e) {
        console.warn('Không xóa được PDF trên Cloudinary:', e.message);
      }
    }

    await book.update({ pdf_url: null, is_public_pdf: false });
    res.json({ success: true, message: 'Đã xóa PDF' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/books/:id/pdf ───────────────────────────────────────────────────
/**
 * Lấy PDF của sách với kiểm soát quyền truy cập:
 *
 * 📋 QUY TẮC TRUY CẬP:
 *   1. PUBLIC (access_level='public'): Ai cũng xem được
 *   2. PRIVATE + is_public_pdf=true (không bản quyền): Chỉ cần đăng nhập, xem từ bất kỳ đâu
 *   3. PRIVATE + is_public_pdf=false: Phải đăng nhập + mượn sách
 *   4. LAN (access_level='lan', có bản quyền): Phải trong LAN + đăng nhập
 *      → Admin/Librarian: được từ bất kỳ đâu
 *
 * 📍 LAN IP: Được xác định bởi x-forwarded-for header hoặc remoteAddress
 *    Mặc định: 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.x (localhost)
 */
exports.getBookPdf = async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book || !book.pdf_url)
      return res.status(404).json({ success: false, message: 'Sách không có file PDF' });

    // Kiểm soát truy cập
    const { canAccessBookPdf, requiresBorrow } = require('../utils/fileAccessControl');
    const accessResult = canAccessBookPdf(book, req.user, req.isLAN);

    if (!accessResult.allowed) {
      const statusCode = 
        accessResult.code === 'LOGIN_REQUIRED' ? 401 :
        accessResult.code === 'NO_PDF' ? 404 :
        403;

      return res.status(statusCode).json({
        success: false,
        message: accessResult.reason,
        code: accessResult.code,
        // Gợi ý: nếu cần mượn sách, gửi flag cho frontend
        ...(accessResult.requireBorrow && { hint: 'Vui lòng mượn sách này để xem PDF' }),
        ...(accessResult.requireLAN && { hint: 'Vui lòng truy cập từ mạng nội bộ của trường' }),
      });
    }

    // Nếu yêu cầu mượn sách, kiểm tra xem user có mượn không
    if (requiresBorrow(book) && req.user) {
      const { Borrow } = require('../models');
      const { Op } = require('sequelize');
      const active = await Borrow.findOne({
        where: { 
          user_id: req.user.id, 
          book_id: book.id, 
          status: { [Op.in]: ['borrowed', 'renewed'] } 
        },
      });
      if (!active) {
        return res.status(403).json({
          success: false,
          message: 'Bạn cần mượn sách này để xem PDF',
          code: 'MUST_BORROW',
        });
      }
    }

    // ✅ Cho phép truy cập — redirect đến PDF URL
    res.redirect(book.pdf_url);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
