/**
 * 國立中興大學 ‧ 曾郁欣 - 個人介紹頁面專屬邏輯 (profile.js)
 * 包含：台灣即時時鐘系統、世界時區、農曆換算、Toast 通知
 */

// ==========================================
// 1. 時鐘狀態管理
// ==========================================
const clockState = {
  is24Hour: false,
  clockMode: 'digital', // 'digital' | 'analog' | 'dual'
};

// 取得精確台灣標準時間 (Asia/Taipei, UTC+8)
function getTaiwanDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

// 農曆歲次、民國紀年與節氣換算
function getLunarAndSeasonInfo(taiwanDate) {
  const month = taiwanDate.getMonth() + 1;
  let season = "秋天 • 碩果盈枝";
  if (month >= 3 && month <= 5) season = "春天 • 萬物欣榮";
  else if (month >= 6 && month <= 8) season = "夏天 • 綠樹濃蔭";
  else if (month >= 9 && month <= 11) season = "秋天 • 楓紅桂香";
  else season = "冬天 • 梅花傲雪";

  const year = taiwanDate.getFullYear();
  const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const earthlyBranches = ["子(鼠)", "丑(牛)", "寅(虎)", "卯(兔)", "辰(龍)", "巳(蛇)", "午(馬)", "未(羊)", "申(猴)", "酉(雞)", "戌(狗)", "亥(豬)"];
  const stem = heavenlyStems[(year - 4) % 10];
  const branch = earthlyBranches[(year - 4) % 12];

  return {
    seasonText: season,
    lunarText: `農曆歲次 ${stem}${branch}年`,
    rocYear: `民國 ${year - 1911} 年`
  };
}

// ==========================================
// 2. 主時鐘引擎
// ==========================================
function startClock() {
  const timeElem = document.getElementById("timeString");
  const elHours = document.getElementById("studentClockHours");
  const elMinutes = document.getElementById("studentClockMinutes");
  const elSeconds = document.getElementById("studentClockSeconds");
  const elMillis = document.getElementById("studentClockMillis");
  const elAmPm = document.getElementById("studentClockAmPm");
  const elProgressBar = document.getElementById("studentSecondProgressBar");

  const elHourHand = document.getElementById("studentAnalogHourHand");
  const elMinuteHand = document.getElementById("studentAnalogMinuteHand");
  const elSecondHand = document.getElementById("studentAnalogSecondHand");
  const elAnalogCaption = document.getElementById("studentAnalogCaptionTime");

  let lastSecond = -1;

  function renderClockLoop() {
    const twDate = getTaiwanDate();
    const hours24 = twDate.getHours();
    const minutes = twDate.getMinutes();
    const seconds = twDate.getSeconds();
    const millis = twDate.getMilliseconds();

    const isPm = hours24 >= 12;
    const hoursDisplay = clockState.is24Hour
      ? String(hours24).padStart(2, '0')
      : String(hours24 % 12 || 12).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    const msecStr = '.' + String(millis).padStart(3, '0');

    // 1. 頂部小時鐘
    if (timeElem) {
      const formatted = twDate.toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
      }) + " " + String(hours24).padStart(2, '0') + ":" + minStr + ":" + secStr;
      if (timeElem.textContent !== formatted) {
        timeElem.textContent = formatted;
      }
    }

    // 2. 電子數位鐘
    if (elHours && elHours.textContent !== hoursDisplay) elHours.textContent = hoursDisplay;
    if (elMinutes && elMinutes.textContent !== minStr) elMinutes.textContent = minStr;
    if (elSeconds && elSeconds.textContent !== secStr) elSeconds.textContent = secStr;
    if (elMillis) elMillis.textContent = msecStr;
    if (elAmPm) {
      elAmPm.textContent = clockState.is24Hour
        ? (hours24 < 12 ? '上午' : '下午')
        : (isPm ? '下午 PM' : '上午 AM');
    }

    // 分鐘進度條 (0% - 100%)
    if (elProgressBar) {
      const minuteProgress = ((seconds * 1000 + millis) / 60000) * 100;
      elProgressBar.style.width = `${minuteProgress.toFixed(1)}%`;
    }

    // 3. 擬物指針時鐘 (平滑旋轉計算)
    const hourDeg = (hours24 % 12 + minutes / 60 + seconds / 3600) * 30;
    const minDeg = (minutes + seconds / 60 + millis / 60000) * 6;
    const secDeg = (seconds + millis / 1000) * 6;

    if (elHourHand) elHourHand.style.transform = `rotate(${hourDeg}deg)`;
    if (elMinuteHand) elMinuteHand.style.transform = `rotate(${minDeg}deg)`;
    if (elSecondHand) elSecondHand.style.transform = `rotate(${secDeg}deg)`;
    if (elAnalogCaption) {
      elAnalogCaption.textContent = `${hoursDisplay}:${minStr}:${secStr} TST (UTC+8)`;
    }

    // 4. 每秒觸發一次日曆與世界時區更新
    if (seconds !== lastSecond) {
      lastSecond = seconds;
      updateCalendarAndWorldClocks(twDate);
    }

    requestAnimationFrame(renderClockLoop);
  }

  requestAnimationFrame(renderClockLoop);
}

// 更新日曆及世界五大時區
function updateCalendarAndWorldClocks(twDate) {
  const elDateGregorian = document.getElementById("studentDateGregorian");
  const elDateWeekday = document.getElementById("studentDateWeekday");
  const elDateLunar = document.getElementById("studentDateLunar");
  const elDateRoc = document.getElementById("studentDateRoc");
  const elDateDayYear = document.getElementById("studentDateDayYear");
  const elCurrentSeason = document.getElementById("studentCurrentSeasonTag");

  if (elDateGregorian) {
    const year = twDate.getFullYear();
    const month = String(twDate.getMonth() + 1).padStart(2, '0');
    const day = String(twDate.getDate()).padStart(2, '0');
    elDateGregorian.textContent = `${year} 年 ${month} 月 ${day} 日`;

    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    if (elDateWeekday) elDateWeekday.textContent = weekdays[twDate.getDay()];

    const startOfYear = new Date(Date.UTC(twDate.getFullYear(), 0, 1));
    const currentUTC = new Date(Date.UTC(twDate.getFullYear(), twDate.getMonth(), twDate.getDate()));
    const dayOfYear = Math.floor((currentUTC - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const weekNumber = Math.ceil(dayOfYear / 7);
    if (elDateDayYear) elDateDayYear.textContent = `第 ${dayOfYear} 天 • 第 ${weekNumber} 週`;

    const lunar = getLunarAndSeasonInfo(twDate);
    if (elDateLunar) elDateLunar.textContent = lunar.lunarText;
    if (elDateRoc) elDateRoc.textContent = lunar.rocYear;
    if (elCurrentSeason) elCurrentSeason.textContent = lunar.seasonText;
  }

  // 世界主要時區更新
  const worldZones = [
    { tz: 'Asia/Taipei', timeId: 'worldTimeTaiwan', dateId: 'worldDateTaiwan' },
    { tz: 'Asia/Tokyo', timeId: 'worldTimeTokyo', dateId: 'worldDateTokyo' },
    { tz: 'Europe/London', timeId: 'worldTimeLondon', dateId: 'worldDateLondon' },
    { tz: 'America/New_York', timeId: 'worldTimeNewYork', dateId: 'worldDateNewYork' },
    { tz: 'Australia/Sydney', timeId: 'worldTimeSydney', dateId: 'worldDateSydney' }
  ];

  worldZones.forEach(item => {
    const tElem = document.getElementById(item.timeId);
    const dElem = document.getElementById(item.dateId);
    if (tElem && dElem) {
      try {
        const timeFmt = new Intl.DateTimeFormat('zh-TW', {
          timeZone: item.tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const dateFmt = new Intl.DateTimeFormat('zh-TW', {
          timeZone: item.tz,
          month: '2-digit',
          day: '2-digit',
          weekday: 'short'
        });
        tElem.textContent = timeFmt.format(new Date());
        dElem.textContent = dateFmt.format(new Date());
      } catch (e) {
        // ignore format error
      }
    }
  });
}

// ==========================================
// 3. 時鐘控制按鈕（電子 / 指針 / 雙模、12H/24H、複製時間）
// ==========================================
function setupClockControls() {
  const btnDigital = document.getElementById("btnClockDigital");
  const btnAnalog = document.getElementById("btnClockAnalog");
  const btnDual = document.getElementById("btnClockDual");
  const digitalView = document.getElementById("studentDigitalView");
  const analogView = document.getElementById("studentAnalogView");
  const viewsWrapper = document.getElementById("clockViewsWrapper");
  const btn1224 = document.getElementById("btnStudentToggleFormat");
  const btnCopyTime = document.getElementById("btnCopyTaiwanTime");

  function setMode(mode) {
    clockState.clockMode = mode;
    [btnDigital, btnAnalog, btnDual].forEach(b => b?.classList.remove("active"));

    if (mode === "digital") {
      btnDigital?.classList.add("active");
      viewsWrapper?.classList.remove("dual-clocks-wrapper");
      if (digitalView) digitalView.style.display = "block";
      if (analogView) analogView.style.display = "none";
    } else if (mode === "analog") {
      btnAnalog?.classList.add("active");
      viewsWrapper?.classList.remove("dual-clocks-wrapper");
      if (digitalView) digitalView.style.display = "none";
      if (analogView) analogView.style.display = "flex";
    } else if (mode === "dual") {
      btnDual?.classList.add("active");
      viewsWrapper?.classList.add("dual-clocks-wrapper");
      if (digitalView) digitalView.style.display = "block";
      if (analogView) analogView.style.display = "flex";
    }
  }

  btnDigital?.addEventListener("click", () => setMode("digital"));
  btnAnalog?.addEventListener("click", () => setMode("analog"));
  btnDual?.addEventListener("click", () => setMode("dual"));

  // 12H / 24H 制切換
  btn1224?.addEventListener("click", () => {
    clockState.is24Hour = !clockState.is24Hour;
    btn1224.textContent = clockState.is24Hour ? "切換 12H 制" : "切換 24H 制";
  });

  // 複製時間戳記
  btnCopyTime?.addEventListener("click", () => {
    const twDate = getTaiwanDate();
    const formatted = twDate.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long"
    }) + " " + twDate.toLocaleTimeString("zh-TW", { hour12: false }) + " (Asia/Taipei, UTC+8)";

    navigator.clipboard.writeText(formatted).then(() => {
      showToast("已複製目前台灣標準時間：" + formatted);
    }).catch(() => {
      showToast("已成功選取台灣標準時間！");
    });
  });
}

// ==========================================
// 4. Toast 提示通知
// ==========================================
function showToast(msg) {
  const toast = document.getElementById("toastNotice");
  const toastMsg = document.getElementById("toastMsg");
  if (!toast) return;
  if (toastMsg) toastMsg.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// ==========================================
// 5. 初始化執行
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  setupClockControls();
});
