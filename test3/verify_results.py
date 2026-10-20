"""Check exported metrics, model roundtrip and browser coefficient parity."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from train import ROOT, encode, load_data
from regression_models import predict_export


def main():
    out = ROOT / "site"
    result = json.loads((out / "results.json").read_text(encoding="utf-8"))
    train_ids, test_ids = set(result["train_row_ids"]), set(result["test_row_ids"])
    assert not train_ids & test_ids
    assert len(train_ids | test_ids) == result["samples"]
    assert result["best"] == min(result["selection"], key=lambda r: r["CV RMSE"])
    assert [r["Number of Features"] for r in result["selection"]] == [1, 2, 3, 4, 5]
    predictions = pd.read_csv(out / "predictions.csv")
    actual, predicted = predictions.Profit, predictions["Predicted Profit"]
    np.testing.assert_allclose(predictions.Residual, actual - predicted)
    scores = {"MAE": mean_absolute_error(actual, predicted), "MSE": mean_squared_error(actual, predicted),
              "RMSE": np.sqrt(mean_squared_error(actual, predicted)), "R-squared": r2_score(actual, predicted)}
    for key, value in scores.items():
        np.testing.assert_allclose(result["metrics"][key], value)
    raw = load_data(out / "50_Startups.csv").iloc[np.array(result["test_row_ids"]) - 1]
    bundle = joblib.load(out / "model.joblib")
    encoded = encode(raw, bundle["encoder"])
    np.testing.assert_allclose(bundle["model"].predict(encoded[bundle["features"]]), predicted)
    exported = result["model"]
    browser_predictions = sum(encoded[name].to_numpy() * coefficient
                              for name, coefficient in exported["coefficients"].items()) + exported["intercept"]
    np.testing.assert_allclose(browser_predictions, predicted)
    assert {entry["id"] for entry in result["models"]} == {"linear", "ridge", "lasso", "elasticnet", "forest"}
    assert result["recommended_model"] == min(result["models"], key=lambda entry: entry["CV RMSE"])["id"]
    models = joblib.load(out / "models.joblib")
    for entry in result["models"]:
        stored = joblib.load(out / f'model_{entry["id"]}.joblib')
        values = stored["model"].predict(encoded[stored["features"]])
        np.testing.assert_allclose(values, models["models"][entry["id"]].predict(encoded))
        np.testing.assert_allclose(values, predict_export(entry["export"], encoded))
        rows = pd.read_csv(out / f'predictions_{entry["id"]}.csv')
        np.testing.assert_allclose(values, rows["Predicted Profit"])
        np.testing.assert_allclose(values, [row["Predicted Profit"] for row in entry["predictions"]])
        np.testing.assert_allclose(entry["metrics"]["RMSE"], np.sqrt(mean_squared_error(raw.Profit, values)))
        np.testing.assert_allclose(entry["metrics"]["R-squared"], r2_score(raw.Profit, values))
    for name in ["index.html", "dashboard.js", "dashboard.css", "results.js",
                 "50_Startups_Feature_Selection.png", "prediction_diagnostics.png"]:
        assert (out / name).stat().st_size > 0, name
    class AssetChecker(HTMLParser):
        def handle_starttag(self, tag, attrs):
            for key, value in attrs:
                if key in ("href", "src") and value:
                    url = urlsplit(value)
                    if not url.scheme and url.path:
                        assert (out / unquote(url.path)).is_file(), value
    AssetChecker().feed((out / "index.html").read_text(encoding="utf-8"))
    print("Verified split isolation, CV choice, exported metrics, model reload, browser coefficient parity and page asset links.")


if __name__ == "__main__":
    main()
