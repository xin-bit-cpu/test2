# House Rent Prediction 評估報告

來源：https://www.kaggle.com/datasets/iamsouravbanerjee/house-rent-prediction-dataset

檔案：House_Rent_Dataset.csv

SHA256：3f55079d82eadec1aac339b72fd55bb9e379cdbbbb88fe5f4d2b35f91f8ec711

排除聯絡人 Point of Contact；原始有效欄位不足 11，不宣稱符合。Posted On 拆年月日／星期，Floor 拆所在樓層／總樓層，屬可解釋特徵工程方案。

原始有效特徵 10，候選 14，編碼後 1942。原始數量要求：不符合；採特徵工程方案，需教師認可。

分析 4746 / 清理後 4746 筆；全量分析。random 80/20 + KFold(5, shuffle=True, seed=42)。

推薦模型：Random Forest Regressor（以訓練 CV RMSE 選擇）。

最終學習曲線：Training RMSE 5.315e+04，Validation RMSE 5.263e+04，差距 -523.9。依此差距尚無強烈過度擬合證據。

殘差與預測值的 Pearson r = -0.015。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。

CV 選出 9 個特徵；一個特徵 CV RMSE 6.637e+04，最佳組合 5.974e+04，全部特徵 7.261e+04。

最顯著的編碼後特徵為 numeric__Size；係數表示控制其他輸入後的關聯，不等於因果。

欠擬合評估：訓練集目標標準差 8.142e+04，最大樣本 Training RMSE 5.315e+04。目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。

測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。


## 來源版本
Kaggle version 9；授權：Other (specified in description)；來源更新：2022-08-20T13:49:03.81Z。
