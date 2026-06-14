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


	// GAS 2號機 ping 狀態燈
	window.status_api_url = "https://script.google.com/macros/s/AKfycbzRWO2yy2qsck9qPufqDgrXuFlfUjGa_dZwOyJts5GQsIrbDVi_pmabK_aew7EERUAB/exec";

window.gasStatus = async function(){
  const key = 'PI_GAS_STATUS_CACHE_V001';
  const ttl = 60000;
  const now = Date.now();

  try{
    const old = JSON.parse(localStorage.getItem(key) || 'null');
    if (old && old.r && now - Number(old.t || 0) < ttl){
      old.r.cached = true;
      return old.r;
    }
  }catch(err){}

  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(function(){
    controller.abort();
  }, 6000);

  try{
    const res = await fetch(window.status_api_url, {
      method:'GET',
      cache:'no-store',
      signal:controller.signal
    });

    const ms = Math.round(performance.now() - start);
    const data = JSON.parse(await res.text());

    const ok = !!(
      res.ok &&
      String(data.status || '').toLowerCase() === 'ok' &&
      data.proxy_ok === true &&
      data.main_ok === true
    );

    const result = {
      ok: ok,
      state: ok ? 'ok' : 'bad',
      text: ok ? ('GAS 正常 ' + ms + 'ms') : 'GAS 異常',
      ms: ms,
      data: data,
      cached: false
    };

    localStorage.setItem(key, JSON.stringify({
      t: Date.now(),
      r: result
    }));

    return result;

  }catch(err){
    const result = {
      ok:false,
      state:'bad',
      text:'GAS 無回應或逾時',
      ms:Math.round(performance.now() - start),
      cached:false
    };

    localStorage.setItem(key, JSON.stringify({
      t:Date.now(),
      r:result
    }));

    return result;

  }finally{
    clearTimeout(timer);
  }
};