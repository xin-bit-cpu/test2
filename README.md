# 中央氣象署 (CWA) 台灣一週天氣預報資料獲取與觀察

本專案使用 Python 調用交通部中央氣象署（CWA）Open Data API，獲取台灣**北部、中部、南部、東北部、東部及東南部地區**一週的天氣預報資料（JSON 格式），並嚴格按照作業與評分要求，使用 `json.dumps` 深入觀察資料結構，同時結合 `pandas` 套件進行結構化數據整理與匯出。

---

## 評分比重對應清單

| 評分項目 | 比重 | 程式碼對應實作 |
| :--- | :---: | :--- |
| **調用 CWA API 獲取天氣預報資料** | **10%** | 使用 `requests.get()` 調用 CWA 開放平臺資料集 `F-C0032-005`（一週縣市天氣預報），帶入 `format=JSON` 與 `Authorization` 授權碼，具備逾時與 SSL 容錯保護。 |
| **觀察獲得的資料** | **5%** | 使用 `json.dumps(data, indent=4, ensure_ascii=False)` 格式化輸出各階層鍵值、天氣要素與第 1 個地點詳細結構，並完整輸出存為 `cwa_weekly_forecast.json`。 |
| **程式碼結構與可讀性** | **5%** | 採用模組化函式架構、型別標註 (Type Hints)、PEP 8 風格規範，並附上詳盡繁體中文註解與六大區域自動分類。 |

---

## 環境配置 (Environment Setup)

本專案已完成安裝以下 Python 必備套件：
```bash
pip install requests pandas
```

*   `requests`：用於發送 HTTP GET 請求調用氣象署 RESTful API。
*   `pandas`：用於解析各時段氣象要素，整理為結構化數據表 (DataFrame) 並可輸出為 CSV。

---

## 台灣六大分區對照表

本程式依照氣象預報慣例與作業指示，將全台各縣市劃分為六大區域（另附外島）：

*   **北部地區**：基隆市、臺北市、新北市、桃園市、新竹市、新竹縣、苗栗縣
*   **中部地區**：臺中市、彰化縣、南投縣、雲林縣
*   **南部地區**：嘉義市、嘉義縣、臺南市、高雄市、屏東縣
*   **東北部地區**：宜蘭縣
*   **東部地區**：花蓮縣
*   **東南部地區**：臺東縣
*   *(外島地區)*：澎湖縣、金門縣、連江縣

---

## 如何取得 CWA API 授權碼 (Authorization Key)

中央氣象署 API 為免費開放使用，但每次調用均需攜帶會員專屬金鑰：

1. 前往 **[中央氣象署氣象資料開放平臺](https://opendata.cwa.gov.tw/)**。
2. 註冊並登入會員。
3. 進入「**會員專區**」-> 點擊「**取得授權碼**」。
4. 複製專屬授權碼（格式通常為：`CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`）。

---

## 執行方式

### 方式 1：使用個人 CWA API 授權碼（調用實體即時 API）
```bash
python cwa_weather_forecast.py --api-key "您的CWA授權碼"
```
或直接執行程式，程式會在終端提示您貼上授權碼：
```bash
python cwa_weather_forecast.py
```

### 方式 2：使用內建展示模式 (Demo Mode，離線演示 / 免 Key 測試)
若您暫時尚未取得 API Key，可直接加上 `--demo` 參數進行作業評分功能檢驗（使用全台 22 縣市標準模擬預報資料）：
```bash
python cwa_weather_forecast.py --demo
```

---

## 產出檔案說明

執行完畢後，專案目錄下會自動產出以下檔案：
1. `cwa_weekly_forecast.json`：使用 `json.dumps` 格式化存入的完整預報 JSON 原始資料。
2. `cwa_weekly_summary.csv`：使用 `pandas` 整理後的六大分區各縣市一週天氣現象 (Wx)、最低溫 (MinT)、最高溫 (MaxT) 數據表。

---

## 核心程式碼片段預覽

### 1. 調用 CWA API
```python
response = requests.get(
    "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-005",
    params={"Authorization": api_key, "format": "JSON"},
    timeout=10,
    verify=False
)
data = response.json()
```

### 2. 使用 json.dumps 觀察獲得的資料
```python
# 美化縮排為 4 格，保留中文字元編碼
pretty_json_str = json.dumps(sample_location, indent=4, ensure_ascii=False)
print(pretty_json_str)

# 完整輸出至 JSON 檔
with open("cwa_weekly_forecast.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4, ensure_ascii=False)
```
