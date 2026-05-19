/* ===== API_URL ===== */
window.api_url = "https://script.google.com/macros/s/AKfycbx2Q81YeC69I9_Lsyvty_CCOZ-Gza8M9rlD7eI3NXiVffVtXyvf-LZ9m1Aij-6AKbY86Q/exec";

/* ===== min Tools ===== */
window.epoch = Date.UTC(1899,11,30);
window.now = "";
function tick() {
  const sbT = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  now = sbT.format(new Date());
}
tick();
setInterval(tick, 1000);

window.mins = 0;
function tick2() { mins = Number(now.slice(11, 13)) * 60 + Number(now.slice(14, 16)); }
tick2();
setInterval(tick2, 60000);

// 依 序號 轉 yyyy/mn/dd ✔
window.serialToYMD = function(serial) {
  const date = new Date(epoch + (serial * 86400000));
  const yyyy = date.getFullYear();
  const m2 = String(date.getMonth() + 1).padStart(2, "0");
  const d2 = String(date.getDate()).padStart(2, "0");
  return `${yyyy}/${m2}/${d2}`;
}

// 依 yyyy/mm/dd 取日期序號
window.ymdToSerial = function(Ntime){
  const ymd = Ntime.slice(0, 10);
  const [y,m,d] = ymd.split('/').map(Number);
  return ((Date.UTC(y, m-1, d) - epoch) / 86400000);
}

// 依 序號 轉 mn/dd ✔
window.serialToMD = function(sexsb) {
  const date = new Date(epoch + (sexsb * 86400000));
  const y4 = date.getFullYear();
  const m2 = String(date.getMonth() + 1).padStart(2, "0");
  const d2 = String(date.getDate()).padStart(2, "0");
  return `${m2}/${d2}`;
}

// yyyy/mm/dd → yyyymm ✔
window.ymdToYM = function(Ntime){
  //const ymd = Ntime.slice(0, 10);
  const [y, m, d] = Ntime.split('/');
  return Number(y + m.padStart(2,'0'));
}