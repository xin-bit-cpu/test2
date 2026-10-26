# Spotify Tracks 評估報告

來源：https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset

檔案：dataset.csv

SHA256：be5216c0c811283c5db3e3af83cffa59873cc5fa375222f3280782776e289176

依 track_id 去重；移除索引、曲名、專輯、藝人與 track_id，保留音訊特徵與曲風。

原始有效特徵 15，候選 15，編碼後 127。原始數量要求：符合。

分析 86067 / 清理後 86067 筆；全量分析。random 80/20 + KFold(5, shuffle=True, seed=42)。

推薦模型：Linear Regression（以訓練 CV RMSE 選擇）。

最終學習曲線：Training RMSE 15.84，Validation RMSE 15.88，差距 0.04147。依此差距尚無強烈過度擬合證據。

殘差與預測值的 Pearson r = -0.003。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。

CV 選出 13 個特徵；一個特徵 CV RMSE 15.93，最佳組合 15.88，全部特徵 15.88。

最顯著的編碼後特徵為 categorical__track_genre_iranian；係數表示控制其他輸入後的關聯，不等於因果。

欠擬合評估：訓練集目標標準差 19.84，最大樣本 Training RMSE 15.84。目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。

測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。


## 來源版本
Kaggle version 1；授權：Database: Open Database, Contents: © Original Authors；來源更新：2022-10-22T14:40:15.3Z。
