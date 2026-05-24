/**
 * 巡檢人員點檢確認表{記錄} - GAS
 * Version: v0.3.2
 * 人員主檔：A id、B pass、C name、D shift、E active、F admin
 * 表單記錄：sh
 */
const SPREADSHEET_ID = '1TCEeGdAQvRTuxdknDeGKRXAbYS8iTYdda2XybPqDzNY';

const SH_USER = 'id';
const SH_FORM = 'sh';
const FORM_ITEM_COUNT = 24;
const LOCK_USER_MS = 10000;
const LOCK_WRITE_MS = 60000;
const LOCK_MAINT_MS = 180000;

function doGet(e) {
  return json_({
    //version: 'v0.3.2',
    //ts: new Date().toISOString(),
    action: 'gas_alive',
	status: 'ok'
  });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = String(p.action || '').trim();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === 'auth') {
      return routeAuth_(p, ss, SH_USER);
    }

    if (action === 'form_write') {
      return routeFormWrite_(p, ss, SH_FORM);
    }

    if (action === 'form_upData') {
	  return routeFormUpdate_(p, ss, SH_FORM);
    }

    if (action === 'mail_send') {
      return routeMailSend_(p, ss, SH_FORM);
    }

    if (action === 'personnel_save') {
      return routePersonnelSave_(p, ss, SH_USER);
    }

    if (action === 'personnel_delete') {
      return routePersonnelDelete_(p, ss, SH_USER);
    }

    return json_({ status: 'error', action: action || '', msg: 'unknown_action' });

  } catch (err) {
    return json_({
      status: 'error',
      action: 'system',
      msg: String(err && err.message ? err.message : err)
    });
  }
}

function routeAuth_(p, ss, sheetName) {
  const id = normalizeId_(p.id);
  const pass = String(p.pass || '').trim();

  if (!isValidId_(id)) return json_({ status: 'error', action: 'auth', msg: 'invalid_id' });
  if (!isValidPass_(pass)) return json_({ status: 'error', action: 'auth', msg: 'invalid_pass' });

  const user = findUserById_(id, ss, sheetName);

  if (!user) return json_({ status: 'error', action: 'auth', msg: 'auth_failed' });
  if (String(user.pass || '') !== pass) return json_({ status: 'error', action: 'auth', msg: 'auth_failed' });
  if (user.active !== true) return json_({ status: 'error', action: 'auth', msg: 'account_disabled' });

  return json_({
    action: 'auth',
    fields: ['id', 'name', 'shift', 'admin'],
    values: [user.id, user.name, user.shift, user.admin],
	status: 'ok'
  });
}

function routePersonnelSave_(p, ss, sheetName) {
  const adminId = normalizeId_(p.admin_id);
  const adminPass = String(p.admin_pass || '').trim();
  const id = normalizeId_(p.id);
  const pass = String(p.pass || '').trim();
  const name = String(p.name || '').trim();
  const shift = String(p.shift || '').trim().toUpperCase();

  const admin = findUserById_(adminId, ss, sheetName);

  if (!admin) return json_({ status: 'error', action: 'personnel_save', msg: 'admin_auth_failed' });
  if (String(admin.pass || '') !== adminPass) return json_({ status: 'error', action: 'personnel_save', msg: 'admin_auth_failed' });
  if (admin.active !== true) return json_({ status: 'error', action: 'personnel_save', msg: 'admin_auth_failed' });
  if (admin.admin !== true) return json_({ status: 'error', action: 'personnel_save', msg: 'no_admin_permission' });

  if (!isValidId_(id)) return json_({ status: 'error', action: 'personnel_save', msg: 'invalid_id' });
  if (!isValidPass_(pass)) return json_({ status: 'error', action: 'personnel_save', msg: 'invalid_pass' });
  if (name.length <= 1) return json_({ status: 'error', action: 'personnel_save', msg: 'invalid_name' });
  if (!/^(A|B|C)$/.test(shift)) return json_({ status: 'error', action: 'personnel_save', msg: 'invalid_shift' });

  return withLock_(LOCK_USER_MS, 'personnel_save', function () {
    const sh = getSheet_(ss, sheetName);
    const lastRow = sh.getLastRow();
    let foundRow = 0;

    if (lastRow >= 2) {
      const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (normalizeId_(ids[i][0]) === id) {
          foundRow = i + 2;
          break;
        }
      }
    }

    let mode = '';

    if (foundRow > 0) {
      sh.getRange(foundRow, 2, 1, 3).setValues([[pass, name, shift]]);
      mode = 'update';
    } else {
      sh.appendRow([id, pass, name, shift, 'TRUE']);
      mode = 'insert';
    }

    return json_({
      status: 'ok',
      action: 'personnel_save',
      fields: ['mode', 'id', 'name', 'shift'],
      values: [mode, id, name, shift]
    });
  });
}

function routePersonnelDelete_(p, ss, sheetName) {
  const adminId = normalizeId_(p.admin_id);
  const adminPass = String(p.admin_pass || '').trim();
  const targetId = normalizeId_(p.target_id);

  const admin = findUserById_(adminId, ss, sheetName);

  if (!admin) return json_({ status: 'error', action: 'personnel_delete', msg: 'admin_auth_failed' });
  if (String(admin.pass || '') !== adminPass) return json_({ status: 'error', action: 'personnel_delete', msg: 'admin_auth_failed' });
  if (admin.active !== true) return json_({ status: 'error', action: 'personnel_delete', msg: 'admin_auth_failed' });
  if (admin.admin !== true) return json_({ status: 'error', action: 'personnel_delete', msg: 'no_admin_permission' });
  if (!isValidId_(targetId)) return json_({ status: 'error', action: 'personnel_delete', msg: 'invalid_target_id' });

  return withLock_(LOCK_USER_MS, 'personnel_delete', function () {
    const target = findUserById_(targetId, ss, sheetName);

    if (!target) return json_({ status: 'error', action: 'personnel_delete', msg: 'target_not_found' });
    if (target.admin === true) return json_({ status: 'error', action: 'personnel_delete', msg: 'target_is_admin_forbidden' });

    const sh = getSheet_(ss, sheetName);
    sh.getRange(target.row, 5).setValue('FALSE');

    return json_({
      action: 'personnel_delete',
      fields: ['id', 'active'],
      values: [target.id, 'FALSE'],
	  status: 'ok'
    });
  });
}

function routeFormWrite_(p, ss, sheetName) {
  return withLock_(LOCK_WRITE_MS, 'form_write', function () {
    const sh = getSheet_(ss, sheetName);

	const record_id = Utilities.getUuid();
    const gasTimeText = Utilities.formatDate(
      new Date(),
      'Asia/Taipei',
      'yyyy/MM/dd HH:mm:ss'
    );

    const row = [
	  record_id,		// uuid | Google GAS 隨機生成
      gasTimeText,		// GAS 時間(UTC +8:00)
      param_(p, 'date'),
      param_(p, 'shift'),
      param_(p, 'machine_id'),
      param_(p, 'id'),
      param_(p, 'name'),
      param_(p, 'routine_check')
    ];

    for (let i = 1; i <= FORM_ITEM_COUNT; i++) {
      row.push(param_(p, 'item_' + pad2_(i)));
    }

    sh.appendRow(row);

    return json_({
	  record_id: record_id,
      action: 'form_write',
      status: 'ok'
    });
  });
}

function routeFormUpdate_(p, ss, sheetName) {
  return withLock_(LOCK_WRITE_MS, 'form_update', function () {
    const sh = getSheet_(ss, sheetName);
    const record_id = String(param_(p, 'record_id') || '').trim();

    if (!record_id) {
      return json_({
        action: 'form_update',
        msg: 'missing_record',
		status: 'error'
      });
    }

    const targetRow = findFormRecordRow_(sh, record_id);

    if (targetRow <= 0) {
      return json_({
        action: 'form_update',
        msg: 'record_not_found',
        record_id: record_id,
		status: 'error'
      });
    }

    const gasTimeText = Utilities.formatDate(
      new Date(),
      'Asia/Taipei',
      'yyyy/MM/dd HH:mm:ss'
    );

    const values = [gasTimeText].concat(buildFormDataValues_(p));

    sh.getRange(targetRow, 2, 1, values.length).setValues([values]);

    return json_({
      action: 'form_update',
      record_id: record_id,
      row_index: targetRow,
      server_time: gasTimeText,
	  status: 'ok',
    });
  });
}

function findFormRecordRow_(sh, record_id) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;

  const values = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === record_id) {
      return i + 2;
    }
  }

  return 0;
}

function buildFormDataValues_(p) {
  const row = [
    param_(p, 'date'),
    param_(p, 'shift'),
    param_(p, 'machine_id'),
    param_(p, 'name'),
    param_(p, 'routine_check')
  ];

  for (let i = 1; i <= FORM_ITEM_COUNT; i++) {
    row.push(param_(p, 'item_' + pad2_(i)));
  }

  return row;
}

function routeMailSend_(p, ss, sheetName) {
  return json_({
    action: 'mail_send',
    msg: 'route_ready',
	status: 'error'
  });
}

function routeFormDelete_(p, ss, sheetName) {
  return withLock_(LOCK_MAINT_MS, 'form_delete', function () {
    const sh = getSheet_(ss, sheetName);

    return json_({
      action: 'form_delete',
      sheet: sh.getName(),
      msg: 'route_ready',
	  status: 'error'
    });
  });
}

function withLock_(waitMs, actionName, callback) {
  const lock = LockService.getScriptLock();
  let locked = false;
  let stage = 'lock_wait';

  try {
    lock.waitLock(waitMs);
    locked = true;

    stage = 'callback';
    return callback();

  } catch (err) {
    return json_({
      action: actionName || '',
      msg: 'lock_or_task_failed',
      stage: stage,
      detail: String(err && err.message ? err.message : err),
	  status: 'error'
    });

  } finally {
    if (locked) {
      try {
        lock.releaseLock();
      } catch (releaseErr) {}
    }
  }
}

function getSheet_(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('sheet_not_found:' + sheetName);
  return sh;
}

function findUserById_(id, ss, sheetName) {
  id = normalizeId_(id);
  if (!isValidId_(id)) return null;

  const sh = getSheet_(ss, sheetName);
  const lastRow = sh.getLastRow();

  if (lastRow < 2) return null;

  const values = sh.getRange(2, 1, lastRow - 1, 6).getValues();

  for (let i = 0; i < values.length; i++) {
    const rowId = normalizeId_(values[i][0]);

    if (rowId === id) {
      return {
        row: i + 2,
        id: rowId,
        pass: String(values[i][1] || ''),
        name: String(values[i][2] || ''),
        shift: String(values[i][3] || '').trim().toUpperCase(),
        active: parseActive_(values[i][4]),
        admin: parseBool_(values[i][5])
      };
    }
  }

  return null;
}

function param_(obj, key) {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) {
    return '';
  }

  const value = obj[key];
  return value === null || value === undefined ? '' : String(value);
}

function pad2_(n) {
  return String(n).padStart(2, '0');
}

function normalizeId_(v) {
  return String(v || '').trim().toUpperCase();
}

function isValidId_(v) {
  return /^[A-Z0-9]{5}$/.test(String(v || ''));
}

function isValidPass_(v) {
  return /^[A-Za-z0-9]+$/.test(String(v || ''));
}

function parseBool_(v) {
  if (v === true) return true;

  const s = String(v || '').trim().toUpperCase();

  return s === 'TRUE' || s === '1';
}

function parseActive_(v) {
  if (v === false) return false;

  const s = String(v || '').trim().toUpperCase();

  if (s === 'TRUE' || s === '1') return true;

  return false;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}