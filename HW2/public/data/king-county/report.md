# King County House Sales 評估報告

來源：https://www.kaggle.com/datasets/harlfoxem/housesalesprediction

檔案：kc_house_data.csv

SHA256：1fdffaeec5e7656f6c09e29d9daa7e2157479c5f8e3a761758b4bfa43c773202

移除 id 與 date；同一房屋 id 僅保留第一筆，避免重複物件跨集合。

原始有效特徵 18，候選 18，編碼後 87。原始數量要求：符合。

分析 21434 / 清理後 21434 筆；全量分析。random 80/20 + KFold(5, shuffle=True, seed=42)。

推薦模型：Random Forest Regressor（以訓練 CV RMSE 選擇）。

最終學習曲線：Training RMSE 1.082e+05，Validation RMSE 1.439e+05，差距 3.569e+04。差距超過驗證誤差的 20%，有過度擬合跡象。

殘差與預測值的 Pearson r = 0.093。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。

CV 選出 15 個特徵；一個特徵 CV RMSE 2.644e+05，最佳組合 1.634e+05，全部特徵 1.635e+05。

最顯著的編碼後特徵為 numeric__grade；係數表示控制其他輸入後的關聯，不等於因果。

欠擬合評估：訓練集目標標準差 3.709e+05，最大樣本 Training RMSE 1.082e+05。目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。

測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。


## 來源版本
Kaggle version 1；授權：CC0: Public Domain；來源更新：2016-08-25T15:52:49.797Z。
