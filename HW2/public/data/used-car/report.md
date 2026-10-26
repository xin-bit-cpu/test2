# Used Car Price 評估報告

來源：https://www.kaggle.com/datasets/nehalbirla/vehicle-dataset-from-cardekho

檔案：Car details v3.csv

SHA256：31ae89671a23175f4b3bd9553d6dfbcd50f13908152d98d23ac9d4f5a9eab543

較小的 car data.csv 不符合欄位下限，因此選 v3 的 12 個原始輸入欄位。selling_price 映射 Selling_Price；車名轉品牌、規格字串取數值。

原始有效特徵 12，候選 12，編碼後 51。原始數量要求：符合。

分析 6907 / 清理後 6907 筆；全量分析。random 80/20 + KFold(5, shuffle=True, seed=42)。

推薦模型：Random Forest Regressor（以訓練 CV RMSE 選擇）。

最終學習曲線：Training RMSE 1.162e+05，Validation RMSE 1.727e+05，差距 5.648e+04。差距超過驗證誤差的 20%，有過度擬合跡象。

殘差與預測值的 Pearson r = 0.053。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。

CV 選出 10 個特徵；一個特徵 CV RMSE 3.8e+05，最佳組合 2.781e+05，全部特徵 2.786e+05。

最顯著的編碼後特徵為 numeric__max_power；係數表示控制其他輸入後的關聯，不等於因果。

欠擬合評估：訓練集目標標準差 5.321e+05，最大樣本 Training RMSE 1.162e+05。目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。

測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。


## 來源版本
Kaggle version 4；授權：Database: Open Database, Contents: Database Contents；來源更新：2023-01-14T19:35:33.217Z。
