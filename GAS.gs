/**
 * 巡檢人員點檢確認表{記錄} - 人員驗證 GAS
 * Version: v0.2.7
 * 規則：doGet 保留伺服器存活驗證；doPost 依單一 action 跳子函式。
 * 前端使用 application/x-www-form-urlencoded / URLSearchParams。
 * 人員主檔欄位：A id、B pass、C name、D shift、E active、F admin。
 */

const GAS_VERSION = 'v0.2.7';
const SPREADSHEET_ID = '1TCEeGdAQvRTuxdknDeGKRXAbYS8iTYdda2XybPqDzNY';
const USER_SHEET_NAME = 'id';

function doGet(e) {
  return json_({
    status: 'ok',
    action: 'gas_alive',
    version: GAS_VERSION,
    ts: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = String(p.action || '').trim();

    if (action === 'ping') {
      return routePing_(p);
    }

    if (action === 'auth') {
      return routeAuth_(p);
    }

    if (action === 'personnel_save') {
      return routePersonnelSave_(p);
    }

    if (action === 'personnel_delete') {
      return routePersonnelDelete_(p);
    }

    if (action === 'form_write') {
      return routeFormWrite_(p);
    }

    return json_({ status: 'error', action: action || '', msg: 'unknown_action' });
  } catch (err) {
    return json_({ status: 'error', action: 'system', msg: String(err && err.message ? err.message : err) });
  }
}

function routePing_(p) {
  return json_({
    status: 'ok',
    action: 'ping',
    fields: ['version', 'server_time'],
    values: [GAS_VERSION, Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm:ss')]
  });
}




function routeFormWrite_(p) {
  return json_({
    status: 'ok',
    action: 'form_write',
    fields: ['result'],
    values: ['interface_ready']
  });
}

function getUserSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(USER_SHEET_NAME);
  if (!sh) throw new Error('user_sheet_not_found');
  return sh;
}

function findUserById_(id) {
  id = normalizeId_(id);
  if (!isValidId_(id)) return null;
  const sh = getUserSheet_();
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
  return s === 'TRUE' || s === 'Y' || s === 'YES' || s === '1' || s === '是';
}

function parseActive_(v) {
  if (v === false) return false;
  const s = String(v || '').trim().toUpperCase();
  if (s === '' || s === 'TRUE' || s === 'Y' || s === 'YES' || s === '1' || s === '是') return true;
  if (s === 'FALSE' || s === 'N' || s === 'NO' || s === '0' || s === '否') return false;
  return true;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}