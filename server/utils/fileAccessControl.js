/**
 * Utility: Kiểm soát truy cập file dựa trên bản quyền và vị trí mạng
 * 
 * ĐỊNH NGHĨA:
 * 1. File "Không bản quyền" (Public Release)
 *    - access_level: 'private'
 *    - is_public_pdf: true
 *    - Quy tắc: Chỉ yêu cầu ĐĂNG NHẬP, có thể xem từ bất kỳ đâu (LAN hoặc WAN)
 *    - Hữu ích: Tài liệu công khai, sách có thể chia sẻ ngoài mạng
 *
 * 2. File "Có bản quyền" (Copyrighted/Licensed)
 *    - access_level: 'lan'
 *    - is_public_pdf: false (tuỳ chọn)
 *    - Quy tắc: BẮT BUỘC trong mạng LAN + đăng nhập
 *               Admin/Librarian từ bất kỳ đâu cũng được
 *    - Hữu ích: Sách với bản quyền giới hạn, tránh sao lưu/chia sẻ ngoài
 *
 * 3. File "Công khai" (Public)
 *    - access_level: 'public'
 *    - is_public_pdf: true
 *    - Quy tắc: Ai cũng xem được (chưa đăng nhập cũng được)
 *    - Hữu ích: Mô tả, tóm tắt, preview
 *
 * 4. Tài liệu riêng tư (Private)
 *    - access_level: 'private'
 *    - is_public_pdf: false
 *    - Quy tắc: Yêu cầu đăng nhập + mượn sách
 *    - Hữu ích: Tài liệu cấp cao, chỉ có người mượn mới xem
 */

/**
 * Kiểm tra có thể truy cập file PDF hay không
 *
 * @param {Object} book - Object sách từ DB
 * @param {Object} user - Object user (có thể null nếu chưa đăng nhập)
 * @param {boolean} isLAN - Có phải từ mạng LAN không (req.isLAN)
 * @returns {Object} { allowed: boolean, reason?: string, code?: string }
 */
exports.canAccessBookPdf = (book, user, isLAN) => {
  if (!book) {
    return { allowed: false, reason: 'Sách không tồn tại', code: 'BOOK_NOT_FOUND' };
  }

  if (!book.pdf_url) {
    return { allowed: false, reason: 'Sách không có file PDF', code: 'NO_PDF' };
  }

  const level = book.access_level || 'public';
  const isStaff = user && ['admin', 'librarian'].includes(user.role);

  // ────────────────────────────────────────────────────────────────────────────
  // 1. PUBLIC: Ai cũng xem được
  // ────────────────────────────────────────────────────────────────────────────
  if (level === 'public') {
    return { allowed: true };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. PRIVATE (không bản quyền): Chỉ yêu cầu đăng nhập
  // ────────────────────────────────────────────────────────────────────────────
  if (level === 'private') {
    // Nếu is_public_pdf = true: chỉ cần đăng nhập (miễn là user hoặc staff)
    if (book.is_public_pdf) {
      if (!user) {
        return {
          allowed: false,
          reason: 'Vui lòng đăng nhập để xem tài liệu này',
          code: 'LOGIN_REQUIRED',
        };
      }
      return { allowed: true };
    }

    // Nếu is_public_pdf = false: cần mượn sách + đăng nhập
    if (!user) {
      return {
        allowed: false,
        reason: 'Vui lòng đăng nhập để xem tài liệu này',
        code: 'LOGIN_REQUIRED',
      };
    }

    // Staff luôn được xem
    if (isStaff) {
      return { allowed: true };
    }

    // Người dùng thường phải mượn sách
    return {
      allowed: false,
      reason: 'Bạn cần mượn sách này để xem PDF',
      code: 'MUST_BORROW',
      requireBorrow: true,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. LAN (có bản quyền): Bắt buộc LAN + đăng nhập
  // ────────────────────────────────────────────────────────────────────────────
  if (level === 'lan') {
    // Staff từ bất kỳ đâu cũng được
    if (isStaff) {
      return { allowed: true };
    }

    // Người dùng thường phải từ LAN
    if (!isLAN) {
      return {
        allowed: false,
        reason: 'Tài liệu này chỉ xem được trên mạng nội bộ (LAN)',
        code: 'LAN_ONLY',
        requireLAN: true,
      };
    }

    // Từ LAN + cần đăng nhập
    if (!user) {
      return {
        allowed: false,
        reason: 'Vui lòng đăng nhập để xem tài liệu này',
        code: 'LOGIN_REQUIRED',
      };
    }

    return { allowed: true };
  }

  // Mặc định: từ chối
  return {
    allowed: false,
    reason: 'Bạn không có quyền truy cập tài liệu này',
    code: 'ACCESS_DENIED',
  };
};

/**
 * Kiểm tra có phải trong tình huống cần mượn sách hay không
 * (dùng cho logic xử lý đặc biệt)
 */
exports.requiresBorrow = (book) => {
  return book.access_level === 'private' && !book.is_public_pdf;
};

/**
 * Kiểm tra có phải file chỉ xem được trong LAN hay không
 */
exports.requiresLAN = (book) => {
  return book.access_level === 'lan';
};

/**
 * Kiểm tra có phải file không bản quyền (công khai) hay không
 * (chỉ cần đăng nhập, có thể xem từ ngoài)
 */
exports.isPublicRelease = (book) => {
  return book.access_level === 'private' && book.is_public_pdf;
};
