/**
 * 曾郁欣 | 國立中興大學 - 台灣即時時間與個人首頁
 * Core Application Engine: Taiwan NTP Clock, Canvas Stars, Pomodoro, Quotes & Themes
 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const state = {
    is24Hour: true,
    isAudioEnabled: false,
    clockMode: 'digital', // 'digital' | 'analog'
    audioCtx: null,
    pomo: {
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      isRunning: false,
      isBreak: false,
      timerId: null
    }
  };

  // --- DOM ELEMENTS CACHE ---
  const el = {
    // Header mini clock
    miniTimeDisplay: document.getElementById('mini-time-display'),
    
    // Digital Clock
    clockHours: document.getElementById('clock-hours'),
    clockMinutes: document.getElementById('clock-minutes'),
    clockSeconds: document.getElementById('clock-seconds'),
    clockMillis: document.getElementById('clock-millis'),
    clockAmPm: document.getElementById('clock-ampm'),
    secondProgressBar: document.getElementById('second-progress-bar'),
    btnToggleFormat: document.getElementById('btn-toggle-format'),

    // Date display
    dateGregorian: document.getElementById('date-display-gregorian'),
    dateWeekday: document.getElementById('date-display-weekday'),
    dateLunar: document.getElementById('date-display-lunar'),
    dateDayYear: document.getElementById('date-display-dayyear'),
    currentSeasonTag: document.getElementById('current-season-tag'),

    // Clock Views
    digitalClockView: document.getElementById('digital-clock-view'),
    analogClockView: document.getElementById('analog-clock-view'),
    btnModeDigital: document.getElementById('btn-mode-digital'),
    btnModeAnalog: document.getElementById('btn-mode-analog'),

    // Analog Hands
    analogHourHand: document.getElementById('analog-hour-hand'),
    analogMinuteHand: document.getElementById('analog-minute-hand'),
    analogSecondHand: document.getElementById('analog-second-hand'),
    analogCaptionTime: document.getElementById('analog-caption-time'),

    // World clocks
    worldTaiwan: document.getElementById('world-clock-taiwan'),
    worldDateTaiwan: document.getElementById('world-date-taiwan'),
    worldTokyo: document.getElementById('world-clock-tokyo'),
    worldDateTokyo: document.getElementById('world-date-tokyo'),
    worldLondon: document.getElementById('world-clock-london'),
    worldDateLondon: document.getElementById('world-date-london'),
    worldNewYork: document.getElementById('world-clock-newyork'),
    worldDateNewYork: document.getElementById('world-date-newyork'),
    worldSydney: document.getElementById('world-clock-sydney'),
    worldDateSydney: document.getElementById('world-date-sydney'),

    // Theme & Audio & Fullscreen
    btnThemeMenu: document.getElementById('btn-theme-menu'),
    themeDropdown: document.getElementById('theme-dropdown'),
    themeOptions: document.querySelectorAll('.theme-option'),
    btnAudioToggle: document.getElementById('btn-audio-toggle'),
    iconSoundOff: document.getElementById('icon-sound-off'),
    iconSoundOn: document.getElementById('icon-sound-on'),
    btnFullscreenToggle: document.getElementById('btn-fullscreen-toggle'),
    btnZenMode: document.getElementById('btn-zen-mode'),
    btnCopyTimestamp: document.getElementById('btn-copy-timestamp'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),

    // Pomodoro
    pomoMinutes: document.getElementById('pomo-minutes'),
    pomoSeconds: document.getElementById('pomo-seconds'),
    pomoStatus: document.getElementById('pomo-status'),
    pomoProgressFill: document.getElementById('pomo-progress-fill'),
    btnPomoStart: document.getElementById('btn-pomo-start'),
    pomoBtnText: document.getElementById('pomo-btn-text'),
    btnPomoReset: document.getElementById('btn-pomo-reset'),
    btnPomoMode: document.getElementById('btn-pomo-mode'),

    // Quotes
    quoteText: document.getElementById('quote-text'),
    quoteAuthor: document.getElementById('quote-author'),
    btnRefreshQuote: document.getElementById('btn-refresh-quote'),
    btnCopyQuote: document.getElementById('btn-copy-quote'),

    // Footer
    footerYear: document.getElementById('footer-year')
  };

  // --- TIMEZONE UTILITIES ---
  /**
   * Get precise Taiwan Time (Asia/Taipei, UTC+8)
   */
  function getTaiwanDate() {
    const now = new Date();
    // Taiwan is strictly UTC+8 year-round with no Daylight Saving Time
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 8));
  }

  /**
   * Approximate Lunar date and solar terms for display
   */
  function getLunarAndSeasonInfo(taiwanDate) {
    const month = taiwanDate.getMonth() + 1; // 1-12
    const day = taiwanDate.getDate();

    // Solar seasons
    let season = "秋天 • 碩果盈枝";
    if (month >= 3 && month <= 5) season = "春天 • 萬物欣榮";
    else if (month >= 6 && month <= 8) season = "夏天 • 綠樹濃蔭";
    else if (month >= 9 && month <= 11) season = "秋天 • 楓紅桂香";
    else season = "冬天 • 梅花傲雪";

    // Traditional Chinese lunar calendar calculation approximation
    const lunarMonths = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "臘月"];
    const lunarDays = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", 
                       "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
                       "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
    
    // Approximate cyclical stem-branch
    const year = taiwanDate.getFullYear();
    const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const earthlyBranches = ["子(鼠)", "丑(牛)", "寅(虎)", "卯(兔)", "辰(龍)", "巳(蛇)", "午(馬)", "未(羊)", "申(猴)", "酉(雞)", "戌(狗)", "亥(豬)"];
    const stem = heavenlyStems[(year - 4) % 10];
    const branch = earthlyBranches[(year - 4) % 12];

    return {
      seasonText: season,
      lunarText: `農曆歲次 ${stem}${branch}年`
    };
  }

  // --- AUDIO SYNTHESIZER ---
  function playTickSound() {
    if (!state.isAudioEnabled) return;
    try {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, state.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, state.audioCtx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.04, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(state.audioCtx.destination);
      osc.start();
      osc.stop(state.audioCtx.currentTime + 0.035);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  function playChime() {
    try {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0, state.audioCtx.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.08, state.audioCtx.currentTime + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + idx * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(state.audioCtx.destination);
        osc.start(state.audioCtx.currentTime + idx * 0.12);
        osc.stop(state.audioCtx.currentTime + idx * 0.12 + 0.6);
      });
    } catch (e) {
      console.warn("Chime error:", e);
    }
  }

  // --- CLOCK RENDER LOOP ---
  let lastSecond = -1;

  function updateClock() {
    const twDate = getTaiwanDate();
    const hours24 = twDate.getHours();
    const minutes = twDate.getMinutes();
    const seconds = twDate.getSeconds();
    const millis = twDate.getMilliseconds();

    // 12h vs 24h calculations
    const isPm = hours24 >= 12;
    const hoursDisplay = state.is24Hour 
      ? String(hours24).padStart(2, '0') 
      : String(hours24 % 12 || 12).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    const msecStr = '.' + String(millis).padStart(3, '0');

    // Update Digital Display
    if (el.clockHours.textContent !== hoursDisplay) el.clockHours.textContent = hoursDisplay;
    if (el.clockMinutes.textContent !== minStr) el.clockMinutes.textContent = minStr;
    if (el.clockSeconds.textContent !== secStr) el.clockSeconds.textContent = secStr;
    el.clockMillis.textContent = msecStr;

    // AM/PM
    el.clockAmPm.textContent = state.is24Hour ? (hours24 < 12 ? '上午' : '下午') : (isPm ? '下午 PM' : '上午 AM');

    // Header Mini Clock
    const miniTime = `${hoursDisplay}:${minStr}:${secStr}`;
    if (el.miniTimeDisplay.textContent !== miniTime) {
      el.miniTimeDisplay.textContent = miniTime;
    }

    // Fluid progress of the current minute (0% - 100%)
    const minuteProgress = ((seconds * 1000 + millis) / 60000) * 100;
    el.secondProgressBar.style.width = `${minuteProgress.toFixed(2)}%`;

    // Analog Clock Hands (Smooth sweep)
    const hourDeg = (hours24 % 12 + minutes / 60 + seconds / 3600) * 30;
    const minDeg = (minutes + seconds / 60 + millis / 60000) * 6;
    const secDeg = (seconds + millis / 1000) * 6;

    el.analogHourHand.style.transform = `rotate(${hourDeg}deg)`;
    el.analogMinuteHand.style.transform = `rotate(${minDeg}deg)`;
    el.analogSecondHand.style.transform = `rotate(${secDeg}deg)`;
    el.analogCaptionTime.textContent = `${hoursDisplay}:${minStr}:${secStr} TST`;

    // Second-based actions (Audio tick & date update once per second)
    if (seconds !== lastSecond) {
      lastSecond = seconds;
      playTickSound();
      updateDateAndCalendar(twDate);
      updateWorldClocks();
    }

    requestAnimationFrame(updateClock);
  }

  /**
   * Update Gregorian, Lunar & Day-of-Year Display
   */
  function updateDateAndCalendar(twDate) {
    const year = twDate.getFullYear();
    const month = String(twDate.getMonth() + 1).padStart(2, '0');
    const day = String(twDate.getDate()).padStart(2, '0');

    el.dateGregorian.textContent = `${year} 年 ${month} 月 ${day} 日`;

    // Weekday in Traditional Chinese
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    el.dateWeekday.textContent = weekdays[twDate.getDay()];

    // Day of Year
    const startOfYear = new Date(Date.UTC(twDate.getFullYear(), 0, 1));
    const currentUTC = new Date(Date.UTC(twDate.getFullYear(), twDate.getMonth(), twDate.getDate()));
    const dayOfYear = Math.floor((currentUTC - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const weekNumber = Math.ceil(dayOfYear / 7);
    el.dateDayYear.textContent = `第 ${dayOfYear} 天 • 第 ${weekNumber} 週`;

    // Lunar & Season
    const lunarInfo = getLunarAndSeasonInfo(twDate);
    el.dateLunar.textContent = lunarInfo.lunarText;
    el.currentSeasonTag.textContent = lunarInfo.seasonText;

    if (el.footerYear) {
      el.footerYear.textContent = year;
    }
  }

  /**
   * World Clock Computations
   */
  function updateWorldClocks() {
    const now = new Date();

    const timezones = [
      { tz: 'Asia/Taipei', timeEl: el.worldTaiwan, dateEl: el.worldDateTaiwan },
      { tz: 'Asia/Tokyo', timeEl: el.worldTokyo, dateEl: el.worldDateTokyo },
      { tz: 'Europe/London', timeEl: el.worldLondon, dateEl: el.worldDateLondon },
      { tz: 'America/New_York', timeEl: el.worldNewYork, dateEl: el.worldDateNewYork },
      { tz: 'Australia/Sydney', timeEl: el.worldSydney, dateEl: el.worldDateSydney }
    ];

    timezones.forEach(item => {
      try {
        const timeFormatter = new Intl.DateTimeFormat('zh-TW', {
          timeZone: item.tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const dateFormatter = new Intl.DateTimeFormat('zh-TW', {
          timeZone: item.tz,
          month: 'numeric',
          day: 'numeric',
          weekday: 'short'
        });
        if (item.timeEl) item.timeEl.textContent = timeFormatter.format(now);
        if (item.dateEl) item.dateEl.textContent = dateFormatter.format(now);
      } catch (e) {
        console.warn(`Timezone error for ${item.tz}:`, e);
      }
    });
  }

  // --- TOAST NOTIFICATIONS ---
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    el.toastMessage.textContent = message;
    el.toast.hidden = false;
    el.toast.style.animation = 'none';
    void el.toast.offsetWidth; // trigger reflow
    el.toast.style.animation = 'toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    toastTimer = setTimeout(() => {
      el.toast.hidden = true;
    }, 2800);
  }

  // --- THEME SWITCHING ---
  function initTheme() {
    const savedTheme = localStorage.getItem('tseng_theme') || 'theme-midnight';
    applyTheme(savedTheme);

    // Toggle dropdown
    el.btnThemeMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = el.themeDropdown.hidden;
      el.themeDropdown.hidden = !isHidden;
      el.btnThemeMenu.setAttribute('aria-expanded', isHidden);
    });

    document.addEventListener('click', () => {
      if (!el.themeDropdown.hidden) {
        el.themeDropdown.hidden = true;
        el.btnThemeMenu.setAttribute('aria-expanded', 'false');
      }
    });

    el.themeOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        applyTheme(theme);
        localStorage.setItem('tseng_theme', theme);
        el.themeDropdown.hidden = true;
        showToast(`已切換為：${btn.querySelector('span:last-child').textContent}`);
      });
    });
  }

  function applyTheme(themeClass) {
    document.body.classList.remove('theme-midnight', 'theme-nchu', 'theme-aurora', 'theme-light');
    document.body.classList.add(themeClass);
    el.themeOptions.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeClass);
    });
  }

  // --- CLOCK MODE TOGGLE ---
  function initClockModeToggle() {
    el.btnModeDigital.addEventListener('click', () => {
      state.clockMode = 'digital';
      el.digitalClockView.style.display = 'flex';
      el.analogClockView.style.display = 'none';
      el.btnModeDigital.classList.add('active');
      el.btnModeAnalog.classList.remove('active');
    });

    el.btnModeAnalog.addEventListener('click', () => {
      state.clockMode = 'analog';
      el.digitalClockView.style.display = 'none';
      el.analogClockView.style.display = 'flex';
      el.btnModeAnalog.classList.add('active');
      el.btnModeDigital.classList.remove('active');
    });

    el.btnToggleFormat.addEventListener('click', () => {
      state.is24Hour = !state.is24Hour;
      el.btnToggleFormat.textContent = state.is24Hour ? '24H制' : '12H制';
      showToast(`已切換為 ${state.is24Hour ? '24 小時制' : '12 小時制'}`);
    });
  }

  // --- AUDIO TOGGLE ---
  function initAudioToggle() {
    el.btnAudioToggle.addEventListener('click', () => {
      state.isAudioEnabled = !state.isAudioEnabled;
      if (state.isAudioEnabled) {
        el.iconSoundOff.style.display = 'none';
        el.iconSoundOn.style.display = 'inline';
        el.btnAudioToggle.setAttribute('title', '時鐘音效已開啟');
        showToast('秒針輕柔滴答音效已開啟 🔊');
        playTickSound();
      } else {
        el.iconSoundOff.style.display = 'inline';
        el.iconSoundOn.style.display = 'none';
        el.btnAudioToggle.setAttribute('title', '時鐘音效已關閉');
        showToast('時鐘音效已靜音 🔇');
      }
    });
  }

  // --- FULLSCREEN & ZEN MODE ---
  function initFullscreenAndZen() {
    el.btnFullscreenToggle.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        showToast('已進入全螢幕展示模式');
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    el.btnZenMode.addEventListener('click', () => {
      document.body.classList.toggle('zen-mode');
      const isZen = document.body.classList.contains('zen-mode');
      showToast(isZen ? '已進入專注時鐘模式（點擊右上或按 ESC 退出）' : '已返回正常首頁模式');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('zen-mode')) {
        document.body.classList.remove('zen-mode');
        showToast('已退出專注模式');
      }
    });
  }

  // --- COPY TIMESTAMP ---
  function initCopyTimestamp() {
    el.btnCopyTimestamp.addEventListener('click', () => {
      const twDate = getTaiwanDate();
      const iso = twDate.getFullYear() + '-' +
        String(twDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(twDate.getDate()).padStart(2, '0') + ' ' +
        String(twDate.getHours()).padStart(2, '0') + ':' +
        String(twDate.getMinutes()).padStart(2, '0') + ':' +
        String(twDate.getSeconds()).padStart(2, '0');

      const text = `曾郁欣 | 台灣標準時間 (UTC+8): ${iso} (國立中興大學 NCHU)`;
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 已複製台灣即時時間至剪貼簿！');
      }).catch(() => {
        showToast('無法複製，請手動選取複製');
      });
    });
  }

  // --- POMODORO TIMER ---
  function initPomodoro() {
    function updatePomoDisplay() {
      const mins = Math.floor(state.pomo.remainingSeconds / 60);
      const secs = state.pomo.remainingSeconds % 60;
      el.pomoMinutes.textContent = String(mins).padStart(2, '0');
      el.pomoSeconds.textContent = String(secs).padStart(2, '0');

      const progress = (state.pomo.remainingSeconds / state.pomo.totalSeconds) * 100;
      el.pomoProgressFill.style.width = `${progress}%`;
    }

    el.btnPomoStart.addEventListener('click', () => {
      if (state.pomo.isRunning) {
        // Pause
        clearInterval(state.pomo.timerId);
        state.pomo.isRunning = false;
        el.pomoBtnText.textContent = '繼續專注';
        el.pomoStatus.textContent = '已暫停';
      } else {
        // Start
        state.pomo.isRunning = true;
        el.pomoBtnText.textContent = '暫停';
        el.pomoStatus.textContent = state.pomo.isBreak ? '休息中 ☕' : '專注進行中 🎯';

        state.pomo.timerId = setInterval(() => {
          if (state.pomo.remainingSeconds > 0) {
            state.pomo.remainingSeconds--;
            updatePomoDisplay();
          } else {
            clearInterval(state.pomo.timerId);
            state.pomo.isRunning = false;
            playChime();

            if (!state.pomo.isBreak) {
              showToast('🎉 太棒了！專注時間達成，休息 5 分鐘吧！');
              switchPomoMode(true);
            } else {
              showToast('✨ 休息結束，準備好開啟下一個專注階段！');
              switchPomoMode(false);
            }
          }
        }, 1000);
      }
    });

    el.btnPomoReset.addEventListener('click', () => {
      clearInterval(state.pomo.timerId);
      state.pomo.isRunning = false;
      state.pomo.remainingSeconds = state.pomo.totalSeconds;
      el.pomoBtnText.textContent = '開始專注';
      el.pomoStatus.textContent = '準備就緒';
      updatePomoDisplay();
      showToast('番茄鐘已重設');
    });

    function switchPomoMode(toBreak) {
      clearInterval(state.pomo.timerId);
      state.pomo.isRunning = false;
      state.pomo.isBreak = toBreak;
      state.pomo.totalSeconds = toBreak ? 5 * 60 : 25 * 60;
      state.pomo.remainingSeconds = state.pomo.totalSeconds;
      el.btnPomoMode.querySelector('span').textContent = toBreak ? '切換專注 (25分)' : '切換休息 (5分)';
      el.pomoBtnText.textContent = toBreak ? '開始休息' : '開始專注';
      el.pomoStatus.textContent = toBreak ? '休息準備' : '準備就緒';
      updatePomoDisplay();
    }

    el.btnPomoMode.addEventListener('click', () => {
      switchPomoMode(!state.pomo.isBreak);
    });

    updatePomoDisplay();
  }

  // --- DAILY INSPIRATION QUOTES ---
  const quotesList = [
    { text: "「路雖遠行則將至，事雖難做則必成。在興大的每一刻，都在寫下最好的自己。」", author: "— 獻給 曾郁欣" },
    { text: "「博學之，審問之，慎思之，明辨之，篤行之。」", author: "— 《禮記•中庸》" },
    { text: "「誠實待人，樸實做事，精益求精，勤勞進取。」", author: "— 國立中興大學 校訓" },
    { text: "「星光不問趕路人，時光不負有心人。每一個為夢想奔跑的清晨與深夜都閃閃發亮。」", author: "— 每日成長寄語" },
    { text: "「所謂光輝歲月，並不是以後閃耀的日子，而是無人問津時你對夢想的偏執。」", author: "— 獻給 努力前行的郁欣" },
    { text: "「安靜努力，悄悄拔尖，然後驚艷所有人。」", author: "— 學習箴言" }
  ];

  let currentQuoteIndex = 0;

  function initQuotes() {
    el.btnRefreshQuote.addEventListener('click', () => {
      currentQuoteIndex = (currentQuoteIndex + 1) % quotesList.length;
      el.quoteText.textContent = quotesList[currentQuoteIndex].text;
      el.quoteAuthor.textContent = quotesList[currentQuoteIndex].author;
      el.quoteText.style.animation = 'none';
      void el.quoteText.offsetWidth;
      el.quoteText.style.animation = 'dropdownIn 0.3s ease';
    });

    el.btnCopyQuote.addEventListener('click', () => {
      const quote = `${el.quoteText.textContent} ${el.quoteAuthor.textContent}`;
      navigator.clipboard.writeText(quote).then(() => {
        showToast('💬 勵志金句已複製到剪貼簿！');
      });
    });
  }

  // --- AMBIENT CANVAS PARTICLES ---
  function initAmbientCanvas() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 55;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.7 + 0.2
      });
    }

    function renderParticles() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${p.alpha})`;
        ctx.fill();
      });

      requestAnimationFrame(renderParticles);
    }

    renderParticles();
  }

  // --- INITIALIZATION ---
  function init() {
    initTheme();
    initClockModeToggle();
    initAudioToggle();
    initFullscreenAndZen();
    initCopyTimestamp();
    initPomodoro();
    initQuotes();
    initAmbientCanvas();

    // Start Clock Loop
    requestAnimationFrame(updateClock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
