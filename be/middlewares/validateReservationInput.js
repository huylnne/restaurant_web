const { MAX_GUESTS } = require('../config/restaurantRules');
const NOTE_MAX_LEN = 500;

function rejectUnexpectedKeys(body, allowedKeys) {
  const extra = Object.keys(body || {}).filter((k) => !allowedKeys.includes(k));
  if (extra.length > 0) {
    return `Trường không hợp lệ: ${extra.join(', ')}`;
  }
  return null;
}

const validateCreateReservationBody = (req, res, next) => {
  const allowed = [
    'reservation_time',
    'number_of_guests',
    'branch_id',
    'note',
    'captcha_id',
    'captcha_answer',
  ];
  const extraErr = rejectUnexpectedKeys(req.body, allowed);
  if (extraErr) return res.status(400).json({ message: extraErr });

  if (req.body.note != null && req.body.note !== '') {
    const note = String(req.body.note).trim();
    if (note.length > NOTE_MAX_LEN) {
      return res.status(400).json({ message: `Ghi chú tối đa ${NOTE_MAX_LEN} ký tự` });
    }
    req.body.note = note || null;
  } else {
    req.body.note = null;
  }

  const guests = Number(req.body.number_of_guests);
  if (!Number.isFinite(guests) || guests < 1 || guests > MAX_GUESTS) {
    return res.status(400).json({
      message: `Đặt bàn online tối đa ${MAX_GUESTS} khách. Nhóm lớn vui lòng gọi trực tiếp để nhà hàng xác nhận và đặt cọc.`,
    });
  }

  if (req.body.branch_id != null && req.body.branch_id !== '') {
    const branchId = Number(req.body.branch_id);
    if (!Number.isInteger(branchId) || branchId < 1) {
      return res.status(400).json({ message: 'Chi nhánh không hợp lệ' });
    }
    req.body.branch_id = branchId;
  }

  req.body.number_of_guests = guests;
  next();
};

module.exports = { validateCreateReservationBody, MAX_GUESTS };
