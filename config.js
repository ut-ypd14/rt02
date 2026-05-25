	/* ===== API_URL ===== */
	window.api_url = "https://script.google.com/macros/s/AKfycbyjWHFBi-mroT1O2CbwpehxVVx0VCdFhsWiZL162ZhT38Xyf3PqfRJlSa8v0W7CZY45Yg/exec";

	/* ===== min Tools ===== */
	window.epoch = Date.UTC(1899,11,30);
 window.CFG_time = 0;
	window.CFG_now = "";
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
	function tick() {
  	window.CFG_time = Date.now();
	  window.CFG_now = sbT.format(window.CFG_time);
	}
	tick();
	setInterval(tick, 1000);

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
