# Laptop Price 評估報告

來源：https://www.kaggle.com/datasets/muhammetvarl/laptop-price

檔案：laptop_price.csv

SHA256：242f67dad13cce1609e0b7ffa41fae25ce24e764ab1e4823084d8b67c7e956fa

來源目標為 Price_euros，統一映射為 Price；移除 laptop_ID。Product 使用產品系列首字，CPU/GPU 使用廠牌與系列，降低稀疏類別。

原始有效特徵 11，候選 11，編碼後 325。原始數量要求：符合。

分析 1274 / 清理後 1274 筆；全量分析。random 80/20 + KFold(5, shuffle=True, seed=42)。

推薦模型：ElasticNet Regression（以訓練 CV RMSE 選擇）。

最終學習曲線：Training RMSE 224.4，Validation RMSE 292.3，差距 67.9。差距超過驗證誤差的 20%，有過度擬合跡象。

殘差與預測值的 Pearson r = 0.104。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。

CV 選出 9 個特徵；一個特徵 CV RMSE 483.7，最佳組合 301.5，全部特徵 308.4。

最顯著的編碼後特徵為 categorical__Cpu_Intel Xeon；係數表示控制其他輸入後的關聯，不等於因果。

欠擬合評估：訓練集目標標準差 705.5，最大樣本 Training RMSE 224.4。目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。

測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。


## 來源版本
Kaggle version 1；授權：Other (specified in description)；來源更新：2020-11-05T10:56:42.253Z。
