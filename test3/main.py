import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score, KFold

import sys
sys.stdout.reconfigure(encoding='utf-8')
# 讀取資料，讓筆記本可獨立執行
url = "https://raw.githubusercontent.com/Avik-Jain/100-Days-Of-ML-Code/master/datasets/50_Startups.csv"
df = pd.read_csv(url)
X = pd.get_dummies(df.drop(columns="Profit"), columns=["State"], drop_first=True, dtype=int)
y = df["Profit"]

# 三種特徵選擇方案
plans = {
    "方案一：研發支出": ["R&D Spend"],
    "方案二：研發+行銷": ["R&D Spend", "Marketing Spend"],
    "方案三：三種支出": ["R&D Spend", "Administration", "Marketing Spend"]
}

cv = KFold(n_splits=5, shuffle=True, random_state=42)
results = []

for name, features in plans.items():
    model = LinearRegression()
    scores = cross_val_score(model, X[features], y, cv=cv, scoring="r2")
    results.append({
        "方案": name,
        "特徵數量": len(features),
        "平均R²": scores.mean(),
        "R²標準差": scores.std()
    })

result_df = pd.DataFrame(results)
print(result_df.sort_values("平均R²", ascending=False).to_string(index=False))
