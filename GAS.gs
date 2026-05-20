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

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}