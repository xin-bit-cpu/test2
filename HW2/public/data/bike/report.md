# Bike Sharing Demand 評估報告

來源：https://www.kaggle.com/datasets/marklvl/bike-sharing-dataset

檔案：hour.csv

SHA256：1fb548d6c9224121b64b7a480fe3030f8d73093a510f79bfce58ed33dc54b33d

使用相同 Capital Bikeshare/UCI 來源的 Kaggle hourly 版本；cnt 映射 count。casual + registered = cnt，兩欄必須排除；移除 instant、dteday。採時間順序 80/20 與 TimeSeriesSplit。

原始有效特徵 12，候選 12，編碼後 61。原始數量要求：符合。

分析 17377 / 清理後 17377 筆；全量分析。chronological 80/20 + TimeSeriesSplit(5)。

推薦模型：Random Forest Regressor（以訓練 CV RMSE 選擇）。

最終學習曲線：Training RMSE 22.77，Validation RMSE 144.4，差距 121.6。差距超過驗證誤差的 20%，有過度擬合跡象。

殘差與預測值的 Pearson r = 0.337。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。

CV 選出 9 個特徵；一個特徵 CV RMSE 133.7，最佳組合 107.1，全部特徵 108.8。

最顯著的編碼後特徵為 numeric__atemp；係數表示控制其他輸入後的關聯，不等於因果。

欠擬合評估：訓練集目標標準差 167，最大樣本 Training RMSE 22.77。目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。

測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。


## 來源版本
Kaggle version 1；授權：CC0: Public Domain；來源更新：2018-05-28T11:31:09.217Z。
