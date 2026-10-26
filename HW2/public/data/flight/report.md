# Flight Ticket Price 評估報告

來源：https://www.kaggle.com/datasets/nikhilmittal/flight-fare-prediction-mh

檔案：Data_Train.xlsx

SHA256：c0a87e088177a0858e28cb0dec5d1c1c1b7ecb13904623dd5bcc72f4a381a68a

此版本為 XLSX 而非 CSV，讀取後核對全部原始欄位。原始 10 個輸入不足 11；日期／時間拆解提供合理方案。排除可能反映價格的 Additional_Info，Route 與 Source/Destination/停站重複而排除。

原始有效特徵 8，候選 12，編碼後 32。原始數量要求：不符合；採特徵工程方案，需教師認可。

分析 10461 / 清理後 10461 筆；全量分析。random 80/20 + KFold(5, shuffle=True, seed=42)。

推薦模型：Random Forest Regressor（以訓練 CV RMSE 選擇）。

最終學習曲線：Training RMSE 1697，Validation RMSE 2089，差距 391.7。依此差距尚無強烈過度擬合證據。

殘差與預測值的 Pearson r = 0.063。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。

CV 選出 9 個特徵；一個特徵 CV RMSE 3552，最佳組合 2833，全部特徵 2834。

最顯著的編碼後特徵為 numeric__duration_minutes；係數表示控制其他輸入後的關聯，不等於因果。

欠擬合評估：訓練集目標標準差 4653，最大樣本 Training RMSE 1697。目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。

測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。


## 來源版本
Kaggle version 1；授權：Unknown；來源更新：2019-03-15T19:43:45.257Z。
