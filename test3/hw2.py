# -*- coding: utf-8 -*-

# %%
import io
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import requests
import joblib
from IPython.display import display
from sklearn.model_selection import train_test_split, KFold, cross_val_score, learning_curve
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

RANDOM_STATE = 42
DATA_URL = 'https://raw.githubusercontent.com/GettysburgDataScience/datasets/refs/heads/main/kc_house_data.csv'

try:
    response = requests.get(DATA_URL, timeout=35)
    response.raise_for_status()
    df = pd.read_csv(io.BytesIO(response.content))
except requests.RequestException as exc:
    from pathlib import Path
    if Path('kc_house_data.csv').exists():
        df = pd.read_csv('kc_house_data.csv')
        print('GitHub 無法連線，改讀同資料夾 kc_house_data.csv')
    else:
        raise RuntimeError('讀取資料失敗，請在 Colab 上傳 Kaggle 的 kc_house_data.csv') from exc

print('資料形狀：', df.shape)
display(df.head())

# %%
print('欄位：', list(df.columns))
print('\n缺失值：')
display(df.isna().sum().to_frame('missing_count'))
print('\n統計：')
display(df.describe().T)
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].hist(df['price'], bins=50)
axes[0].set(xlabel='Price (USD)', ylabel='Count', title='House Price Distribution')
axes[1].scatter(df['sqft_living'], df['price'], s=9, alpha=.30)
axes[1].set(xlabel='Living Area (sqft)', ylabel='Price (USD)', title='Living Area vs Price')
plt.tight_layout()
plt.show()

# %%
excluded = ['id', 'date', 'zipcode', 'price']
feature_names = [c for c in df.columns if c not in excluded]
assert len(feature_names) == 17, f'原始資料欄位不符預期：{feature_names}'
print('17 個特徵：', feature_names)
X_raw = df[feature_names].apply(pd.to_numeric, errors='coerce')
y = pd.to_numeric(df['price'], errors='coerce')
valid = y.notna()
X_raw, y = X_raw.loc[valid], y.loc[valid]
X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X_raw, y, test_size=0.2, random_state=RANDOM_STATE
)
imputer = SimpleImputer(strategy='median')
X_train = pd.DataFrame(imputer.fit_transform(X_train_raw), columns=feature_names, index=X_train_raw.index)
X_test = pd.DataFrame(imputer.transform(X_test_raw), columns=feature_names, index=X_test_raw.index)
print('Train / Test:', X_train.shape, X_test.shape)

# %%
def evaluate(y_true, prediction):
    mse = mean_squared_error(y_true, prediction)
    return {'MAE': mean_absolute_error(y_true, prediction), 'MSE': mse,
            'RMSE': np.sqrt(mse), 'R-squared': r2_score(y_true, prediction)}

baseline = LinearRegression().fit(X_train, y_train)
print('Baseline (all 17 features), Test metrics:')
display(pd.DataFrame([evaluate(y_test, baseline.predict(X_test))]).round(4))

# %%
cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
selected = []
records = []

for count in range(1, len(feature_names) + 1):
    candidate_scores = []
    for feature in feature_names:
        if feature in selected:
            continue
        candidate = selected + [feature]
        cv_scores = cross_val_score(
            LinearRegression(), X_train[candidate], y_train,
            cv=cv, scoring='neg_mean_squared_error', n_jobs=-1
        )
        cv_rmse = np.sqrt(-cv_scores).mean()
        candidate_scores.append((cv_rmse, feature))
    best_cv, best_feature = min(candidate_scores, key=lambda item: item[0])
    selected.append(best_feature)
    model = LinearRegression().fit(X_train[selected], y_train)
    test_metrics = evaluate(y_test, model.predict(X_test[selected]))
    records.append({
        'Number of Features': count,
        'Selected Features': selected.copy(),
        'CV RMSE': best_cv,
        'RMSE': test_metrics['RMSE'],
        'R-squared': test_metrics['R-squared']
    })
    print(f'{count:2d}/17  +{best_feature:16s}  CV RMSE={best_cv:,.0f}')

results_df = pd.DataFrame(records)
display(results_df)

best_row = results_df.loc[results_df['CV RMSE'].idxmin()]
best_features = list(best_row['Selected Features'])
print('\n交叉驗證選出的方案：', len(best_features), '個特徵', best_features)
print(f'CV RMSE: ${best_row["CV RMSE"]:,.2f}')

# %%
fig = plt.figure(figsize=(18, 12))
gs = fig.add_gridspec(2, 2, height_ratios=[2.3, 2.2], hspace=0.36, wspace=0.23)
ax_rmse = fig.add_subplot(gs[0, 0])
ax_r2 = fig.add_subplot(gs[0, 1])
ax_table = fig.add_subplot(gs[1, :])
ax_table.axis('off')
xs = results_df['Number of Features']
ax_rmse.plot(xs, results_df['RMSE'], '-o', label='Test RMSE')
ax_rmse.set(title='RMSE by Number of Features', xlabel='Number of Features', ylabel='RMSE (USD)')
ax_rmse.set_xticks(xs)
ax_rmse.grid(alpha=.15)
ax_r2.plot(xs, results_df['R-squared'], '-o', label='Test R-squared')
ax_r2.set(title='R-squared by Number of Features', xlabel='Number of Features', ylabel='R-squared')
ax_r2.set_xticks(xs)
ax_r2.grid(alpha=.15)
rows = [[str(int(r['Number of Features'])), ', '.join(r['Selected Features']),
         f"{r['RMSE']:,.2f}", f"{r['R-squared']:.5f}"] for _, r in results_df.iterrows()]
t = ax_table.table(cellText=rows,
    colLabels=['Number of Features', 'Selected Features', 'RMSE', 'R-squared'],
    colWidths=[.14, .61, .13, .12], cellLoc='left', loc='center')
t.auto_set_font_size(False)
t.set_fontsize(8)
t.scale(1, 1.22)
for (r, c), cell in t.get_celld().items():
    cell.set_linewidth(0)
    if r == 0: cell.set_text_props(weight='bold')
    elif r % 2 == 0: cell.set_facecolor('#F2F2F2')
plt.savefig('King_County_RMSE_R2_Feature_Chart.png', dpi=180, bbox_inches='tight')
plt.show()

# %%
final_model = LinearRegression().fit(X_train[best_features], y_train)
y_pred = final_model.predict(X_test[best_features])
score = evaluate(y_test, y_pred)
print('最終特徵：', best_features)
print('Intercept:', final_model.intercept_)
display(pd.DataFrame({'Feature': best_features, 'Coefficient': final_model.coef_}))
display(pd.DataFrame([score]).round(4))
comparison = pd.DataFrame({'Actual Price': y_test.to_numpy(), 'Predicted Price': y_pred,
                           'Residual': y_test.to_numpy() - y_pred})
display(comparison.head(20).round(2))
fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
axes[0].scatter(y_test, y_pred, alpha=.3, s=12)
lo, hi = min(y_test.min(), y_pred.min()), max(y_test.max(), y_pred.max())
axes[0].plot([lo, hi], [lo, hi], 'r--')
axes[0].set(xlabel='Actual Price', ylabel='Predicted Price', title='Actual vs Predicted')
axes[1].scatter(y_pred, y_test.to_numpy()-y_pred, alpha=.3, s=12)
axes[1].axhline(0, linestyle='--', color='red')
axes[1].set(xlabel='Predicted Price', ylabel='Residual', title='Residual Plot')
plt.tight_layout()
plt.savefig('King_County_Prediction_Residual.png', dpi=160, bbox_inches='tight')
plt.show()

# %%
sizes, train_s, val_s = learning_curve(
    LinearRegression(), X_train[best_features], y_train,
    cv=cv, train_sizes=np.linspace(0.2, 1.0, 6),
    scoring='neg_mean_squared_error', n_jobs=-1
)
plt.figure(figsize=(8, 4.5))
plt.plot(sizes, np.sqrt(-train_s).mean(axis=1), '-o', label='Training RMSE')
plt.plot(sizes, np.sqrt(-val_s).mean(axis=1), '-o', label='Validation RMSE')
plt.xlabel('Training Samples'); plt.ylabel('RMSE (USD)')
plt.title('Learning Curve: Training vs Validation')
plt.legend(); plt.grid(alpha=.2); plt.tight_layout(); plt.show()

# %%
bundle = {
    'imputer': imputer, 'all_features': feature_names,
    'selected_features': best_features, 'model': final_model
}
joblib.dump(bundle, 'King_County_House_Price_Model.joblib', compress=3)
results_df.to_csv('King_County_Forward_Selection.csv', index=False, encoding='utf-8-sig')
comparison.to_csv('King_County_Predictions.csv', index=False, encoding='utf-8-sig')
print('已儲存模型、CSV、圖表。')
# 讀回模型驗證
loaded = joblib.load('King_County_House_Price_Model.joblib')
example = X_test_raw.iloc[[0]]
example_imputed = pd.DataFrame(loaded['imputer'].transform(example), columns=loaded['all_features'])
print('測試重新載入預測：', float(loaded['model'].predict(example_imputed[loaded['selected_features']])[0]))
