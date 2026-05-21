/**
 * 巡檢人員點檢確認表 - form_write 路由子函式
 * Version: v0.2.4-gas.2
 *
 * 直接套用版：
 * - 不宣告 PI_FORM_* 這類額外全域共用變數，避免與主檔共用變數打架。
 * - 維持本專案 route 子函式型態：doPost(e) 依 action 分流到 routeFormWrite_(e)。
 * - 寫入工作表固定為 "sh"。
 * - A欄由 GAS 伺服器時間產生，轉 Asia/Taipei 後寫入字串 yyyy/MM/dd HH:mm:ss。
 * - 使用 lock.waitLock() 排隊寫入。
 * - GAS 不做內容驗證，只依前端傳入欄位寫入。
 *
 * 欄位：
 * A = GAS 台北時間字串
 * B = date          // 前端 v0.2.4 已轉日期序號
 * C = shift
 * D = machine_id
 * E = name
 * F:AC = item_01 ~ item_24
 */

function routeFormWrite_(e) {
  var p = e && e.parameter ? e.parameter : {};

  return withInspectionLock_(30000, function () {
    var sh = getInspectionRecordSheet_('sh');

    var nowText = Utilities.formatDate(
      new Date(),
      'Asia/Taipei',
      'yyyy/MM/dd HH:mm:ss'
    );

    var row = [
      nowText,
      pickParam_(p, 'date'),
      pickParam_(p, 'shift'),
      pickParam_(p, 'machine_id'),
      pickParam_(p, 'name')
    ];

    for (var i = 1; i <= 24; i++) {
      row.push(pickParam_(p, 'item_' + pad2_(i)));
    }

    sh.appendRow(row);

    return jsonOutput_({
      status: 'ok'
    });

  }, 'write_failed');
}

/**
 * 給定期維護 / 批次清理使用。
 * 維護作業可能比一般寫入更久，所以等待時間拉到 120 秒。
 *
 * 使用方式：
 * return withInspectionMaintenanceLock_(function () {
 *   // 維護、批次刪除、清理、備份後處理
 *   return jsonOutput_({ status: 'ok' });
 * });
 */
function withInspectionMaintenanceLock_(callback) {
  return withInspectionLock_(120000, callback, 'maintenance_failed');
}

function withInspectionLock_(waitMs, callback, failMsg) {
  var lock = LockService.getScriptLock();
  var locked = false;

  try {
    lock.waitLock(waitMs);
    locked = true;
    return callback();

  } catch (err) {
    return jsonOutput_({
      status: 'error',
      msg: failMsg || 'lock_failed'
    });

  } finally {
    if (locked) {
      try {
        lock.releaseLock();
      } catch (releaseErr) {
        // 安全釋放；不覆蓋原本回傳。
      }
    }
  }
}

function getInspectionRecordSheet_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('spreadsheet_not_found');
  }

  var sh = ss.getSheetByName(sheetName);
  if (!sh) {
    throw new Error('sheet_not_found:' + sheetName);
  }

  return sh;
}

function pickParam_(params, key) {
  if (!params || !Object.prototype.hasOwnProperty.call(params, key)) {
    return '';
  }

  var value = params[key];
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function pad2_(n) {
  return String(n).padStart(2, '0');
}

/**
 * 若你的主檔已經有 jsonOutput_(obj)，且內容一致，可保留其中一份即可。
 */
function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}