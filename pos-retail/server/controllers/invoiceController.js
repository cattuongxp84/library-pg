const PDFDocument = require('pdfkit');
const { Order, OrderItem, Customer, User } = require('../models');

exports.generateInvoice = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Customer },
        { model: User, as: 'seller', attributes: ['id', 'name'] }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const storeName = process.env.STORE_NAME || 'CỬA HÀNG BÁN LẺ';
    const storeAddress = process.env.STORE_ADDRESS || '';
    const storePhone = process.env.STORE_PHONE || '';

    const doc = new PDFDocument({ size: [226, 600], margin: 10 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${order.order_code}.pdf`);
    doc.pipe(res);

    doc.fontSize(12).text(storeName, { align: 'center' });
    if (storeAddress) doc.fontSize(8).text(storeAddress, { align: 'center' });
    if (storePhone) doc.fontSize(8).text(`ĐT: ${storePhone}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(10).text('HÓA ĐƠN BÁN HÀNG', { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(8);
    doc.text(`Mã HD: ${order.order_code}`);
    doc.text(`Ngày: ${new Date(order.createdAt).toLocaleString('vi-VN')}`);
    doc.text(`NV: ${order.seller?.name || 'N/A'}`);
    if (order.Customer) {
      doc.text(`KH: ${order.Customer.name}`);
    }

    doc.moveDown(0.3);
    doc.text('─'.repeat(30));

    for (const item of order.items) {
      doc.text(`${item.product_name}`);
      doc.text(`  ${item.quantity} x ${formatMoney(item.unit_price)} = ${formatMoney(item.total)}`);
    }

    doc.text('─'.repeat(30));
    doc.fontSize(8);
    doc.text(`Tạm tính: ${formatMoney(order.subtotal)}`, { align: 'right' });
    if (parseFloat(order.discount) > 0) {
      doc.text(`Giảm giá: -${formatMoney(order.discount)}`, { align: 'right' });
    }
    if (parseFloat(order.tax) > 0) {
      doc.text(`Thuế: +${formatMoney(order.tax)}`, { align: 'right' });
    }
    doc.fontSize(10).text(`TỔNG: ${formatMoney(order.total)}`, { align: 'right' });
    doc.fontSize(8);
    doc.text(`Thanh toán: ${formatMoney(order.amount_paid)}`, { align: 'right' });
    if (parseFloat(order.change_amount) > 0) {
      doc.text(`Tiền thừa: ${formatMoney(order.change_amount)}`, { align: 'right' });
    }
    doc.text(`Hình thức: ${getPaymentMethodLabel(order.payment_method)}`, { align: 'right' });

    doc.moveDown(1);
    doc.fontSize(8).text('Cảm ơn quý khách!', { align: 'center' });
    doc.text('Hẹn gặp lại!', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getInvoiceData = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Customer },
        { model: User, as: 'seller', attributes: ['id', 'name'] }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    res.json({
      store: {
        name: process.env.STORE_NAME || 'CỬA HÀNG BÁN LẺ',
        address: process.env.STORE_ADDRESS || '',
        phone: process.env.STORE_PHONE || ''
      },
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function getPaymentMethodLabel(method) {
  const labels = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ', debt: 'Công nợ' };
  return labels[method] || method;
}
