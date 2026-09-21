/**
 * 台灣各區一週天氣預報儀表板 - 前端互動邏輯 (app.js)
 * 整合中央氣象署 (CWA) API、六大分區篩選、即時搜尋與 JSON 結構觀察
 */

// ==========================================
// 1. 六大分區對照與內建標準資料 (支援離線 file:// 直接開啟)
// ==========================================
const REGION_MAPPING = {
  "北部地區": ["基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣"],
  "中部地區": ["臺中市", "彰化縣", "南投縣", "雲林縣"],
  "南部地區": ["嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣"],
  "東北部地區": ["宜蘭縣"],
  "東部地區": ["花蓮縣"],
  "東南部地區": ["臺東縣"],
  "外島地區": ["澎湖縣", "金門縣", "連江縣"]
};

// 全台 22 縣市標準預報資料 (預設資料源)
const DEFAULT_WEATHER_RECORDS = [
  { region: "北部地區", county: "基隆市", wx: "多雲短暫雨", minT: 24, maxT: 30, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "北部地區", county: "臺北市", wx: "晴時多雲", minT: 24, maxT: 33, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "北部地區", county: "新北市", wx: "多雲時晴", minT: 24, maxT: 32, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "北部地區", county: "桃園市", wx: "多雲時晴", minT: 24, maxT: 32, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "北部地區", county: "新竹市", wx: "晴時多雲", minT: 24, maxT: 31, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "北部地區", county: "新竹縣", wx: "晴時多雲", minT: 24, maxT: 31, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "北部地區", county: "苗栗縣", wx: "多雲午後短暫雷陣雨", minT: 24, maxT: 32, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "中部地區", county: "臺中市", wx: "晴午後短暫雷陣雨", minT: 25, maxT: 34, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "中部地區", county: "彰化縣", wx: "晴午後短暫雷陣雨", minT: 25, maxT: 33, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "中部地區", county: "南投縣", wx: "多雲午後短暫雷陣雨", minT: 23, maxT: 32, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "中部地區", county: "雲林縣", wx: "多雲時晴", minT: 25, maxT: 33, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "南部地區", county: "嘉義市", wx: "多雲午後短暫陣雨", minT: 25, maxT: 33, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "南部地區", county: "嘉義縣", wx: "多雲午後短暫陣雨", minT: 25, maxT: 33, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "南部地區", county: "臺南市", wx: "陰局部陣雨", minT: 26, maxT: 32, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "南部地區", county: "高雄市", wx: "多雲短暫陣雨", minT: 26, maxT: 33, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "南部地區", county: "屏東縣", wx: "陰時多雲短暫陣雨", minT: 25, maxT: 32, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "東北部地區", county: "宜蘭縣", wx: "陰局部短暫雨", minT: 23, maxT: 30, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "東部地區", county: "花蓮縣", wx: "多雲午後短暫陣雨", minT: 24, maxT: 31, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "東南部地區", county: "臺東縣", wx: "多雲短暫陣雨", minT: 25, maxT: 31, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "外島地區", county: "澎湖縣", wx: "晴時多雲", minT: 26, maxT: 31, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "外島地區", county: "金門縣", wx: "晴天", minT: 25, maxT: 32, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" },
  { region: "外島地區", county: "連江縣", wx: "多雲短暫雨", minT: 23, maxT: 28, startTime: "2026-09-22 00:00", endTime: "2026-09-22 12:00" }
];

// 當前生效之天氣資料與狀態
let currentWeatherRecords = [...DEFAULT_WEATHER_RECORDS];
let activeRegionFilter = "ALL";
let currentSearchKeyword = "";
let rawApiResponseData = null;

// ==========================================
// 2. SVG 天氣圖示產生器
// ==========================================
function getWeatherIconSvg(wxDesc) {
  if (!wxDesc) wxDesc = "";
  
  // 晴天
  if (wxDesc.includes("晴天") || (wxDesc.includes("晴") && !wxDesc.includes("雨") && !wxDesc.includes("多雲") && !wxDesc.includes("陰"))) {
    return `
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="14" fill="url(#sunGrad)"/>
        <g stroke="#fbbf24" stroke-width="3" stroke-linecap="round">
          <line x1="32" y1="6" x2="32" y2="12"/>
          <line x1="32" y1="52" x2="32" y2="58"/>
          <line x1="6" y1="32" x2="12" y2="32"/>
          <line x1="52" y1="32" x2="58" y2="32"/>
          <line x1="13.6" y1="13.6" x2="17.8" y2="17.8"/>
          <line x1="46.2" y1="46.2" x2="50.4" y2="50.4"/>
          <line x1="13.6" y1="50.4" x2="17.8" y2="46.2"/>
          <line x1="46.2" y1="17.8" x2="50.4" y2="13.6"/>
        </g>
        <defs>
          <radialGradient id="sunGrad" cx="0.4" cy="0.4" r="0.6">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </radialGradient>
        </defs>
      </svg>
    `;
  }

  // 雷雨
  if (wxDesc.includes("雷")) {
    return `
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M46 36c3.3 0 6-2.7 6-6 0-3-2.2-5.4-5.1-5.9C45.7 19.3 41.3 16 36 16c-5.8 0-10.6 4.1-11.7 9.6-1-.4-2.1-.6-3.3-.6-4.4 0-8 3.6-8 8 0 4.1 3.1 7.5 7.1 7.9h25.9z" fill="#475569"/>
        <polygon points="32,36 26,47 33,47 28,58 40,44 33,44" fill="#facc15"/>
        <line x1="20" y1="46" x2="17" y2="54" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="44" y1="46" x2="41" y2="54" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 雨天 (陣雨、短暫雨)
  if (wxDesc.includes("雨")) {
    return `
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M46 32c3.3 0 6-2.7 6-6 0-3-2.2-5.4-5.1-5.9C45.7 15.3 41.3 12 36 12c-5.8 0-10.6 4.1-11.7 9.6-1-.4-2.1-.6-3.3-.6-4.4 0-8 3.6-8 8 0 4.1 3.1 7.5 7.1 7.9h25.9z" fill="#64748b"/>
        <line x1="24" y1="38" x2="20" y2="48" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="34" y1="38" x2="30" y2="48" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="44" y1="38" x2="40" y2="48" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  // 晴時多雲、多雲時晴
  if (wxDesc.includes("晴") && (wxDesc.includes("多雲") || wxDesc.includes("陰"))) {
    return `
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="26" cy="24" r="10" fill="#f59e0b"/>
        <path d="M48 40c3 0 5.5-2.5 5.5-5.5 0-2.8-2-5.1-4.7-5.5C47.7 23.5 43.6 20 38.5 20c-5.3 0-9.8 3.8-10.8 8.9-.9-.4-1.9-.6-3-.6-4 0-7.3 3.3-7.3 7.3 0 3.8 2.8 6.9 6.5 7.3h24.1z" fill="#94a3b8"/>
      </svg>
    `;
  }

  // 陰天 / 多雲
  return `
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M47 38c3.3 0 6-2.7 6-6 0-3-2.2-5.4-5.1-5.9C46.7 21.3 42.3 18 37 18c-5.8 0-10.6 4.1-11.7 9.6-1-.4-2.1-.6-3.3-.6-4.4 0-8 3.6-8 8 0 4.1 3.1 7.5 7.1 7.9h25.9z" fill="#94a3b8"/>
      <path d="M36 44c2.8 0 5-2.2 5-5 0-2.5-1.8-4.5-4.2-4.9C35.7 30 32.1 27 27.8 27c-4.8 0-8.8 3.4-9.7 8-.8-.3-1.8-.5-2.7-.5-3.6 0-6.6 3-6.6 6.6 0 3.4 2.6 6.2 5.9 6.6h21.3z" fill="#cbd5e1"/>
    </svg>
  `;
}

// ==========================================
// 3. 儀表板卡片渲染與指標計算
// ==========================================
function renderWeatherCards() {
  const container = document.getElementById("weatherCardsGrid");
  const countBadge = document.getElementById("itemsCountBadge");
  const viewingTitle = document.getElementById("currentViewingTitle");

  // 篩選符合條件的縣市
  const filtered = currentWeatherRecords.filter(item => {
    const matchRegion = (activeRegionFilter === "ALL") || (item.region === activeRegionFilter);
    const matchSearch = (!currentSearchKeyword) || item.county.includes(currentSearchKeyword) || item.wx.includes(currentSearchKeyword);
    return matchRegion && matchSearch;
  });

  // 更新標題與筆數
  if (activeRegionFilter === "ALL") {
    viewingTitle.textContent = currentSearchKeyword ? `搜尋結果：「${currentSearchKeyword}」` : "全台灣各縣市天氣預報";
  } else {
    viewingTitle.textContent = `${activeRegionFilter}天氣預報`;
  }
  countBadge.textContent = `顯示 ${filtered.length} 個地點`;

  // 若無符合結果
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 8px;">找不到符合「${currentSearchKeyword}」的縣市資料</p>
        <p style="font-size: 0.88rem;">請嘗試搜尋其他名稱或切換至其他分區標籤。</p>
      </div>
    `;
    return;
  }

  // 渲染卡片 HTML
  container.innerHTML = filtered.map(item => {
    const minT = Number(item.minT);
    const maxT = Number(item.maxT);
    // 計算溫度條填滿寬度 (基準 15°C ~ 38°C)
    const minPercent = Math.max(0, Math.min(100, ((minT - 15) / 23) * 100));
    const maxPercent = Math.max(0, Math.min(100, ((maxT - 15) / 23) * 100));
    const widthPercent = Math.max(10, maxPercent - minPercent);

    return `
      <article class="weather-card">
        <div class="card-top">
          <h3 class="county-name">${item.county}</h3>
          <span class="region-tag region-${item.region}">${item.region}</span>
        </div>

        <div class="card-center">
          <div class="wx-icon-box">
            ${getWeatherIconSvg(item.wx)}
          </div>
          <div class="wx-info">
            <div class="wx-desc">${item.wx}</div>
            <div class="wx-slot">一週預報時段</div>
          </div>
        </div>

        <div class="temp-section">
          <div class="temp-labels">
            <div>
              <span class="temp-label-desc">最低溫 </span>
              <span class="temp-val-min">${minT}°C</span>
            </div>
            <div>
              <span class="temp-label-desc">最高溫 </span>
              <span class="temp-val-max">${maxT}°C</span>
            </div>
          </div>
          <div class="temp-range-bar">
            <div class="temp-fill-bar" style="margin-left: ${minPercent}%; width: ${widthPercent}%;"></div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  updateStatistics();
}

// 更新頂部指標卡數值
function updateStatistics() {
  if (currentWeatherRecords.length === 0) return;

  const minTemps = currentWeatherRecords.map(d => Number(d.minT));
  const maxTemps = currentWeatherRecords.map(d => Number(d.maxT));

  const lowest = Math.min(...minTemps);
  const highest = Math.max(...maxTemps);
  const avg = Math.round((minTemps.reduce((a, b) => a + b, 0) + maxTemps.reduce((a, b) => a + b, 0)) / (minTemps.length * 2));

  // 找出最高溫縣市
  const hottestItem = currentWeatherRecords.find(d => Number(d.maxT) === highest);
  const rainCount = currentWeatherRecords.filter(d => d.wx.includes("雨")).length;

  document.getElementById("statAvgTemp").textContent = `${avg} °C`;
  document.getElementById("statTempRange").textContent = `全台最低 ${lowest}°C ~ 最高 ${highest}°C`;
  document.getElementById("statHotCounty").textContent = hottestItem ? `${hottestItem.county} ${highest}°C` : "--";
  document.getElementById("statHotDesc").textContent = hottestItem ? `天氣現象：${hottestItem.wx}` : "";
  document.getElementById("statRainCount").textContent = `${rainCount} 個縣市`;
  document.getElementById("statRainDesc").textContent = rainCount > 0 ? "有短暫陣雨或雷陣雨機率" : "全島天氣大致晴朗穩定";
}

// ==========================================
// 4. 時鐘與時間即時更新
// ==========================================
function startClock() {
  const timeElem = document.getElementById("timeString");
  function tick() {
    const now = new Date();
    const formatted = now.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short"
    }) + " " + now.toLocaleTimeString("zh-TW", { hour12: false });
    timeElem.textContent = formatted;
  }
  tick();
  setInterval(tick, 1000);
}

// ==========================================
// 5. 事件監聽綁定
// ==========================================
function setupEventListeners() {
  // 分區標籤切換
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeRegionFilter = tab.dataset.region;
      renderWeatherCards();
    });
  });

  // 關鍵字搜尋
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("btnClearSearch");

  searchInput.addEventListener("input", (e) => {
    currentSearchKeyword = e.target.value.trim();
    clearBtn.style.display = currentSearchKeyword ? "block" : "none";
    renderWeatherCards();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearchKeyword = "";
    clearBtn.style.display = "none";
    renderWeatherCards();
  });

  // 彈窗 1：json.dumps 結構觀察
  const jsonModal = document.getElementById("jsonModal");
  const btnOpenJson = document.getElementById("btnOpenJsonModal");
  const btnCloseJson = document.getElementById("btnCloseJsonModal");
  const jsonCodeBlock = document.getElementById("jsonCodeBlock");
  const btnCopyJson = document.getElementById("btnCopyJson");

  btnOpenJson.addEventListener("click", () => {
    // 取得展示用的 JSON 資料結構 (依據作業 json.dumps 要求格式化)
    const sampleToDisplay = rawApiResponseData || generateJsonDumpPreview();
    jsonCodeBlock.textContent = JSON.stringify(sampleToDisplay, null, 4);
    jsonModal.classList.add("open");
  });

  btnCloseJson.addEventListener("click", () => jsonModal.classList.remove("open"));
  jsonModal.addEventListener("click", (e) => {
    if (e.target === jsonModal) jsonModal.classList.remove("open");
  });

  btnCopyJson.addEventListener("click", () => {
    navigator.clipboard.writeText(jsonCodeBlock.textContent).then(() => {
      btnCopyJson.textContent = "已複製！";
      setTimeout(() => {
        btnCopyJson.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg> 複製 JSON
        `;
      }, 2000);
    });
  });

  // 彈窗 2：API 串接設定
  const apiModal = document.getElementById("apiModal");
  const btnOpenApi = document.getElementById("btnOpenApiModal");
  const btnCloseApi = document.getElementById("btnCloseApiModal");
  const btnFetchLive = document.getElementById("btnFetchLiveApi");
  const btnUseDemo = document.getElementById("btnUseDemoData");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const apiStatusBox = document.getElementById("apiStatusBox");

  btnOpenApi.addEventListener("click", () => apiModal.classList.add("open"));
  btnCloseApi.addEventListener("click", () => apiModal.classList.remove("open"));
  apiModal.addEventListener("click", (e) => {
    if (e.target === apiModal) apiModal.classList.remove("open");
  });

  btnUseDemo.addEventListener("click", () => {
    currentWeatherRecords = [...DEFAULT_WEATHER_RECORDS];
    rawApiResponseData = null;
    apiStatusBox.innerHTML = `
      <div class="status-indicator-dot dot-demo"></div>
      <span>已切換為：內建標準示範資料 (Demo Mode)</span>
    `;
    renderWeatherCards();
    apiModal.classList.remove("open");
  });

  btnFetchLive.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      alert("請先輸入您的中央氣象署 API 授權碼！");
      return;
    }

    btnFetchLive.textContent = "連線請求中...";
    btnFetchLive.disabled = true;

    try {
      const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-005?Authorization=${encodeURIComponent(key)}&format=JSON`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP 錯誤: ${res.status} (請確認 API Key 是否正確)`);
      }

      const json = await res.json();
      rawApiResponseData = json;

      // 解析 API 回傳資料
      const parsed = parseCwaApiResponse(json);
      if (parsed.length > 0) {
        currentWeatherRecords = parsed;
        apiStatusBox.innerHTML = `
          <div class="status-indicator-dot dot-live"></div>
          <span>連線成功：已載入中央氣象署即時預報數據！</span>
        `;
        renderWeatherCards();
        alert("成功獲取中央氣象署即時天氣預報資料！");
        apiModal.classList.remove("open");
      } else {
        alert("成功取得回應，但未解析出有效縣市資料。");
      }
    } catch (err) {
      alert(`調用 CWA API 失敗: ${err.message}\n(若在瀏覽器遇到 CORS 限制，建議使用專案內建之 cwa_weather_forecast.py 後端腳本運行)`);
    } finally {
      btnFetchLive.textContent = "連線獲取即時預報";
      btnFetchLive.disabled = false;
    }
  });
}

// 產生模擬 CWA F-C0032-005 的示範 JSON 資料
function generateJsonDumpPreview() {
  return {
    success: "true",
    result: {
      resource_id: "F-C0032-005",
      fields: [
        { id: "datasetDescription", type: "String" },
        { id: "locationName", type: "String" },
        { id: "weatherElement", type: "String" }
      ]
    },
    records: {
      datasetDescription: "一般天氣預報-一週縣市天氣預報",
      location: currentWeatherRecords.slice(0, 3).map(r => ({
        locationName: r.county,
        weatherElement: [
          {
            elementName: "Wx",
            time: [{ startTime: r.startTime, endTime: r.endTime, parameter: { parameterName: r.wx } }]
          },
          {
            elementName: "MaxT",
            time: [{ startTime: r.startTime, endTime: r.endTime, parameter: { parameterName: String(r.maxT), parameterUnit: "C" } }]
          },
          {
            elementName: "MinT",
            time: [{ startTime: r.startTime, endTime: r.endTime, parameter: { parameterName: String(r.minT), parameterUnit: "C" } }]
          }
        ]
      }))
    }
  };
}

// 解析 CWA API 回傳的真實 JSON 結構
function parseCwaApiResponse(json) {
  const records = json?.records?.location || [];
  const countyToRegion = {};
  for (const [reg, list] of Object.entries(REGION_MAPPING)) {
    list.forEach(c => countyToRegion[c] = reg);
  }

  const result = [];
  records.forEach(loc => {
    const county = loc.locationName;
    const region = countyToRegion[county] || "其他地區";
    const elemMap = {};
    (loc.weatherElement || []).forEach(e => elemMap[e.elementName] = e);

    const wx = elemMap.Wx?.time?.[0]?.parameter?.parameterName || "多雲";
    const maxT = elemMap.MaxT?.time?.[0]?.parameter?.parameterName || 30;
    const minT = elemMap.MinT?.time?.[0]?.parameter?.parameterName || 24;
    const startTime = elemMap.Wx?.time?.[0]?.startTime || "";
    const endTime = elemMap.Wx?.time?.[0]?.endTime || "";

    result.push({ region, county, wx, minT: Number(minT), maxT: Number(maxT), startTime, endTime });
  });

  return result;
}

// ==========================================
// 6. 初始化執行
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  setupEventListeners();
  renderWeatherCards();
});
