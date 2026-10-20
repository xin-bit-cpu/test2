# 50 Startups 利潤預測

使用 sklearn 的 Linear Regression、Ridge、Lasso、ElasticNet、Random Forest 五種模型，產生模型比較、逐筆預測及可切換模型試算的繁體中文網頁；另保留線性迴歸 1～5 個特徵的比較實驗。

## 本機執行

在儲存庫 `test2` 根目錄執行（Python 3.14）：

```powershell
python -m pip install -r test3/requirements.txt
python test3/train.py
python test3/verify_results.py
python -m http.server 8000
```

開啟 http://localhost:8000/test3/site/。也可以直接雙擊 `test3/site/index.html` 或 `test3/index.html`；結果以 `results.js` 載入，不需要後端或 CDN。建議把 `site/` 當成完整可攜式輸出。

`1.py`、`main.py`、`hw2.py` 是原有程式，這次沒有修改。新的自動化入口是 `train.py`。更新前的網頁、圖片與評估 CSV 備份於 `reference/`。

## 模型方法

- 使用專案內 `50_Startups.csv`（50 筆），訓練不需要下載資料。來源：https://gist.githubusercontent.com/GaneshSparkz/b5662effbdae8746f7f7d8ed70c42b2d/raw/faf8b1a0d58e251f48a647d3881e7a960c3f0925/50_Startups.csv
- 80% 訓練、20% 測試，`random_state=0`，即 40 / 10 筆。
- 州別採固定 California / Florida / New York 類別，OneHotEncoder drop first，產生 2 個 dummy features，加上 3 種支出共 5 個特徵。
- 下方補充的特徵選擇實驗，每一步只在訓練集使用 5-fold CV 選出下一個特徵，最後同樣使用 CV RMSE 決定特徵數。測試集只供評估與展示，不能依測試分數反覆調整模型。
- 舊圖範例用測試誤差挑選特徵；本版改用訓練 CV，結果可能不同，不保證重現範例數字。CV 分數用於選模，可能偏樂觀；保留測試集提供最後評估。資料量很小，換一種切分可能有明顯差異。
- 原始資料缺值、未知州別、非有限數值或負支出會明確停止並報錯，避免輸出錯誤報告。
- 五種模型比較均使用完整五個編碼後特徵與相同切分。線性模型的 StandardScaler 放在 Pipeline 內，每個 CV 訓練折各自 fit。GridSearchCV 調整 Ridge / Lasso 的 alpha、ElasticNet 的 alpha 與 l1_ratio、Random Forest 的 max_depth 與 min_samples_leaf。森林固定 100 棵樹、random_state=0。推薦模型僅依訓練 CV RMSE 選出。
- 網頁可切換五種試算模型；線性模型匯出換算成原始輸入尺度的係數，Random Forest 匯出完整樹結構，並採 float32 輸入符合 sklearn 樹模型推論。切換時更新上方指標、逐筆預測及 CSV 下載。

## 輸出（site/）

`index.html`、`dashboard.css`、`dashboard.js`、`results.js`：完整靜態網頁。

`50_Startups_Feature_Selection.png`：RMSE / R² 折線圖與特徵表。

`model_comparison.png` / `model_comparison.csv`：五種模型測試 RMSE、R² 圖表與包含 CV 分數及參數的比較表。

`model_diagnostics.png`：五種模型實際值對預測值、殘差圖。

`predictions_<model>.csv`、`model_<model>.joblib`：每種模型的預測與可重載模型，model 為 linear、ridge、lasso、elasticnet、forest。

`models.joblib`：五種模型合集，包含 encoder、features、models 與 recommended。

`prediction_diagnostics.png`：原先線性迴歸特徵選擇實驗的診斷圖。

`50_Startups_Feature_Selection.csv`、`predictions.csv`、`results.json`、`summary.md`：本次真實訓練結果、時間、資料 SHA256、切分列號與模型係數。

`model.joblib`：儲存 encoder、features、model。只載入自己產生或可信任的 joblib 檔案。

## GitHub Actions / Pages

工作流程已放在儲存庫根目錄 `.github/workflows/startup-pages.yml`。請將整個 `test2` 儲存庫的變更推送到 GitHub，而不是只上傳 `test3`。

1. 到 GitHub 儲存庫 → **Settings → Pages → Build and deployment → Source → GitHub Actions**。
2. 推送到 `main`，或到 **Actions → Train 50 Startups and publish Pages → Run workflow**。
3. 工作流程依序安裝固定版本、訓練、驗證、上傳結果、部署 Pages；Actions 執行頁的 **Summary** 可直接看 RMSE、R² 與所選特徵，**Artifacts** 可下載完整輸出。
4. 成功後，模型報告網址為 `https://xin-bit-cpu.github.io/test2/test3/`；實際網址以 deploy job 顯示為準。

工作流程同時打包既有根目錄的天氣網站檔案，因此根網址維持既有首頁，機器學習報告位於 `/test3/`。若儲存庫另有部署 Pages 的 workflow，應整併為一個，避免互相覆蓋。這份設定不需要自訂 token 或 secret，使用 GitHub 內建 GITHUB_TOKEN 與 Pages OIDC 權限。

若將 `test3` 改成獨立儲存庫，請一併調整 workflow 的 `test3/` 路徑與發布目錄，不要直接沿用目前的外層儲存庫設定。

GitHub 官方說明：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 五種方法參考

Scikit-learn 線性模型：https://scikit-learn.org/stable/modules/linear_model.html

Random Forest：https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestRegressor.html

執行 `python test3/train.py` 會重新產生五種模型所有結果。既有 GitHub Actions 會自動執行相同流程，不需要新增 secret。

## 六個切換按鈕

網頁上方有 Linear Regression、Ridge、Lasso、ElasticNet、Random Forest 五個模型按鈕，以及「五種模型整合比較」。選取模型會同步切換指標、診斷圖、逐筆結果與試算；整合畫面顯示五種方法的同時試算、真實值與五種預測的疊加圖，並可下載 `all_models_predictions.csv`。整合畫面並未建立平均或投票的新模型。原有下拉選單與按鈕會保持同步。

新增 `all_models_predictions.png` 與 `diagnostics_<model>.png`，GitHub Actions 會自動重新產生及發布。
