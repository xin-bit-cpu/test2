"""Train 50 Startups regression and build a portable GitHub Pages report.

Run from any directory: python test3/train.py
Feature selection only sees the training split. The test split is for reporting.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import textwrap

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parent
NUMERIC = ["R&D Spend", "Administration", "Marketing Spend"]
STATES = ["California", "Florida", "New York"]
SOURCE = "https://gist.githubusercontent.com/GaneshSparkz/b5662effbdae8746f7f7d8ed70c42b2d/raw/faf8b1a0d58e251f48a647d3881e7a960c3f0925/50_Startups.csv"


def metrics(actual, predicted):
    mse = float(mean_squared_error(actual, predicted))
    return {"MAE": float(mean_absolute_error(actual, predicted)), "MSE": mse,
            "RMSE": float(np.sqrt(mse)), "R-squared": float(r2_score(actual, predicted))}


def load_data(path):
    df = pd.read_csv(path)
    required = NUMERIC + ["State", "Profit"]
    if not set(required).issubset(df.columns):
        raise ValueError(f"CSV must contain {required}")
    df = df[required].copy()
    if len(df) < 20 or df.isna().any().any():
        raise ValueError("Need at least 20 complete rows; missing values must be corrected.")
    for name in NUMERIC + ["Profit"]:
        df[name] = pd.to_numeric(df[name], errors="raise")
    if not np.isfinite(df[NUMERIC + ["Profit"]].to_numpy()).all():
        raise ValueError("Numeric values must be finite.")
    if not df["State"].isin(STATES).all():
        raise ValueError(f"State must be one of {STATES}")
    if (df[NUMERIC] < 0).any().any() or df.Profit.nunique() < 2:
        raise ValueError("Spending must be nonnegative; Profit must vary.")
    return df


def encode(df, encoder):
    names = NUMERIC + list(encoder.get_feature_names_out(["State"]))
    values = np.column_stack([df[NUMERIC].to_numpy(), encoder.transform(df[["State"]])])
    return pd.DataFrame(values, columns=names, index=df.index)


def plot_selection(rows, destination):
    fig = plt.figure(figsize=(18, 11), layout="constrained")
    gs = fig.add_gridspec(2, 2, height_ratios=[2.7, 1.5])
    counts = [r["Number of Features"] for r in rows]
    for col, key, title in [(0, "RMSE", "RMSE by Number of Features"),
                            (1, "R-squared", "R-squared by Number of Features")]:
        ax = fig.add_subplot(gs[0, col])
        ax.plot(counts, [r[key] for r in rows], "o-", color="#2677bb", linewidth=2)
        ax.set(title=title, xlabel="Number of Features", ylabel=key, xticks=counts)
        ax.grid(alpha=.15)
    ax = fig.add_subplot(gs[1, :])
    ax.axis("off")
    cells = [[r["Number of Features"], textwrap.fill(", ".join(r["Selected Features"]), 70),
              f'{r["RMSE"]:.6f}', f'{r["R-squared"]:.6f}'] for r in rows]
    table = ax.table(cellText=cells, colLabels=["Number of Features", "Selected Features", "Test RMSE", "Test R-squared"],
                     colWidths=[.13, .59, .15, .13], cellLoc="left", bbox=[0, .05, 1, .9])
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    for (r, c), cell in table.get_celld().items():
        cell.set_linewidth(0)
        cell.set_facecolor("#f0f3f7" if r % 2 == 0 else "white")
        if r == 0:
            cell.set_text_props(weight="bold")
    fig.savefig(destination, dpi=180)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "50_Startups.csv")
    parser.add_argument("--output", type=Path, default=ROOT / "site")
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    df = load_data(args.data)
    train, test = train_test_split(df, test_size=.2, random_state=0)
    # Categories are a fixed schema, not inferred using validation/test data.
    encoder = OneHotEncoder(categories=[STATES], drop="first", sparse_output=False,
                            handle_unknown="error").fit(train[["State"]])
    x_train, x_test = encode(train, encoder), encode(test, encoder)
    cv = KFold(n_splits=5, shuffle=True, random_state=0)
    from regression_models import train_comparison
    model_comparison, recommended = train_comparison(x_train, x_test, train, test, cv, out, encoder, metrics)
    selected, rows, models = [], [], []
    for count in range(1, len(x_train.columns) + 1):
        candidates = []
        for feature in x_train.columns:
            if feature in selected:
                continue
            columns = selected + [feature]
            scores = -cross_val_score(LinearRegression(), x_train[columns], train.Profit,
                                     cv=cv, scoring="neg_root_mean_squared_error")
            candidates.append((float(scores.mean()), feature, float(scores.std())))
        score, feature, std = min(candidates, key=lambda item: item[0])
        selected.append(feature)
        model = LinearRegression().fit(x_train[selected], train.Profit)
        rows.append({"Number of Features": count, "Selected Features": selected.copy(),
                     "CV RMSE": score, "CV RMSE Std": std,
                     **metrics(test.Profit, model.predict(x_test[selected]))})
        models.append(model)
    # Freeze the choice based on training CV, never the displayed test metrics.
    best_index = min(range(len(rows)), key=lambda i: rows[i]["CV RMSE"])
    best = rows[best_index]
    model = models[best_index]
    features = best["Selected Features"]
    prediction = model.predict(x_test[features])
    comparison = test.copy()
    comparison.insert(0, "Row ID", test.index + 1)
    comparison["Predicted Profit"] = prediction
    comparison["Residual"] = test.Profit.to_numpy() - prediction
    comparison.to_csv(out / "predictions.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(rows).to_csv(out / "50_Startups_Feature_Selection.csv", index=False, encoding="utf-8-sig")
    plot_selection(rows, out / "50_Startups_Feature_Selection.png")
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.8), layout="constrained")
    lo, hi = min(test.Profit.min(), prediction.min()), max(test.Profit.max(), prediction.max())
    axes[0].scatter(test.Profit, prediction, color="#2677bb")
    axes[0].plot([lo, hi], [lo, hi], "--", color="#d48c35", label="Ideal prediction")
    axes[0].set(title="Actual vs Predicted Profit", xlabel="Actual Profit", ylabel="Predicted Profit")
    axes[0].legend()
    axes[1].scatter(prediction, comparison.Residual, color="#2677bb")
    axes[1].axhline(0, linestyle="--", color="#d48c35")
    axes[1].set(title="Residual Plot", xlabel="Predicted Profit", ylabel="Actual - Predicted")
    fig.savefig(out / "prediction_diagnostics.png", dpi=180)
    plt.close(fig)
    bundle = {"encoder": encoder, "features": features, "model": model}
    joblib.dump(bundle, out / "model.joblib", compress=3)
    loaded = joblib.load(out / "model.joblib")
    np.testing.assert_allclose(loaded["model"].predict(encode(test, loaded["encoder"])[loaded["features"]]), prediction)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(), "source": SOURCE,
        "data_sha256": hashlib.sha256(args.data.read_bytes()).hexdigest(),
        "sklearn_version": sklearn.__version__, "seed": 0, "samples": len(df),
        "train_samples": len(train), "test_samples": len(test), "folds": 5,
        "train_row_ids": (train.index + 1).tolist(), "test_row_ids": (test.index + 1).tolist(),
        "selection": rows, "best": best, "metrics": metrics(test.Profit, prediction),
        "models": model_comparison, "recommended_model": recommended,
        "train_metrics": metrics(train.Profit, model.predict(x_train[features])),
        "model": {"intercept": float(model.intercept_),
                  "coefficients": dict(zip(features, model.coef_.tolist()))},
        "ranges": {c: {"min": float(train[c].min()), "max": float(train[c].max())} for c in NUMERIC},
        "predictions": comparison.to_dict(orient="records")}
    payload = json.dumps(report, ensure_ascii=False, allow_nan=False, indent=2)
    (out / "results.json").write_text(payload, encoding="utf-8")
    # JS payload also works when opening index.html directly with file://.
    (out / "results.js").write_text("window.STARTUP_RESULTS = " + payload + ";\n", encoding="utf-8")
    for name in ["index.html", "dashboard.css", "dashboard.js"]:
        shutil.copy2(ROOT / name, out / name)
    page = (out / "index.html").read_text(encoding="utf-8-sig")
    page = page.replace('data-output-base="site/"', 'data-output-base=""')
    page = page.replace('href="site/', 'href="')
    (out / "index.html").write_text(page, encoding="utf-8")
    shutil.copy2(args.data, out / "50_Startups.csv")
    (out / ".nojekyll").touch()
    # Update the IDE's existing image/CSV and direct-open report, too.
    for name in ["50_Startups_Feature_Selection.png", "50_Startups_Feature_Selection.csv", "results.js", "prediction_diagnostics.png", "model_comparison.png", "model_diagnostics.png"]:
        if (out / name).resolve() != (ROOT / name).resolve():
            shutil.copy2(out / name, ROOT / name)
    for name in ["all_models_predictions.png"] + [f'diagnostics_{entry["id"]}.png' for entry in model_comparison]:
        if (out / name).resolve() != (ROOT / name).resolve():
            shutil.copy2(out / name, ROOT / name)
    summary = (f'## 50 Startups prediction\n\nTraining / test: {len(train)} / {len(test)}; seed: 0.\n\n'
               f'Selected by training 5-fold CV: {", ".join(features)}\n\n'
               f'| Test metric | Value |\n| --- | ---: |\n'
               f'| RMSE | {best["RMSE"]:.6f} |\n| R-squared | {best["R-squared"]:.6f} |\n'
               f'| MAE | {best["MAE"]:.6f} |\n\nCV RMSE is a selection score, not an independent generalization estimate.\n')
    summary += '\n## Five models (all 5 encoded features)\n\n| Model | CV RMSE | Test RMSE | Test R2 |\n| --- | ---: | ---: | ---: |\n'
    for entry in model_comparison:
        summary += f'| {entry["name"]} | {entry["CV RMSE"]:.2f} | {entry["metrics"]["RMSE"]:.2f} | {entry["metrics"]["R-squared"]:.6f} |\n'
    summary += f'\nRecommended by training CV: {recommended}\n'
    (out / "summary.md").write_text(summary, encoding="utf-8")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as stream:
            stream.write(summary)
    print(summary)
    print(f"Report: {out / 'index.html'}")


if __name__ == "__main__":
    main()
