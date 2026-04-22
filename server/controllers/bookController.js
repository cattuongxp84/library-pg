const { Op } = require('sequelize');
const { Book, Category } = require('../models');
const { isLanIP } = require('../middleware/lanAccess');

// ─── Helper: làm tròn giá tiền ───────────────────────────────────────────────
const roundPrice = (price) => {
  if (!price || price <= 0) return 0;
  // Làm tròn lên đến bội số của 10000 (10k VNĐ)
  return Math.ceil(price / 10000) * 10000;
};

// ─── Helper: lọc sách theo quyền mạng ────────────────────────────────────────
// Nếu request từ WAN → chỉ trả sách access_level = 'public'
// Nếu request từ LAN → trả sách 'public' + 'lan'
// Nếu đã đăng nhập   → trả thêm sách 'private'
const buildAccessFilter = (req) => {
  const isLAN  = req.isLAN  || false;
  const isAuth = !!req.user;
  const isStaff = isAuth && ['admin', 'librarian'].includes(req.user.role);

  // Staff xem tất cả
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
    const where = { is_active: true, ...buildAccessFilter(req) };

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

    // Kiểm tra quyền truy cập theo mạng
    const isStaff = req.user && ['admin', 'librarian'].includes(req.user.role);
    if (!isStaff) {
      const level  = book.access_level || 'public';
      const isLAN  = req.isLAN || false;
      const isAuth = !!req.user;

      if (level === 'lan' && !isLAN) {
        return res.status(403).json({
          success: false,
          message: 'Tài liệu này chỉ xem được trên mạng nội bộ (LAN)',
          code: 'LAN_ONLY',
        });
      }
      if (level === 'private' && !isAuth) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để xem tài liệu này',
          code: 'LOGIN_REQUIRED',
        });
      }
    }

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

    const pdf_url       = `/uploads/pdfs/${req.file.filename}`;
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
  const fs   = require('fs');
  const path = require('path');
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });
    if (book.pdf_url) {
      const filePath = path.join(__dirname, '..', book.pdf_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await book.update({ pdf_url: null, is_public_pdf: false });
    res.json({ success: true, message: 'Đã xóa PDF' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/books/:id/pdf ───────────────────────────────────────────────────
exports.getBookPdf = async (req, res) => {
  const path = require('path');
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book || !book.pdf_url)
      return res.status(404).json({ success: false, message: 'Sách không có file PDF' });

    const isStaff = req.user && ['admin', 'librarian'].includes(req.user.role);
    const level   = book.access_level || 'public';
    const isLAN   = req.isLAN || false;

    if (!isStaff) {
      // Kiểm tra access_level trước
      if (level === 'lan' && !isLAN) {
        return res.status(403).json({
          success: false,
          message: 'PDF này chỉ đọc được trên mạng nội bộ (LAN)',
          code: 'LAN_ONLY',
        });
      }
      if (level === 'private' && !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để đọc tài liệu này',
          code: 'LOGIN_REQUIRED',
        });
      }

      // Sau đó kiểm tra is_public_pdf (chỉ người đang mượn mới đọc được)
      if (!book.is_public_pdf) {
        if (!req.user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        const { Borrow } = require('../models');
        const active = await Borrow.findOne({
          where: { user_id: req.user.id, book_id: book.id, status: { [Op.in]: ['borrowed','renewed'] } },
        });
        if (!active)
          return res.status(403).json({ success: false, message: 'Bạn cần mượn sách này để đọc PDF' });
      }
    }

    const filePath = path.join(__dirname, '..', book.pdf_url);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
