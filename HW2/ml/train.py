"""可重現的七資料集分析：只用訓練集選模型與特徵，測試集只做評估。"""
import argparse
import csv
import json
import platform
import traceback
from datetime import datetime, timezone
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from selection import FoldCache
from descriptions import DESCRIPTIONS
from sklearn.base import clone
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.metrics import root_mean_squared_error, r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split, KFold, TimeSeriesSplit, GridSearchCV, cross_val_score, learning_curve
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from threadpoolctl import threadpool_limits
from data import ROOT, OUT, audit, write_json
from registry import REGISTRY, public_registry

SEED=42
GREEN="#155d45"
PALE="#a8d4bc"

def pipeline(X, estimator):
    nums=list(X.select_dtypes(include="number").columns)
    cats=[c for c in X if c not in nums]
    transforms=[]
    if nums: transforms.append(("numeric", Pipeline([("impute",SimpleImputer(strategy="median",keep_empty_features=True)),("scale",StandardScaler())]), nums))
    if cats: transforms.append(("categorical", Pipeline([("impute",SimpleImputer(strategy="most_frequent",keep_empty_features=True)),("encode",OneHotEncoder(handle_unknown="ignore",sparse_output=True))]), cats))
    return Pipeline([("pre",ColumnTransformer(transforms,sparse_threshold=1.0)),("model",TransformedTargetRegressor(regressor=clone(estimator),transformer=StandardScaler()))])

def metrics(y,p):
    return dict(test_rmse=float(root_mean_squared_error(y,p)),test_r2=float(r2_score(y,p)),test_mae=float(mean_absolute_error(y,p)))

def export_model(pipe, id):
    """匯出已訓練參數，JS 嚴格使用相同補值、縮放、類別順序與決策樹。"""
    pre=pipe.named_steps["pre"]
    out={"id":id,"numeric":[],"categorical":[],"feature_order":list(pre.get_feature_names_out())}
    for name,tr,cols in pre.transformers_:
        if name=="numeric":
            im,sc=tr.named_steps["impute"],tr.named_steps["scale"]
            out["numeric"]=[dict(name=c,fill=float(im.statistics_[i]),mean=float(sc.mean_[i]),scale=float(sc.scale_[i])) for i,c in enumerate(cols)]
        elif name=="categorical":
            im,enc=tr.named_steps["impute"],tr.named_steps["encode"]
            out["categorical"]=[dict(name=c,fill=str(im.statistics_[i]),values=[str(v) for v in enc.categories_[i]]) for i,c in enumerate(cols)]
    target=pipe.named_steps["model"]
    m=target.regressor_
    scale=float(target.transformer_.scale_[0]);mean=float(target.transformer_.mean_[0])
    if hasattr(m,"estimators_"):
        out["kind"]="forest"
        out["trees"]=[dict(left=e.tree_.children_left.tolist(),right=e.tree_.children_right.tolist(),feature=e.tree_.feature.tolist(),threshold=e.tree_.threshold.tolist(),value=(e.tree_.value[:,0,0]*scale+mean).tolist()) for e in m.estimators_]
    else:
        out.update(kind="linear",coef=(m.coef_*scale).tolist(),intercept=float(m.intercept_*scale+mean))
    return out

UNITS={"sqft_living":"ft²","sqft_lot":"ft²","sqft_above":"ft²","sqft_basement":"ft²","sqft_living15":"ft²","sqft_lot15":"ft²","duration_ms":"毫秒","tempo":"BPM","loudness":"dB","Ram":"GB","Weight":"kg","Inches":"英吋","Size":"ft²","mileage":"km/l 或 km/kg（依燃料）","engine":"cc","max_power":"bhp","torque":"Nm（kgm 已換算）","km_driven":"km","duration_minutes":"分鐘","temp":"標準化溫度 / 41°C","atemp":"標準化體感 / 50°C","hum":"相對濕度 / 100","windspeed":"風速 / 67"}

def schema(X):
    result=[]
    for c in X:
        s=X[c]; numeric=pd.api.types.is_numeric_dtype(s)
        item=dict(name=c,type="number" if numeric else "category",description=DESCRIPTIONS.get(c,c.replace("_"," ")),missing=int(s.isna().sum()),unit=UNITS.get(c,"數值" if numeric else "類別"))
        if numeric:
            clean=s.dropna()
            item.update(default=float(clean.median()) if len(clean) else 0,min=float(clean.min()) if len(clean) else 0,max=float(clean.max()) if len(clean) else 1,step="any")
        else:
            values=sorted(str(v) for v in s.dropna().unique())
            item.update(values=values,default=str(s.mode().iloc[0]) if len(s.mode()) else "")
        result.append(item)
    return result

def charts(folder, result):
    plt.rcParams.update({"font.size":9,"axes.spines.top":False,"axes.spines.right":False,"axes.titleweight":"bold"})
    rows=result["model_results"]; fs=result["feature_selection_results"]
    for key,title in [("test_rmse","Test RMSE by Model"),("test_r2","Test R-squared by Model")]:
        fig,ax=plt.subplots(figsize=(8,4.5),layout="constrained")
        bars=ax.bar([r["short"] for r in rows],[r[key] for r in rows],color=[GREEN if r["name"]==result["recommended_model"] else PALE for r in rows])
        ax.bar_label(bars,fmt="%.3g",padding=4);ax.margins(y=.18);ax.set_title(title);ax.set_ylabel({"king-county":"USD","spotify":"Popularity score","laptop":"EUR","bike":"Hourly count","used-car":"INR","house-rent":"INR / month","flight":"INR"}[result["id"]] if key=="test_rmse" else "R²")
        fig.savefig(folder/(key+".png"),dpi=160);plt.close(fig)
    for key,title in [("test_rmse","RMSE by Number of Features"),("test_r2","R-squared by Number of Features")]:
        fig,ax=plt.subplots(figsize=(8,4.5),layout="constrained")
        ax.plot([v["count"] for v in fs],[v[key] for v in fs],"o-",color=GREEN,label="Test")
        if key=="test_rmse":ax.plot([v["count"] for v in fs],[v["cv_rmse"] for v in fs],"o--",color="#89af70",label="Training CV")
        ax.axvline(result["best_features"]["count"],color="#aaa",linestyle=":",label="CV selected")
        ax.set(xlabel="Number of Features",title=title);ax.legend();fig.savefig(folder/("features_"+key+".png"),dpi=160);plt.close(fig)
    diag=result["diagnostic_results"]
    fig,axes=plt.subplots(2,2,figsize=(12,9),layout="constrained")
    pts=diag["points"]; actual=[p["actual"] for p in pts]; pred=[p["predicted"] for p in pts]
    axes[0,0].scatter(actual,pred,s=8,alpha=.45,color=GREEN);lim=[min(actual+pred),max(actual+pred)];axes[0,0].plot(lim,lim,"--",color="#999");axes[0,0].set(title="Actual vs Predicted",xlabel="Actual",ylabel="Predicted")
    axes[0,1].scatter(pred,[p["residual"] for p in pts],s=8,alpha=.45,color=GREEN);axes[0,1].axhline(0,color="#999");axes[0,1].set(title="Residual Plot",xlabel="Predicted",ylabel="Actual - Predicted")
    lc=diag["learning_curve"]
    for key,label,color in [("train_rmse","Training",GREEN),("validation_rmse","Validation","#90b580")]:axes[1,0].plot([p["samples"] for p in lc],[p[key] for p in lc],"o-",label=label,color=color)
    axes[1,0].set(title="Learning Curve",xlabel="Training samples",ylabel="RMSE");axes[1,0].legend()
    imp=diag["importance"][:10][::-1];axes[1,1].barh([i["feature"] for i in imp],[i["value"] for i in imp],color=GREEN);axes[1,1].set_title(diag["importance_type"])
    fig.savefig(folder/"diagnostics.png",dpi=160);plt.close(fig)

def csv_write(path,rows):
    if rows:
        with path.open("w",newline="",encoding="utf-8-sig") as f:
            w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader()
            w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in r.items()} for r in rows)

def train(r,args):
    df,a=audit(r)
    full_clean=len(df)
    # 有標記的抽樣分析使用真實資料；--max-rows 0 使用完整資料。
    if args.max_rows and len(df)>args.max_rows:
        df=df.iloc[np.linspace(0,len(df)-1,args.max_rows,dtype=int)] if r["id"]=="bike" else df.sample(args.max_rows,random_state=SEED)
    X=df.drop(columns=[r["target_column"]]);y=df[r["target_column"]]
    if len(X)<50:raise ValueError("資料不足 50 筆，無法進行穩定 5-fold 評估")
    if r["id"]=="bike":
        n=int(len(X)*.8);Xt,Xs,yt,ys=X.iloc[:n],X.iloc[n:],y.iloc[:n],y.iloc[n:];cv=TimeSeriesSplit(n_splits=5)
    else:
        Xt,Xs,yt,ys=train_test_split(X,y,test_size=.2,random_state=SEED);cv=KFold(5,shuffle=True,random_state=SEED)
    models=[("Linear Regression","Linear",LinearRegression(),{}),("Ridge Regression","Ridge",Ridge(solver="lsqr"),{"model__regressor__alpha":[.1,10,100]}),("Lasso Regression","Lasso",Lasso(max_iter=20000,tol=.0001),{"model__regressor__alpha":[.001,.01,.1]}),("ElasticNet Regression","ElasticNet",ElasticNet(max_iter=20000,tol=.0001),{"model__regressor__alpha":[.001,.01,.1],"model__regressor__l1_ratio":[.3,.7]}),("Random Forest Regressor","Forest",RandomForestRegressor(n_estimators=64,random_state=SEED,n_jobs=8,max_leaf_nodes=128),{"model__regressor__max_depth":[8,14],"model__regressor__min_samples_leaf":[2,5]})]
    rows=[];fitted={}
    for name,short,model,grid in models:
        search=GridSearchCV(pipeline(Xt,model),grid,cv=cv,scoring="neg_root_mean_squared_error",n_jobs=1,error_score="raise").fit(Xt,yt)
        p=search.best_estimator_.predict(Xs)
        rows.append(dict(name=name,short=short,cv_rmse=float(-search.best_score_),**metrics(ys,p),best_parameters=search.best_params_));fitted[name]=search.best_estimator_
        print(r["id"],short,"CV",round(-search.best_score_,3),flush=True)
    best=min(rows,key=lambda v:v["cv_rmse"]);winner=fitted[best["name"]]
    # 每 fold 前處理只 fit 該 fold 訓練部分；各欄位的補值／編碼獨立，故可快取。
    cache=FoldCache(Xt,yt,cv,lambda frame:pipeline(frame,LinearRegression()))
    linear=pipeline(Xt,LinearRegression()).named_steps['model']
    selected=[];remaining=list(Xt);steps=[]
    while remaining:
        candidates=list(zip(cache.candidates(selected,remaining,linear),remaining))
        score,c=min(candidates);selected.append(c);remaining.remove(c)
        p=pipeline(Xt[selected],LinearRegression()).fit(Xt[selected],yt).predict(Xs[selected])
        steps.append(dict(count=len(selected),selected_features=list(selected),cv_rmse=score,**metrics(ys,p)))
        print(r['id'],'features',len(selected),'/',len(Xt.columns),flush=True)
    best_features=min(steps,key=lambda s:s["cv_rmse"])
    sizes,tr,va=learning_curve(clone(winner),Xt,yt,cv=cv,train_sizes=[.3,.6,1.0],scoring="neg_root_mean_squared_error",n_jobs=1,error_score="raise")
    lc=[dict(samples=int(n),train_rmse=float(-t.mean()),validation_rmse=float(-v.mean())) for n,t,v in zip(sizes,tr,va)]
    pred=winner.predict(Xs);resid=ys.to_numpy()-pred
    target=winner.named_steps["model"];m=target.regressor_;pre=winner.named_steps["pre"]
    imp=m.feature_importances_ if hasattr(m,"feature_importances_") else m.coef_*target.transformer_.scale_[0]
    importance=sorted([dict(feature=str(f),value=float(v)) for f,v in zip(pre.get_feature_names_out(),imp)],key=lambda v:abs(v["value"]),reverse=True)
    # 圖表只抽最多 800 點，指標與測試 CSV 使用完整測試集。
    idx=np.linspace(0,len(ys)-1,min(800,len(ys)),dtype=int)
    points=[dict(actual=float(ys.iloc[i]),predicted=float(pred[i]),residual=float(resid[i])) for i in idx]
    corr=float(np.corrcoef(pred,resid)[0,1]) if np.std(pred)>0 and np.std(resid)>0 else 0.0
    gap=lc[-1]["validation_rmse"]-lc[-1]["train_rmse"]
    explanations=[f"最終學習曲線：Training RMSE {lc[-1]['train_rmse']:.4g}，Validation RMSE {lc[-1]['validation_rmse']:.4g}，差距 {gap:.4g}。" + ("差距超過驗證誤差的 20%，有過度擬合跡象。" if gap > .2*lc[-1]["validation_rmse"] else "依此差距尚無強烈過度擬合證據。"),f"殘差與預測值的 Pearson r = {corr:.3f}。此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。",f"CV 選出 {best_features['count']} 個特徵；一個特徵 CV RMSE {steps[0]['cv_rmse']:.4g}，最佳組合 {best_features['cv_rmse']:.4g}，全部特徵 {steps[-1]['cv_rmse']:.4g}。",f"最顯著的編碼後特徵為 {importance[0]['feature']}；係數表示控制其他輸入後的關聯，不等於因果。",f"欠擬合評估：訓練集目標標準差 {float(yt.std()):.4g}，最大樣本 Training RMSE {lc[-1]['train_rmse']:.4g}。" + ("訓練誤差仍超過目標標準差的 80%，有高偏差跡象；僅為啟發式檢查。" if lc[-1]['train_rmse']>.8*yt.std() else "目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。")]
    id=r["id"];folder=OUT/id;folder.mkdir(parents=True,exist_ok=True)
    export=export_model(winner,id)
    # 同時保留所有模型 joblib，靜態網站僅載入 CV 推薦模型。
    art=ROOT/"artifacts"/id;art.mkdir(parents=True,exist_ok=True)
    for name,p in fitted.items():joblib.dump(p,art/(name.replace(" ","_")+".joblib"))
    cases=[]
    for i in range(min(20,len(Xs))):
        inputs={c:None if pd.isna(v) else v for c,v in Xs.iloc[i].items()}
        cases.append(dict(input=inputs,expected=float(pred[i])))
    # 額外測試補值與未知類別，瀏覽器必須與 Python 一致。
    altered=Xs.iloc[:1].copy()
    for c in altered:
        if pd.api.types.is_numeric_dtype(altered[c]):altered[c]=np.nan
        else:altered[c]="__UNSEEN_CATEGORY__"
    cases.append(dict(input={c:None if pd.isna(v) else v for c,v in altered.iloc[0].items()},expected=float(winner.predict(altered)[0])))
    write_json(folder/"model.json",export);write_json(folder/"parity.json",cases)
    result={**next(v for v in public_registry() if v["id"]==id),"status":"ready","generated_at":datetime.now(timezone.utc).isoformat(),"environment":{"python":platform.python_version(),"sklearn":sklearn.__version__,"pandas":pd.__version__,"numpy":np.__version__},"audit":a,"original_features":a["original_features"],"encoded_features":export["feature_order"],"feature_schema":schema(Xt),"dataset_summary":{"total_samples":a["source_rows"],"clean_samples":full_clean,"analyzed_samples":len(X),"sampled":len(X)<full_clean,"training_samples":len(Xt),"testing_samples":len(Xs),"original_feature_count":a["original_feature_count"],"candidate_feature_count":len(X.columns),"encoded_feature_count":len(export["feature_order"]),"missing_values":int(X.isna().sum().sum()),"split":"chronological 80/20 + TimeSeriesSplit(5)" if id=="bike" else "random 80/20 + KFold(5, shuffle=True, seed=42)","seed":SEED},"model_results":rows,"recommended_model":best["name"],"feature_selection_results":steps,"best_features":best_features,"diagnostic_results":{"points":points,"learning_curve":lc,"importance":importance[:20],"importance_type":"Feature importance" if hasattr(m,"feature_importances_") else "Standardized coefficients / category coefficients","explanations":explanations,"residual_correlation":corr},"prediction_configuration":{"supported":True,"model_path":f"data/{id}/model.json","model_name":best["name"],"input_stage":"已清理／衍生的候選欄位，與 Python prepare() 的輸出一致"}}
    charts(folder,result)
    csv_write(folder/"model_comparison.csv",rows);csv_write(folder/"feature_selection.csv",steps)
    csv_write(folder/"test_predictions.csv",[dict(actual=float(a),predicted=float(p),residual=float(a-p)) for a,p in zip(ys,pred)])
    write_json(folder/"summary.json",result["dataset_summary"])
    write_json(folder/"results.json",result)
    report=f"# {r['display_name']} 評估報告\n\n來源：{result['kaggle_url']}\n\n檔案：{r['file']}\n\nSHA256：{a['sha256']}\n\n{r['note']}\n\n原始有效特徵 {a['original_feature_count']}，候選 {len(X.columns)}，編碼後 {len(export['feature_order'])}。原始數量要求：{'符合' if a['raw_requirement_met'] else '不符合；採特徵工程方案，需教師認可'}。\n\n分析 {len(X)} / 清理後 {full_clean} 筆；{'固定種子抽樣分析，非全量結果' if len(X)<full_clean else '全量分析'}。{result['dataset_summary']['split']}。\n\n推薦模型：{best['name']}（以訓練 CV RMSE 選擇）。\n\n"+"\n\n".join(explanations)+"\n\n測試集各步分數僅供展示，不得回頭依測試曲線選擇組合。CV 同時用於調參與推薦，其分數有選擇偏差，獨立測試分數才是最終評估。此結果是關聯預測，非因果結論；未對母體樣本偏差作保證。\n"
    (folder/"report.md").write_text(report,encoding="utf-8")
    print(id,"DONE",len(X),"rows",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--dataset",default="all",choices=["all"]+[r["id"] for r in REGISTRY]);p.add_argument("--max-rows",type=int,default=0);p.add_argument('--resume',action='store_true');args=p.parse_args()
    if args.max_rows<0:p.error("--max-rows 不可為負數")
    write_json(OUT/"registry.json",public_registry())
    failures=[]
    with threadpool_limits(limits=1):
        for r in REGISTRY:
            if args.dataset not in ["all",r["id"]]:continue
            existing=OUT/r['id']/'results.json'
            if args.resume and args.max_rows==0 and existing.exists():
                saved=json.loads(existing.read_text(encoding='utf-8'))
                source=json.loads((OUT/r['id']/'source.json').read_text(encoding='utf-8'))
                if saved.get('status')=='ready' and saved.get('dataset_summary',{}).get('sampled') is False and saved.get('audit',{}).get('sha256')==source.get('archive_sha256'):
                    saved.update({k:v for k,v in next(v for v in public_registry() if v['id']==r['id']).items() if k.startswith('source_')})
                    write_json(existing,saved)
                    print(r['id'],'SKIP completed full-data run',flush=True);continue
            try:train(r,args)
            except Exception as e:
                traceback.print_exc();failures.append(r["id"])
                write_json(OUT/r["id"]/"results.json",{"id":r["id"],"status":"error","message":str(e)})
    if failures:raise SystemExit("Failed: "+", ".join(failures))
