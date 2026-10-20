
# =====================================================
# 50 Startups Multiple Linear Regression
# CRISP-DM + Forward Selection + Visualization
# =====================================================

# Step 0：匯入套件

import io
import pickle
import gzip
import inspect
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import requests
import joblib

from IPython.display import display
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, SGDRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)
from sklearn.model_selection import (
    train_test_split,
    KFold,
    cross_val_score,
    learning_curve
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 0

# =====================================================
# CRISP-DM Step 1：Business Understanding
# 目標：使用公司支出與州別預測 Profit
# =====================================================

print("研究目標：預測 50 家新創公司的利潤")

# =====================================================
# CRISP-DM Step 2：Data Understanding
# 讀取 GitHub 的 50 Startups 資料
# =====================================================

url = (
    "https://raw.githubusercontent.com/"
    "Avik-Jain/100-Days-Of-ML-Code/"
    "master/datasets/50_Startups.csv"
)

try:
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    df = pd.read_csv(io.StringIO(response.text))
    print("成功從 GitHub 讀取資料")
except requests.RequestException:
    if Path("50_Startups.csv").exists():
        df = pd.read_csv("50_Startups.csv")
        print("使用本機 CSV")
    else:
        raise RuntimeError(
            "無法讀取資料，請確認網路或上傳 50_Startups.csv"
        )

required = [
    "R&D Spend",
    "Administration",
    "Marketing Spend",
    "State",
    "Profit"
]

if not set(required).issubset(df.columns):
    raise ValueError("資料欄位不符合預期")

print("\n資料大小：", df.shape)
print("\n資料前五筆：")
display(df.head())

print("\n欄位資訊：")
df.info()

print("\n缺失值：")
display(df.isnull().sum())

print("\n描述統計：")
display(df.describe(include="all"))

print("\n相關係數：")
display(df.select_dtypes(include="number").corr())

# 資料分布散點圖
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].scatter(df["R&D Spend"], df["Profit"])
axes[0].set_title("R&D Spend vs Profit")
axes[0].set_xlabel("R&D Spend")
axes[0].set_ylabel("Profit")

axes[1].scatter(df["Marketing Spend"], df["Profit"])
axes[1].set_title("Marketing Spend vs Profit")
axes[1].set_xlabel("Marketing Spend")
axes[1].set_ylabel("Profit")

plt.tight_layout()
plt.show()

# =====================================================
# CRISP-DM Step 3：Data Preparation
# 缺失值、One-Hot Encoding、Train/Test Split
# =====================================================

numeric_cols = [
    "R&D Spend",
    "Administration",
    "Marketing Spend"
]
cat_cols = ["State"]

X_raw = df[numeric_cols + cat_cols]
y = df["Profit"].astype(float)

X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X_raw,
    y,
    test_size=0.2,
    random_state=RANDOM_STATE
)

# 相容新版與舊版 sklearn
encoder_kwargs = {
    "drop": "first",
    "handle_unknown": "ignore"
}

if "sparse_output" in inspect.signature(
    OneHotEncoder
).parameters:
    encoder_kwargs["sparse_output"] = False
else:
    encoder_kwargs["sparse"] = False

preprocessor = ColumnTransformer(
    transformers=[
        (
            "num",
            SimpleImputer(strategy="median"),
            numeric_cols
        ),
        (
            "state",
            Pipeline([
                (
                    "imputer",
                    SimpleImputer(strategy="most_frequent")
                ),
                (
                    "onehot",
                    OneHotEncoder(**encoder_kwargs)
                )
            ]),
            cat_cols
        )
    ],
    remainder="drop",
    verbose_feature_names_out=False
)

train_array = preprocessor.fit_transform(X_train_raw)
test_array = preprocessor.transform(X_test_raw)

feature_names = list(
    preprocessor.get_feature_names_out()
)

X_train = pd.DataFrame(
    train_array,
    columns=feature_names,
    index=X_train_raw.index
)

X_test = pd.DataFrame(
    test_array,
    columns=feature_names,
    index=X_test_raw.index
)

print("\n訓練資料筆數：", len(X_train))
print("測試資料筆數：", len(X_test))
print("特徵名稱：", feature_names)

# =====================================================
# CRISP-DM Step 4：Modeling
# Multiple Linear Regression
# =====================================================

def metrics(y_true, y_pred):
    mse = mean_squared_error(y_true, y_pred)
    return {
        "MAE": mean_absolute_error(y_true, y_pred),
        "MSE": mse,
        "RMSE": np.sqrt(mse),
        "R-squared": r2_score(y_true, y_pred)
    }

# 全部特徵 Baseline
baseline = LinearRegression()
baseline.fit(X_train, y_train)

baseline_train_pred = baseline.predict(X_train)
baseline_test_pred = baseline.predict(X_test)

print("\nBaseline 訓練結果：")
print(metrics(y_train, baseline_train_pred))

print("\nBaseline 測試結果：")
print(metrics(y_test, baseline_test_pred))

# 梯度下降比較：標準化特徵，讓 SGD 的更新步幅較穩定
gradient_descent_model = Pipeline([
    ("scaler", StandardScaler()),
    (
        "regressor",
        SGDRegressor(
            loss="squared_error",
            penalty=None,
            max_iter=10000,
            tol=1e-6,
            learning_rate="adaptive",
            eta0=0.01,
            random_state=RANDOM_STATE
        )
    )
])

gradient_descent_model.fit(X_train, y_train)
gradient_descent_pred = gradient_descent_model.predict(X_test)

print("\nSGD 梯度下降模型測試結果：")
print(metrics(y_test, gradient_descent_pred))

# =====================================================
# Forward Selection（前向特徵選擇）
# 使用訓練集的 5-Fold Cross Validation
# =====================================================

cv = KFold(
    n_splits=5,
    shuffle=True,
    random_state=RANDOM_STATE
)

selected = []
rows = []

for k in range(1, len(feature_names) + 1):

    remaining = [
        f for f in feature_names
        if f not in selected
    ]

    candidates = []

    for feature in remaining:

        candidate = selected + [feature]

        scores = cross_val_score(
            LinearRegression(),
            X_train[candidate],
            y_train,
            cv=cv,
            scoring="neg_root_mean_squared_error"
        )

        cv_rmse = -scores.mean()

        candidates.append(
            (cv_rmse, feature)
        )

    chosen_cv_rmse, chosen_feature = min(
        candidates,
        key=lambda item: item[0]
    )

    selected.append(chosen_feature)

    model = LinearRegression()
    model.fit(X_train[selected], y_train)

    train_pred = model.predict(X_train[selected])
    test_pred = model.predict(X_test[selected])

    train_result = metrics(y_train, train_pred)
    test_result = metrics(y_test, test_pred)

    rows.append({
        "Number of Features": k,
        "Selected Features": selected.copy(),
        "CV RMSE (train)": chosen_cv_rmse,
        "Train RMSE": train_result["RMSE"],
        "RMSE": test_result["RMSE"],
        "R-squared": test_result["R-squared"]
    })

results_df = pd.DataFrame(rows)

print("\nForward Selection 結果：")
display(results_df)

# 依交叉驗證 RMSE 選最佳方案
best_index = results_df["CV RMSE (train)"].idxmin()
best_features = results_df.loc[
    best_index, "Selected Features"
]

final_model = LinearRegression()
final_model.fit(
    X_train[best_features],
    y_train
)

y_pred = final_model.predict(
    X_test[best_features]
)

print("\n========== 最佳方案 ==========")
print("選取特徵：", best_features)
print("Intercept：", final_model.intercept_)
print(
    "Coefficients：",
    dict(zip(best_features, final_model.coef_))
)

print("\n最終模型評估：")
print(metrics(y_test, y_pred))

# =====================================================
# CRISP-DM Step 5：Evaluation
# RMSE / R² 雙折線圖 + 特徵比較表
# =====================================================

fig = plt.figure(figsize=(16, 9.5))

gs = fig.add_gridspec(
    2, 2,
    height_ratios=[3, 1.45],
    hspace=0.44,
    wspace=0.23
)

ax1 = fig.add_subplot(gs[0, 0])
ax2 = fig.add_subplot(gs[0, 1])
ax_table = fig.add_subplot(gs[1, :])

ax_table.axis("off")

counts = results_df["Number of Features"]

# 左圖 RMSE
ax1.plot(
    counts,
    results_df["RMSE"],
    marker="o",
    linewidth=2
)

ax1.set_title("RMSE by Number of Features")
ax1.set_xlabel("Number of Features")
ax1.set_ylabel("RMSE")
ax1.set_xticks(counts)
ax1.grid(alpha=0.12)

# 右圖 R²
ax2.plot(
    counts,
    results_df["R-squared"],
    marker="o",
    linewidth=2
)

ax2.set_title("R-squared by Number of Features")
ax2.set_xlabel("Number of Features")
ax2.set_ylabel("R-squared")
ax2.set_xticks(counts)
ax2.grid(alpha=0.12)

# 下方表格
table_rows = []

for _, row in results_df.iterrows():
    table_rows.append([
        str(int(row["Number of Features"])),
        "[" + ", ".join(row["Selected Features"]) + "]",
        f'{row["RMSE"]:.6f}',
        f'{row["R-squared"]:.6f}'
    ])

table = ax_table.table(
    cellText=table_rows,
    colLabels=[
        "Number of Features",
        "Selected Features",
        "RMSE",
        "R-squared"
    ],
    colWidths=[0.16, 0.53, 0.15, 0.16],
    cellLoc="left",
    loc="center"
)

table.auto_set_font_size(False)
table.set_fontsize(9)
table.scale(1, 1.85)

for (i, j), cell in table.get_celld().items():
    cell.set_linewidth(0)

    if i == 0:
        cell.set_text_props(weight="bold")
        cell.set_facecolor("#FFFFFF")
    else:
        cell.set_facecolor(
            "#F2F2F2" if i % 2 == 0 else "#FFFFFF"
        )

plt.savefig(
    "50_Startups_RMSE_R2_雙折線圖與表格.png",
    dpi=220,
    bbox_inches="tight"
)

plt.show()

# 匯出特徵結果
results_df.to_csv(
    "50_Startups_Forward_Selection_結果.csv",
    index=False,
    encoding="utf-8-sig"
)

# =====================================================
# 圖二：Actual vs Predicted + Residual Plot
# =====================================================

fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

axes[0].scatter(y_test, y_pred)

lo = min(y_test.min(), y_pred.min())
hi = max(y_test.max(), y_pred.max())

axes[0].plot(
    [lo, hi],
    [lo, hi],
    "r--",
    label="Ideal Prediction"
)

axes[0].set_title("Actual vs Predicted Profit")
axes[0].set_xlabel("Actual Profit")
axes[0].set_ylabel("Predicted Profit")
axes[0].legend()

residuals = y_test.to_numpy() - y_pred

axes[1].scatter(y_pred, residuals)
axes[1].axhline(
    0,
    color="red",
    linestyle="--"
)

axes[1].set_title("Residual Plot")
axes[1].set_xlabel("Predicted Profit")
axes[1].set_ylabel("Residual")

plt.tight_layout()
plt.show()

prediction_df = pd.DataFrame({
    "Actual Profit": y_test.to_numpy(),
    "Predicted Profit": y_pred,
    "Residual": residuals
})

print("\n實際值與預測值比較：")
display(prediction_df.round(2))

# =====================================================
# 圖三：Learning Curve
# 判斷 Overfitting / Underfitting
# =====================================================

sizes, train_scores, valid_scores = learning_curve(
    LinearRegression(),
    X_train[best_features],
    y_train,
    cv=KFold(
        n_splits=5,
        shuffle=True,
        random_state=RANDOM_STATE
    ),
    train_sizes=np.linspace(0.35, 1.0, 6),
    scoring="neg_root_mean_squared_error"
)

plt.figure(figsize=(8, 4.5))

plt.plot(
    sizes,
    -train_scores.mean(axis=1),
    "-o",
    label="Training RMSE"
)

plt.plot(
    sizes,
    -valid_scores.mean(axis=1),
    "-o",
    label="Validation RMSE"
)

plt.xlabel("Training Samples")
plt.ylabel("RMSE")
plt.title("Learning Curve: Training vs Validation")
plt.legend()
plt.grid(alpha=0.2)
plt.tight_layout()
plt.show()

# =====================================================
# CRISP-DM Step 6：Deployment
# 儲存模型 joblib / gzip + pickle
# =====================================================

bundle = {
    "preprocessor": preprocessor,
    "feature_names": feature_names,
    "selected_features": best_features,
    "model": final_model,
    "input_columns": numeric_cols + cat_cols
}

joblib.dump(
    bundle,
    "50_Startups_Model.joblib",
    compress=3
)

with gzip.open(
    "50_Startups_Model.pkl.gz",
    "wb"
) as f:
    pickle.dump(bundle, f)

print("\n模型儲存完成！")

# 測試重新載入模型
loaded = joblib.load("50_Startups_Model.joblib")

new_data = X_test_raw.iloc[[0]]

transformed = loaded["preprocessor"].transform(
    new_data
)

prepared = pd.DataFrame(
    transformed,
    columns=loaded["feature_names"],
    index=new_data.index
)

new_profit = loaded["model"].predict(
    prepared[loaded["selected_features"]]
)

print("\n測試資料：")
display(new_data)

print(
    "預測 Profit：",
    round(float(new_profit[0]), 2)
)

print("\n全部程式執行完成！")
