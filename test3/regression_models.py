"""Five regressors with training-only tuning and portable browser exports."""
import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import ElasticNet, Lasso, LinearRegression, Ridge
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def export_estimator(estimator, features):
    if isinstance(estimator, Pipeline):
        scaler, regressor = estimator.named_steps["scale"], estimator.named_steps["regressor"]
        coefficients = regressor.coef_ / scaler.scale_
        return {"kind": "linear", "features": features,
                "intercept": float(regressor.intercept_ - np.dot(coefficients, scaler.mean_)),
                "coefficients": dict(zip(features, coefficients.tolist()))}
    return {"kind": "forest", "features": features, "trees": [
        {"left": tree.tree_.children_left.tolist(), "right": tree.tree_.children_right.tolist(),
         "feature": tree.tree_.feature.tolist(), "threshold": tree.tree_.threshold.tolist(),
         "value": tree.tree_.value[:, 0, 0].tolist()} for tree in estimator.estimators_]}


def predict_export(exported, encoded):
    if exported["kind"] == "linear":
        return exported["intercept"] + sum(encoded[name].to_numpy() * coefficient
                                           for name, coefficient in exported["coefficients"].items())
    values = encoded[exported["features"]].to_numpy(dtype=np.float32)
    predictions = []
    for row in values:
        total = 0.
        for tree in exported["trees"]:
            node = 0
            while tree["left"][node] != -1:
                node = tree["left"][node] if row[tree["feature"][node]] <= tree["threshold"][node] else tree["right"][node]
            total += tree["value"][node]
        predictions.append(total / len(exported["trees"]))
    return np.asarray(predictions)


def train_comparison(x_train, x_test, train, test, cv, out, encoder, metrics):
    definitions = [
        ("linear", "Linear Regression", "一般最小平方法，作為五種模型比較的基準。", LinearRegression(), {}),
        ("ridge", "Ridge", "L2 正則化，縮小係數以控制模型複雜度。", Ridge(), {"regressor__alpha": [.01, .1, 1., 10., 100.]}),
        ("lasso", "Lasso", "L1 正則化，可將部分係數壓縮為零。", Lasso(max_iter=50000, tol=1e-7), {"regressor__alpha": [.1, 1., 10., 100., 1000., 10000.]}),
        ("elasticnet", "ElasticNet", "結合 L1 與 L2 正則化。", ElasticNet(max_iter=50000, tol=1e-7),
         {"regressor__alpha": [.001, .01, .1, 1., 10., 100.], "regressor__l1_ratio": [.1, .5, .9]}),
        ("forest", "Random Forest", "多棵決策樹取平均，可學習非線性關係。", RandomForestRegressor(n_estimators=100, random_state=0, n_jobs=1),
         {"max_depth": [2, 4, None], "min_samples_leaf": [1, 2]})]
    entries, fitted = [], {}
    features = list(x_train.columns)
    for key, name, description, estimator, grid in definitions:
        if key != "forest":
            estimator = Pipeline([("scale", StandardScaler()), ("regressor", estimator)])
        search = GridSearchCV(estimator, grid, cv=cv, scoring="neg_root_mean_squared_error", n_jobs=1, error_score="raise")
        search.fit(x_train, train.Profit)
        model = search.best_estimator_
        prediction = model.predict(x_test)
        exported = export_estimator(model, features)
        np.testing.assert_allclose(predict_export(exported, x_test), prediction, rtol=1e-10)
        records = test.copy()
        records.insert(0, "Row ID", test.index + 1)
        records["Predicted Profit"] = prediction
        records["Residual"] = test.Profit.to_numpy() - prediction
        records.to_csv(out / f"predictions_{key}.csv", index=False, encoding="utf-8-sig")
        joblib.dump({"encoder": encoder, "features": features, "model": model}, out / f"model_{key}.joblib", compress=3)
        entry = {"id": key, "name": name, "description": description,
                 "CV RMSE": float(-search.best_score_), "CV RMSE Std": float(search.cv_results_["std_test_score"][search.best_index_]),
                 "parameters": {name.replace("regressor__", ""): value for name, value in search.best_params_.items()},
                 "metrics": metrics(test.Profit, prediction), "train_metrics": metrics(train.Profit, model.predict(x_train)),
                 "export": exported, "predictions": records.to_dict(orient="records")}
        entries.append(entry)
        fitted[key] = model
    recommended = min(entries, key=lambda entry: entry["CV RMSE"])["id"]
    combined = pd.DataFrame({"Row ID": test.index + 1, "Actual Profit": test.Profit.to_numpy()})
    for entry in entries:
        combined[entry["name"]] = [row["Predicted Profit"] for row in entry["predictions"]]
    combined.to_csv(out / "all_models_predictions.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame([{"Model": e["name"], "CV RMSE": e["CV RMSE"], **e["metrics"],
                   "Parameters": str(e["parameters"])} for e in entries]).to_csv(out / "model_comparison.csv", index=False, encoding="utf-8-sig")
    joblib.dump({"encoder": encoder, "features": features, "models": fitted, "recommended": recommended}, out / "models.joblib", compress=3)
    fig, axes = plt.subplots(1, 2, figsize=(13, 5), layout="constrained")
    fig.suptitle("Green = recommended by training CV; bars show held-out test metrics", fontsize=10)
    labels = [e["name"] for e in entries]
    colors = ["#176e51" if e["id"] == recommended else "#80aaa1" for e in entries]
    for axis, metric, title in [(axes[0], "RMSE", "Test RMSE by Model"), (axes[1], "R-squared", "Test R-squared by Model")]:
        values = [e["metrics"][metric] for e in entries]
        bars = axis.bar(labels, values, color=colors)
        axis.bar_label(bars, fmt="%.4f" if metric == "R-squared" else "%.2f", fontsize=9, padding=4)
        axis.set(title=title, ylabel=metric)
        axis.tick_params(axis="x", rotation=22)
        axis.margins(y=.18)
    fig.savefig(out / "model_comparison.png", dpi=180)
    plt.close(fig)
    fig, axis = plt.subplots(figsize=(13, 5), layout="constrained")
    order = np.argsort(test.index.to_numpy())
    row_ids = (test.index.to_numpy() + 1)[order]
    axis.plot(range(len(test)), test.Profit.to_numpy()[order], "k-o", linewidth=2.5, label="Actual Profit")
    for entry in entries:
        values = np.array([row["Predicted Profit"] for row in entry["predictions"]])[order]
        axis.plot(range(len(test)), values, "--o", markersize=4, label=entry["name"], alpha=.85)
    axis.set(title="All Five Models vs Actual Profit (Same Held-out Samples)", xlabel="Original Row ID (not time)", ylabel="Profit")
    axis.set_xticks(range(len(test)), row_ids)
    axis.grid(alpha=.15)
    axis.legend(ncol=3, fontsize=9)
    fig.savefig(out / "all_models_predictions.png", dpi=180)
    plt.close(fig)
    fig, axes = plt.subplots(2, 5, figsize=(20, 8), layout="constrained")
    for i, entry in enumerate(entries):
        prediction = np.array([p["Predicted Profit"] for p in entry["predictions"]])
        lo, hi = min(test.Profit.min(), prediction.min()), max(test.Profit.max(), prediction.max())
        axes[0, i].scatter(test.Profit, prediction, color="#176e51")
        axes[0, i].plot([lo, hi], [lo, hi], "--", color="#d48c35")
        axes[0, i].set(title=entry["name"], xlabel="Actual Profit", ylabel="Predicted Profit")
        axes[1, i].scatter(prediction, test.Profit - prediction, color="#176e51")
        axes[1, i].axhline(0, linestyle="--", color="#d48c35")
        axes[1, i].set(xlabel="Predicted Profit", ylabel="Residual")
        single, single_axes = plt.subplots(1, 2, figsize=(12, 4.8), layout="constrained")
        single_axes[0].scatter(test.Profit, prediction, color="#176e51")
        single_axes[0].plot([lo, hi], [lo, hi], "--", color="#d48c35")
        single_axes[0].set(title=entry["name"] + " - Actual vs Predicted", xlabel="Actual Profit", ylabel="Predicted Profit")
        single_axes[1].scatter(prediction, test.Profit - prediction, color="#176e51")
        single_axes[1].axhline(0, linestyle="--", color="#d48c35")
        single_axes[1].set(title=entry["name"] + " - Residuals", xlabel="Predicted Profit", ylabel="Residual")
        single.savefig(out / f'diagnostics_{entry["id"]}.png', dpi=160)
        plt.close(single)
    fig.savefig(out / "model_diagnostics.png", dpi=140)
    plt.close(fig)
    return entries, recommended
