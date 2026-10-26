# 資料分析與機器學習實作專案

這個儲存庫整理我在網頁開發、資料分析與機器學習上的實作成果，包含台灣天氣資訊視覺化、企業利潤預測，以及整合七組 Kaggle 資料的回歸分析網站。

專案從資料取得、清理、模型訓練到互動網頁展示，練習把分析結果做成可以操作、比較與下載的工具，並透過 GitHub Actions 自動部署至 GitHub Pages。

## 線上展示

| 專案 | 內容 | 展示入口 |
| --- | --- | --- |
| **Kaggle Multiple Linear Regression Lab** | 七組資料切換、五模型比較、特徵選擇、中英文介面與即時預測 | [開啟 HW2 網站](https://xin-bit-cpu.github.io/test2/HW2/) |
| **50 Startups 利潤預測** | 比較企業投入與利潤的關係，提供五模型試算與分析報告 | [開啟利潤預測網站](https://xin-bit-cpu.github.io/test2/test3/) |
| **台灣一週天氣預報儀表板** | 全台 22 縣市預報、地區篩選、雷達與衛星動畫 | [開啟天氣網站](https://xin-bit-cpu.github.io/test2/) |

## 一、Kaggle Multiple Linear Regression Lab

這是整合七組 Kaggle 資料的單頁機器學習分析網站。使用者透過上方下拉選單選擇資料集，介紹、圖表、模型結果、預測表單與下載內容會同步更新。

### 主要功能

- **資料集概覽**：呈現來源、筆數、缺失值、欄位說明，以及原始、工程後與編碼後的特徵數。
- **五模型比較**：Linear Regression、Ridge、Lasso、ElasticNet、Random Forest，提供 CV RMSE、Test RMSE、Test R²、Test MAE 與最佳參數。
- **前向特徵選擇**：逐步加入特徵，分析「特徵越多，預測是否越好」，並顯示最佳組合。
- **模型診斷**：實際值與預測值、殘差、學習曲線、特徵重要性或係數，搭配依實際結果產生的解讀。
- **互動預測**：七組資料各有對應欄位、類別選項與輸入驗證，直接使用實際訓練模型計算。
- **中英文切換**：切換介面、資料介紹、欄位說明與診斷內容，保留目前輸入與預測結果，並記住語言偏好。
- **成果下載**：模型比較、特徵選擇與預測 CSV、圖表 PNG、JSON 摘要及模型評估報告。

### 七組資料與實驗成果

以下是清理後全量資料的分析結果。推薦模型依**訓練集交叉驗證 RMSE** 選擇，測試集用於最後評估。

| 資料集 | 預測目標 | 分析筆數 | CV 推薦模型 | Test R² |
| --- | --- | ---: | --- | ---: |
| King County House Sales | 房屋成交價（USD） | 21,434 | Random Forest | 0.8642 |
| Spotify Tracks | 歌曲流行度（0–100） | 86,067 | Linear Regression | 0.3633 |
| Laptop Price | 筆電價格（EUR） | 1,274 | ElasticNet | 0.8632 |
| Bike Sharing Demand | 每小時自行車租借量 | 17,377 | Random Forest | 0.7367 |
| Used Car Price | 二手車售價（INR） | 6,907 | Random Forest | 0.9184 |
| House Rent Prediction | 每月租金（INR） | 4,746 | Random Forest | 0.6869 |
| Flight Ticket Price | 機票價格（INR） | 10,461 | Random Forest | 0.8196 |

完整 CV／測試指標與最佳特徵數見[分析結果摘要](HW2/docs/RESULTS.md)。這些結果對應各自的資料與切分；不同資料集的 RMSE 單位不同，不適合直接比較大小。

### 分析方法與驗證

一般資料採用固定種子的 80%／20% 訓練測試切分，自行車資料則依時間順序切分。模型調參與特徵選擇都使用訓練集內的 5-fold 交叉驗證；補值、標準化、類別編碼與目標縮放也在各 fold 內學習，避免測試資料參與前處理與選模。

七組資料共訓練 **35 個模型**。Python 與 JavaScript 的推論對照涵蓋 **735 個案例**，包含缺失輸入與未知類別處理，最大相對誤差約為 `2.1 × 10⁻¹³`。另外也驗證七組表單切換、語言切換、預測狀態保留、錯誤隔離與下載路徑。

資料核對也保留限制說明：租屋資料只有 10 個有效原始欄位；機票資料排除重複或有疑慮欄位後剩 8 個。兩者使用日期、時間或樓層拆解提出特徵工程方案，**衍生欄位不計為新增原始欄位**，是否符合課程要求仍需與教師確認。

### 技術架構

| 部分 | 使用技術 | 用途 |
| --- | --- | --- |
| 前端 | React、TypeScript、Vite、Tailwind CSS | 共用元件、資料集切換與響應式介面 |
| 圖表 | Recharts、Matplotlib | 互動分析圖表與可下載 PNG |
| 分析與訓練 | Python、Pandas、NumPy、Scikit-learn、Joblib | 清理資料、交叉驗證、模型訓練與保存 |
| 瀏覽器預測 | JavaScript、匯出的前處理與模型參數 | 執行與 Python 一致的模型推論 |
| 自動化部署 | GitHub Actions、GitHub Pages | 執行測試、建置並發佈靜態網站 |

Python 預先產生 JSON、CSV、PNG 與模型參數，前端再依資料集 ID 載入。GitHub Pages 不執行 Python 後端，互動預測由瀏覽器讀取已訓練參數完成。

詳細內容：[操作與訓練說明](HW2/README.md) · [課堂報告介紹](HW2/docs/PROJECT.md) · [Python 訓練入口](HW2/ml/train.py)

## 二、50 Startups 利潤預測

使用 50 筆企業資料，分析研發、管理與行銷支出，以及州別與企業利潤之間的關係。

- 比較 Linear Regression、Ridge、Lasso、ElasticNet 與 Random Forest。
- 使用 40 筆訓練、10 筆測試資料，以訓練集交叉驗證選擇模型與參數。
- 提供五個模型的個別切換與整合比較畫面，查看預測指標、診斷圖與逐筆結果。
- 保留線性回歸 1～5 個編碼後特徵的前向選擇實驗。
- 可輸入企業支出與州別進行試算，並下載分析成果。

這組資料只有 50 筆，結果對資料切分較敏感，適合用來理解模型比較與驗證流程。

詳細內容：[50 Startups 說明](test3/README.md) · [Python 訓練入口](test3/train.py)

## 三、台灣一週天氣預報儀表板

串接中央氣象署開放資料，將台灣 22 個縣市的一週預報整理為同一個互動頁面。

- 顯示平均氣溫、最高氣溫與降雨概況。
- 支援地區篩選與縣市搜尋。
- 提供最近約 90 分鐘的雷達回波與衛星雲圖動畫。
- 可查看原始資料；輸入中央氣象署 API 金鑰後可取得即時預報。
- 未提供金鑰時，可使用內建示範資料展示介面。

使用 HTML、CSS 與 JavaScript 實作。預報資料來源為[中央氣象署開放資料平臺](https://opendata.cwa.gov.tw/)的 `F-C0032-005`，並使用氣象署雷達與向日葵衛星影像。

## 專案目錄

```text
test2/
├── README.md                  專案總覽
├── index.html                 天氣儀表板首頁
├── style.css / app.js          天氣介面與資料處理
├── profile.html / profile.js   個人介紹頁
├── HW2/                       七組 Kaggle 資料回歸分析
│   ├── src/                   React 介面、中英文切換與瀏覽器推論
│   ├── ml/                    Python 清理、訓練與驗證程式
│   ├── public/data/           各資料集的真實分析成果與模型參數
│   ├── tests/                 成果、推論與介面測試
│   ├── docs/                  課堂報告與結果摘要
│   └── README.md              完整操作與重現說明
├── test3/                     50 Startups 利潤預測
│   ├── 50_Startups.csv         企業資料
│   ├── train.py               模型訓練與報告產生
│   ├── verify_results.py      成果驗證
│   └── site/                  可攜式靜態分析網站
└── .github/workflows/         自動建置與 Pages 部署設定
```

## 本機執行

先取得儲存庫：

```bash
git clone https://github.com/xin-bit-cpu/test2.git
cd test2
```

### 啟動 HW2 網站

在 Windows 終端機執行（需要 Node.js；已驗證 Node 24）：

```powershell
cd HW2
npm.cmd ci
npm.cmd run dev
```

開啟終端機顯示的本機網址。其他系統可將 `npm.cmd` 改為 `npm`。已提供預先訓練成果，瀏覽網站不需要重新執行 Python。

執行測試與正式版建置：

```powershell
npm.cmd test
npm.cmd run build
```

若要重新訓練七組模型，請依照 [HW2 完整說明](HW2/README.md#重新訓練)建立 Python 環境、取得對應版本資料並執行 `ml/train.py`。

### 啟動天氣與 50 Startups 網站

在儲存庫根目錄執行：

```powershell
python -m http.server 8000
```

天氣網站開啟 `http://localhost:8000/`；50 Startups 開啟 `http://localhost:8000/test3/site/`。重新訓練方式見 [test3 說明](test3/README.md)。

## 自動部署

推送至 `main` 後，GitHub Actions 會訓練並驗證 50 Startups、測試與建置 HW2，再將三個網站整合部署至 GitHub Pages。

- 天氣網站：`/test2/`
- 50 Startups：`/test2/test3/`
- Kaggle Regression Lab：`/test2/HW2/`

工作流程：[Build course labs and publish Pages](.github/workflows/startup-pages.yml) · [查看執行狀態](https://github.com/xin-bit-cpu/test2/actions)

## 實作收穫

透過這些專案，我練習了 API 資料串接、資料清理、類別編碼、模型訓練與比較，以及如何使用交叉驗證與獨立測試集評估結果。同時把 Python 分析成果整合到互動網站，加入輸入驗證、雙語介面、下載與自動部署，讓分析過程可以展示與重現。
