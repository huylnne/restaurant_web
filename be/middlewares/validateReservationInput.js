const MAX_GUESTS = 50;
const NOTE_MAX_LEN = 500;

function rejectUnexpectedKeys(body, allowedKeys) {
  const extra = Object.keys(body || {}).filter((k) => !allowedKeys.includes(k));
  if (extra.length > 0) {
    return `Trường không hợp lệ: ${extra.join(', ')}`;
  }
  return null;
}

const validateCreateReservationBody = (req, res, next) => {
  const allowed = ['reservation_time', 'number_of_guests', 'table_id', 'branch_id', 'note'];
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
    return res.status(400).json({ message: `Số khách phải từ 1 đến ${MAX_GUESTS}` });
  }

  if (req.body.table_id != null && req.body.table_id !== '') {
    const tableId = Number(req.body.table_id);
    if (!Number.isInteger(tableId) || tableId < 1) {
      return res.status(400).json({ message: 'Bàn không hợp lệ' });
    }
    req.body.table_id = tableId;
  } else {
    req.body.table_id = undefined;
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

module.exports = { validateCreateReservationBody };
