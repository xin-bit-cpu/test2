"""確定性的清理只使用單筆輸入；補值與編碼留在 CV Pipeline 中學習。"""
from pathlib import Path
from zipfile import ZipFile
from urllib.request import urlopen, Request
import hashlib
import json
import numpy as np
import pandas as pd
from registry import REGISTRY, public_registry

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data"

def download(r):
    RAW.mkdir(parents=True, exist_ok=True)
    p = RAW / (r["id"] + ".zip")
    source_path = OUT / r["id"] / "source.json"
    source = json.loads(source_path.read_text(encoding="utf-8")) if source_path.exists() else {}
    if not p.exists():
        url = "https://www.kaggle.com/api/v1/datasets/download/" + r["slug"]
        if source.get("version"): url += "?datasetVersionNumber=" + str(source["version"])
        with urlopen(Request(url, headers={"User-Agent": "RegressionLab/1.0"}), timeout=120) as response:
            p.write_bytes(response.read())
    if source.get("archive_sha256") and hashlib.sha256(p.read_bytes()).hexdigest() != source["archive_sha256"]:
        raise ValueError("來源 ZIP SHA256 與已記錄快照不同，請核對 Kaggle 版本後重新執行 provenance.py；不可靜默混用資料。")
    return p

def load(r):
    p = download(r)
    with ZipFile(p) as z:
        # 只讀指定檔案，不將外來壓縮檔解壓到任意路徑。
        name = next(n for n in z.namelist() if n == r["file"] or n.endswith("/" + r["file"]))
        with z.open(name) as f:
            df = pd.read_excel(f) if name.endswith("xlsx") else pd.read_csv(f, encoding="latin1" if r["id"] == "laptop" else "utf-8")
    return df, hashlib.sha256(p.read_bytes()).hexdigest()

def numeric(s):
    return pd.to_numeric(s.astype(str).str.extract(r"(-?\d+(?:\.\d+)?)", expand=False), errors="coerce")

def prepare(r, df):
    id = r["id"]
    d = df.copy()
    original = []
    if id == "king-county":
        d = d.drop_duplicates("id").drop(columns=["id", "date"])
        d["zipcode"] = d["zipcode"].astype(str)
    elif id == "spotify":
        d = d.drop_duplicates("track_id").drop(columns=["track_id", "artists", "album_name", "track_name"])
        d = d.drop(columns=[c for c in d if c.startswith("Unnamed")])
        d["explicit"] = d["explicit"].astype(int)
    elif id == "laptop":
        d = d.rename(columns={"Price_euros": "Price"}).drop(columns=["laptop_ID"])
        for c in ["Ram", "Weight"]: d[c] = numeric(d[c])
        for c in ["Product", "Cpu", "Gpu"]: d[c] = d[c].str.split().str[:1 if c == "Product" else 2].str.join(" ")
    elif id == "bike":
        d = d.sort_values(["dteday", "hr"]).rename(columns={"cnt": "count"}).drop(columns=["instant", "casual", "registered", "dteday"])
        for c in ["season", "yr", "mnth", "hr", "holiday", "weekday", "workingday", "weathersit"]: d[c] = d[c].astype(str)
    elif id == "used-car":
        d = d.rename(columns={"selling_price": "Selling_Price"})
        d["name"] = d["name"].str.split().str[0]
        torque = d["torque"].astype(str)
        for c in ["mileage", "engine", "max_power", "torque"]: d[c] = numeric(d[c])
        d.loc[torque.str.contains(r"kgm|kg-m", case=False, regex=True), "torque"] *= 9.80665
    elif id == "house-rent":
        d = d.drop(columns=["Point of Contact"])
        original = [c for c in d if c != r["target_column"]]
        t = pd.to_datetime(d.pop("Posted On"), errors="coerce")
        for c, v in [("posted_year", t.dt.year), ("posted_month", t.dt.month), ("posted_day", t.dt.day), ("posted_weekday", t.dt.dayofweek)]: d[c] = v
        s = d.pop("Floor").str.lower().str.replace("ground", "0").str.replace("upper basement", "-1").str.replace("lower basement", "-2")
        d["floor_number"] = numeric(s.str.split(" out of ").str[0])
        d["total_floors"] = numeric(s.str.split(" out of ").str[1])
    elif id == "flight":
        original = [c for c in d if c not in ["Price", "Route", "Additional_Info"]]
        t = pd.to_datetime(d.pop("Date_of_Journey"), dayfirst=True, errors="coerce")
        d["journey_month"], d["journey_day"], d["journey_weekday"] = t.dt.month, t.dt.day, t.dt.dayofweek
        for c in ["Dep_Time", "Arrival_Time"]:
            tm = d.pop(c).str.extract(r"(\d+):(\d+)")
            d[c + "_hour"], d[c + "_minute"] = pd.to_numeric(tm[0]), pd.to_numeric(tm[1])
        s = d.pop("Duration")
        d["duration_minutes"] = pd.to_numeric(s.str.extract(r"(\d+)h", expand=False), errors="coerce").fillna(0)*60 + pd.to_numeric(s.str.extract(r"(\d+)m", expand=False), errors="coerce").fillna(0)
        d["Total_Stops"] = numeric(d["Total_Stops"].replace("non-stop", "0"))
        d = d.drop(columns=["Route", "Additional_Info"])
    if not original: original = [c for c in d if c != r["target_column"]]
    d = d.drop_duplicates().replace([np.inf, -np.inf], np.nan)
    d[r["target_column"]] = pd.to_numeric(d[r["target_column"]], errors="coerce")
    d = d.dropna(subset=[r["target_column"]]).reset_index(drop=True)
    # 類別缺值保持 np.nan，交由每個訓練 fold 的 SimpleImputer 處理。
    for c in d.select_dtypes(include=["object", "str", "string"]).columns:
        d[c] = d[c].astype(object).where(d[c].notna(), np.nan)
    return d, original

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False, default=lambda x: x.item() if hasattr(x, "item") else str(x)), encoding="utf-8")

def audit(r):
    raw, sha = load(r)
    df, original = prepare(r, raw)
    features = [c for c in df if c != r["target_column"]]
    return df, {"id":r["id"], "sha256":sha, "source_rows":len(raw), "clean_rows":len(df), "source_columns":list(raw.columns), "source_input_count":len([c for c in raw if c not in [r["target_column"], "Price_euros", "selling_price", "cnt"] and not c.startswith("Unnamed")]), "original_features":original, "original_feature_count":len(original), "candidate_features":features, "candidate_feature_count":len(features), "raw_requirement_met":11 <= len(original) <= 29, "note":r["note"], "source_schema":[{"name":c,"dtype":str(raw[c].dtype),"missing":int(raw[c].isna().sum())} for c in raw]}

if __name__ == "__main__":
    results=[]
    for r in REGISTRY:
        try:
            _, a = audit(r); results.append(a)
            print(r["id"], a["source_rows"], a["original_feature_count"], a["candidate_feature_count"], flush=True)
        except Exception as e: results.append({"id":r["id"], "error":str(e)})
    write_json(OUT / "registry.json", public_registry())
    write_json(OUT / "audit.json", results)
