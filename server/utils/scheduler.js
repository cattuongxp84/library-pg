const cron = require('node-cron');
const { Op } = require('sequelize');
const { Borrow } = require('../models');

const scheduleOverdueCheck = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const [count] = await Borrow.update(
        { status: 'overdue' },
        { where: { status: { [Op.in]: ['borrowed','renewed'] }, due_date: { [Op.lt]: new Date() } } }
      );
      console.log(`[Scheduler] Marked ${count} borrows as overdue`);
    } catch (err) {
      console.error('[Scheduler] Error:', err.message);
    }
  });
  console.log('[Scheduler] Overdue check scheduled');
};

module.exports = { scheduleOverdueCheck };
