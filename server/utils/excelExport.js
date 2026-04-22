const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Đảm bảo folder tmp tồn tại
const tmpDir = path.join(__dirname, '../../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// ─── Style helpers ────────────────────────────────────────────────────────────
const headerStyle = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563eb' } },
  font: { bold: true, color: { argb: 'FFFFFF' }, size: 11 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
};

const cellStyle = {
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
};

const centerStyle = {
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
};

// ─── Báo cáo sách mất ────────────────────────────────────────────────────────
exports.exportLostBooks = async (lostBooks) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sách Mất');

  // Header
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã Sách', key: 'copy_code', width: 20 },
    { header: 'Tên Sách', key: 'book_title', width: 30 },
    { header: 'Tác Giả', key: 'author', width: 20 },
    { header: 'Danh Mục', key: 'category', width: 15 },
    { header: 'Ngày Thêm', key: 'acquired_at', width: 15 },
    { header: 'Tình Trạng Cuối', key: 'condition', width: 15 },
    { header: 'Ghi Chú', key: 'note', width: 30 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  // Data
  let stt = 1;
  lostBooks.forEach(item => {
    worksheet.addRow({
      stt: stt++,
      copy_code: item.copy_code,
      book_title: item.book?.title,
      author: item.book?.author,
      category: item.book?.category?.name,
      acquired_at: item.acquired_at ? item.acquired_at.toISOString().split('T')[0] : '',
      condition: item.condition,
      note: item.note || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => {
        cell.style = cellStyle;
      });
    }
  });

  const filename = `lost-books-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

// ─── Báo cáo sách quá hạn ────────────────────────────────────────────────────
exports.exportOverdueBooks = async (overdueBooks) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sách Quá Hạn');

  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã SV', key: 'student_id', width: 15 },
    { header: 'Tên Sinh Viên', key: 'student_name', width: 20 },
    { header: 'Tên Sách', key: 'book_title', width: 30 },
    { header: 'Mã Sách', key: 'copy_code', width: 20 },
    { header: 'Ngày Mượn', key: 'borrow_date', width: 12 },
    { header: 'Hạn Trả', key: 'due_date', width: 12 },
    { header: 'Quá Hạn (Ngày)', key: 'overdue_days', width: 12 },
    { header: 'Tiền Phạt (VNĐ)', key: 'fine_amount', width: 15 },
    { header: 'Trạng Thái', key: 'status', width: 15 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  let stt = 1;
  overdueBooks.forEach(item => {
    const today = new Date();
    const overdaysDays = Math.floor((today - new Date(item.due_date)) / (1000 * 60 * 60 * 24));
    const fineAmount = overdaysDays * 5000; // 5000 VNĐ/ngày

    worksheet.addRow({
      stt: stt++,
      student_id: item.user?.student_id,
      student_name: item.user?.name,
      book_title: item.book?.title,
      copy_code: item.copy?.copy_code || 'N/A',
      borrow_date: new Date(item.borrow_date).toISOString().split('T')[0],
      due_date: new Date(item.due_date).toISOString().split('T')[0],
      overdue_days: overdaysDays,
      fine_amount: fineAmount,
      status: item.status,
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell, colNumber) => {
        if ([8, 9].includes(colNumber)) {
          cell.style = { ...centerStyle };
        } else {
          cell.style = cellStyle;
        }
      });
    }
  });

  const filename = `overdue-books-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

// ─── Báo cáo tổng hợp ────────────────────────────────────────────────────────
exports.exportComprehensiveReport = async (stats) => {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Tổng hợp
  const summaryWs = workbook.addWorksheet('Tổng Hợp');
  summaryWs.columns = [
    { header: 'Chỉ Số', key: 'metric', width: 30 },
    { header: 'Giá Trị', key: 'value', width: 20 },
  ];

  summaryWs.getRow(1).style = headerStyle;
  summaryWs.addRows([
    { metric: 'Tổng số nhan đề sách', value: stats.totalBooks },
    { metric: 'Tổng số bản đăng ký', value: stats.totalCopies },
    { metric: 'Sách có sẵn', value: stats.availableCopies },
    { metric: 'Sách đang mượn', value: stats.borrowedCopies },
    { metric: 'Sách bị mất', value: stats.lostCopies },
    { metric: 'Sách quá hạn', value: stats.overdueBorrows },
    { metric: 'Tổng tiền phạt chưa trả (VNĐ)', value: stats.totalUnpaidFines },
  ]);

  // Sheet 2: Thống kê theo danh mục
  if (stats.categoryStats && stats.categoryStats.length > 0) {
    const catWs = workbook.addWorksheet('Thống Kê Danh Mục');
    catWs.columns = [
      { header: 'Danh Mục', key: 'category', width: 25 },
      { header: 'Nhan Đề', key: 'titleCount', width: 12 },
      { header: 'Bản Đăng Ký', key: 'copyCount', width: 15 },
      { header: 'Có Sẵn', key: 'available', width: 12 },
      { header: 'Đang Mượn', key: 'borrowed', width: 12 },
    ];

    catWs.getRow(1).style = headerStyle;
    stats.categoryStats.forEach(row => {
      catWs.addRow({
        category: row.category,
        titleCount: row.titleCount,
        copyCount: row.copyCount,
        available: row.available,
        borrowed: row.borrowed,
      });
    });
  }

  const filename = `report-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

// ─── Import kiểm kê từ Excel ────────────────────────────────────────────────
exports.parseInventoryFile = async (filepath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);
  const worksheet = workbook.getWorksheet(1);

  const data = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const copyCode = row.getCell(1).value;
    const found = row.getCell(2).value === 'Có' || row.getCell(2).value === true;
    const notes = row.getCell(3).value || '';

    if (copyCode) {
      data.push({ copyCode, found, notes });
    }
  });

  return data;
};

// ─── Tạo template kiểm kê ────────────────────────────────────────────────────
exports.createInventoryTemplate = async (copies) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Kiểm Kê');

  worksheet.columns = [
    { header: 'Mã Sách', key: 'copy_code', width: 20 },
    { header: 'Tên Sách', key: 'book_title', width: 30 },
    { header: 'Tác Giả', key: 'author', width: 20 },
    { header: 'Tìm Thấy (Có/Không)', key: 'found', width: 15 },
    { header: 'Ghi Chú', key: 'notes', width: 30 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  let stt = 1;
  copies.forEach(copy => {
    worksheet.addRow({
      stt: stt++,
      copy_code: copy.copy_code,
      book_title: copy.book?.title,
      author: copy.book?.author,
      found: '',
      notes: '',
    });
  });

  const filename = `inventory-template-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};
