# 全量分析結果摘要

以下皆為真實訓練輸出；模型依訓練集 CV RMSE 推薦，Test 指標僅做最終評估。

| 資料集 | 分析筆數 | CV 推薦模型 | CV RMSE | Test RMSE | Test R² | 單位 | CV 最佳特徵數 |
|---|---:|---|---:|---:|---:|---|---:|
| King County House Sales | 21,434 | Random Forest Regressor | 144,036.239 | 130,611.907 | 0.8642 | USD | 15 |
| Spotify Tracks | 86,067 | Linear Regression | 15.881 | 15.809 | 0.3633 | 流行度分數 (0–100) | 13 |
| Laptop Price | 1,274 | ElasticNet Regression | 292.309 | 251.295 | 0.8632 | EUR | 9 |
| Bike Sharing Demand | 17,377 | Random Forest Regressor | 101.510 | 113.145 | 0.7367 | 每小時租借次數 | 9 |
| Used Car Price | 6,907 | Random Forest Regressor | 172,653.502 | 134,371.099 | 0.9184 | INR | 10 |
| House Rent Prediction | 4,746 | Random Forest Regressor | 52,647.801 | 35,325.318 | 0.6869 | INR / 月 | 9 |
| Flight Ticket Price | 10,461 | Random Forest Regressor | 2,088.319 | 1,914.615 | 0.8196 | INR | 9 |

各資料集 RMSE 單位不同，不能直接跨資料集排名。最佳特徵數屬 Linear Regression 前向選擇分析，與五模型比較的推薦模型分開。租屋與機票的原始有效欄位不足 11，衍生特徵方案不等於已符合原始數量要求。

詳細指標、選入特徵、學習曲線與動態解讀見各組 `public/data/<id>/report.md`／`results.json`。
