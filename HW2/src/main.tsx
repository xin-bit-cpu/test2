import {LanguageProvider, LanguageToggle, useI18n, localizeResult} from './i18n';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, Bar, Cell, LabelList, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { defaults, predict, validate } from './inference.mjs';
import './styles.css';

type Row = Record<string, any>;
type Dataset = { id: string; display_name: string; description: string; kaggle_url: string; target_column: string; prediction_unit: string; note: string; data_source: string; source_version?: number; source_license?: string };
type Field = { name: string; type: string; default: number | string; min?: number; max?: number; values?: string[]; unit: string; description: string; missing: number };
type Result = Dataset & {status: string; message?: string; audit: Row; dataset_summary: Row; feature_schema: Field[]; model_results: Row[]; feature_selection_results: Row[]; best_features: Row; recommended_model: string; diagnostic_results: Row; prediction_configuration: Row; generated_at: string};
const BASE = import.meta.env.BASE_URL;
const GREEN = '#155d45', PALE = '#b0d2bd';
const sections = ['Dataset Overview', 'Model Comparison', 'Feature Selection', 'Model Diagnostics', 'Interactive Prediction', 'Downloads & Report'];
const num = (v: unknown, digits = 3) => typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('en-US', {maximumFractionDigits: digits}) : '—';
const compact = (v: number) => new Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 1}).format(v);
const link = (id: string, file: string) => `${BASE}data/${id}/${file}`;
function Section({n, title, description, children}: {n: number; title: string; description: string; children: React.ReactNode}) {
  const {t,language}=useI18n();
  return <section id={`section-${n}`} className="section"><div className="section-heading"><span className="section-number">{String(n).padStart(2, '0')}</span><div><h2>{t(title)}</h2><p>{t(description)}</p></div></div>{children}</section>;
}
function Table({headers, children}: {headers: string[]; children: React.ReactNode}) {
  const {t,language}=useI18n();
  return <div className="table-scroll" tabIndex={0}><table><thead><tr>{headers.map(h => <th key={h}>{t(h)}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function ChartCard({title, caption, children}: {title: string; caption?: string; children: React.ReactNode}) {
  const {t,language}=useI18n();
  return <div className="chart-card"><h3>{t(title)}</h3>{caption && <p className="caption">{t(caption)}</p>}<div className="chart">{children}</div></div>;
}
function Empty({children}: {children: React.ReactNode}) {
  const {t,language}=useI18n(); return <div className="empty" role="status">{children}</div>; }
function DatasetOverview({data}: {data: Result}) {
  const {t,language}=useI18n();
  const s = data.dataset_summary;
  const stats = [[t("來源筆數"), s.total_samples], [t("分析筆數"), s.analyzed_samples], [t("原始有效特徵"), s.original_feature_count], [t("候選特徵"), s.candidate_feature_count], [t("編碼後特徵"), s.encoded_feature_count], [t("缺失輸入值"), s.missing_values]];
  return <Section n={1} title={t("Dataset Overview")} description={t("先了解資料，再解讀模型。所有數值來自實際資料檔。")}>
    <div className="overview-top"><div><span className="eyebrow">{t("THE DATASET")}</span><h3 className="dataset-title">{data.display_name}</h3><p>{data.description}</p><a href={data.kaggle_url} target="_blank" rel="noreferrer">{t("查看 Kaggle 來源 ↗")}</a></div><div className="target-box"><span>{t("Prediction target")}</span><strong>{data.target_column}</strong><small>{data.prediction_unit}</small></div></div>
    <div className="stats">{stats.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{num(value,0)}</strong></div>)}</div>
    <div className="meta-row"><span>{t("訓練集")} <b>{num(s.training_samples,0)}</b></span><span>{t("測試集")} <b>{num(s.testing_samples,0)}</b></span><span>{t("清理後")} <b>{num(s.clean_samples,0)}</b></span><span>{t("Seed")} <b>{s.seed}</b></span><span>{s.split}</span></div>
    {s.sampled && <div className="notice">{t("本次為真實資料抽樣分析：")}{num(s.analyzed_samples,0)} {t("/")} {num(s.clean_samples,0)} {t("筆，並非全量訓練。可用")} <code>{t("--max-rows 0")}</code> {t("重新產生全量結果。")}</div>}
    <div className={data.audit.raw_requirement_met ? 'note' : 'notice'}><b>{data.audit.raw_requirement_met ? t("原始有效特徵數符合 11～29 個。") : t("原始有效特徵不足 11 個；特徵工程不等於增加原始欄位，需教師認可方案。")}</b> {data.note}</div>
    <details><summary>{t("欄位字典與來源驗證 ·")} {data.feature_schema.length} {t("個候選特徵")}</summary><Table headers={[t("Feature Name"),t("Data Type"),t("Description / Unit"),t("Missing Values（訓練集）")]}>{data.feature_schema.map(f => <tr key={f.name}><td><code>{f.name}</code></td><td>{f.type}</td><td>{f.description} {t("·")} {f.unit}</td><td>{num(f.missing,0)}</td></tr>)}</Table><p className="caption">{t("原始來源：")}{data.data_source} {t("· Kaggle version")} {data.source_version??t("未核對")} {t("·")} {data.source_license??t("授權未核對")} {t("· 原始輸入欄數（含之後排除的欄位）：")}{data.audit.source_input_count}</p><Table headers={[t("原始檔案欄位"),t("型態"),t("缺失值")]}>{data.audit.source_schema.map((f: Row) => <tr key={f.name}><td>{f.name}</td><td>{f.dtype}</td><td>{num(f.missing,0)}</td></tr>)}</Table><p className="hash">{t("來源 ZIP SHA256：")}{data.audit.sha256}</p></details>
  </Section>;
}
function ModelComparison({data}: {data: Result}) {
  const {t,language}=useI18n();
  const [sort,setSort]=useState('cv_rmse');
  const rows=[...data.model_results].sort((a,b) => sort==='test_r2' ? b[sort]-a[sort] : a[sort]-b[sort]);
  return <Section n={2} title={t("Model Comparison")} description={t("五種模型，相同切分；以訓練集 5-fold CV 選擇參數與推薦模型。")}>
    <div className="recommendation"><span className="recommend-icon">{t("✓")}</span><div><span className="eyebrow">{t("CV RECOMMENDATION")}</span><strong>{data.recommended_model}</strong></div><p>{t("深綠色標示訓練集 CV RMSE 最低模型")}<br/><small>{t("測試集僅用於最終評估")}</small></p></div>
    {rows.length ? <><div className="chart-grid">{[['test_rmse',t("Test RMSE by Model"),data.prediction_unit],['test_r2',t("Test R-squared by Model"),t("R² · 允許負值")]].map(([key,title,unit]) => <ChartCard key={key} title={title} caption={unit}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.model_results} margin={{top:30,right:20,bottom:5,left:5}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="short" tick={{fontSize:11}}/><YAxis tickFormatter={compact} width={58} domain={key==='test_r2'?['auto','auto']:[0,'auto']}/><Tooltip formatter={(v: any) => num(Number(v))}/><ReferenceLine y={0} stroke="#9caaa1"/><Bar dataKey={key} radius={[4,4,0,0]}>{data.model_results.map(r => <Cell key={r.name} fill={r.name===data.recommended_model ? GREEN : PALE}/>)}<LabelList dataKey={key} position="top" formatter={(v: any) => num(Number(v),key==='test_r2'?3:Math.abs(Number(v))<100?2:0)} fontSize={10}/></Bar></BarChart></ResponsiveContainer></ChartCard>)}</div>
      <div className="table-toolbar"><span>{t("Evaluation results")}</span><label>{t("排序")} <select value={sort} onChange={e=>setSort(e.target.value)}><option value="cv_rmse">{t("CV RMSE ↑")}</option><option value="test_rmse">{t("Test RMSE ↑")}</option><option value="test_r2">{t("Test R² ↓")}</option></select></label></div>
      <Table headers={[t("Model"),'CV RMSE','Test RMSE','Test R²','Test MAE',t("Best Parameters")]}>{rows.map(r=><tr key={r.name} className={r.name===data.recommended_model?'recommended-row':''}><td>{r.name}{r.name===data.recommended_model&&<small className="badge">{t("CV 推薦")}</small>}</td><td>{num(r.cv_rmse)}</td><td>{num(r.test_rmse)}</td><td>{num(r.test_r2,4)}</td><td>{num(r.test_mae)}</td><td><code>{JSON.stringify(r.best_parameters)}</code></td></tr>)}</Table></> : <Empty>{t("尚無模型比較結果。")}</Empty>}
  </Section>;
}
function FeatureSelection({data}: {data: Result}) {
  const {t,language}=useI18n();
  const rows=data.feature_selection_results, best=data.best_features;
  return <Section n={3} title={t("特徵越多，預測越好嗎？")} description={t("Linear Regression · Forward Selection · 每步選入使訓練 CV RMSE 最低的候選欄位。")}>
    {!rows.length ? <Empty>{t("尚無特徵選擇結果。")}</Empty> : <><div className="selection-summary"><div><span>{t("CV 最佳特徵數")}</span><strong>{best.count}<small> {t("/")} {data.feature_schema.length}</small></strong></div><div><span>{t("最佳 CV RMSE")}</span><strong>{num(best.cv_rmse)}</strong></div><div><span>{t("對應 Test R²")}</span><strong>{num(best.test_r2,4)}</strong></div></div><p className="feature-pills">{best.selected_features.map((f:string)=><span key={f}>{f}</span>)}</p>
      <div className="chart-grid">{[['test_rmse',t("RMSE by Number of Features")],['test_r2',t("R-squared by Number of Features")]].map(([key,title])=><ChartCard key={key} title={title} caption={t("虛線標記訓練 CV 選出的特徵數")}><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{top:15,right:20,left:5,bottom:15}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis type="number" dataKey="count" domain={['dataMin','dataMax']} label={{value:t("Number of Features"),position:'insideBottom',offset:-10,fontSize:11}}/><YAxis tickFormatter={compact} width={58} domain={['auto','auto']}/><Tooltip formatter={(v:any)=>num(Number(v))}/><Legend verticalAlign="top"/><ReferenceLine x={best.count} stroke="#9b9e85" strokeDasharray="4 4"/>{key==='test_rmse'&&<Line dataKey="cv_rmse" name={t("Training CV RMSE")} stroke="#879e63" strokeWidth={2} dot={false}/>}<Line dataKey={key} name={key==='test_r2'?'Test R²':'Test RMSE'} stroke={GREEN} strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></ChartCard>)}</div>
      <p className="caption">{t("每步測試結果供事後比較，未用於選擇特徵。CV 分數用於搜尋，可能存在選擇偏差。")}</p><Table headers={[t("Number of Features"),t("Selected Features"),'CV RMSE','Test RMSE','Test R-squared']}>{rows.map(r=><tr key={r.count} className={r.count===best.count?'recommended-row':''}><td>{r.count}{r.count===best.count&&<small className="badge">{t("CV 最佳")}</small>}</td><td className="features-cell">{r.selected_features.join(', ')}</td><td>{num(r.cv_rmse)}</td><td>{num(r.test_rmse)}</td><td>{num(r.test_r2,4)}</td></tr>)}</Table></>}
  </Section>;
}
function ModelDiagnostics({data}: {data: Result}) {
  const {t,language}=useI18n();
  const d=data.diagnostic_results;
  if(!d?.points?.length)return <Section n={4} title={t("Model Diagnostics")} description={t("依目前資料集與 CV 推薦模型產生。")}><Empty>{t("尚無診斷資料。")}</Empty></Section>;
  const points=d.points as Row[], lo=Math.min(...points.flatMap(p=>[p.actual,p.predicted])),hi=Math.max(...points.flatMap(p=>[p.actual,p.predicted]));
  return <Section n={4} title={t("Model Diagnostics")} description={t(`${data.recommended_model} · 指標使用全部測試資料，散點圖最多顯示 800 筆。`)}>
    <div className="chart-grid"><ChartCard title={t("Actual vs Predicted")} caption={t(`X：實際值 · Y：預測值 · ${data.prediction_unit}`)}><ResponsiveContainer><ScatterChart margin={{top:10,right:15,left:10,bottom:10}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" dataKey="actual" name={t("Actual")} tickFormatter={compact} domain={[lo,hi]}/><YAxis type="number" dataKey="predicted" name={t("Predicted")} tickFormatter={compact} width={60} domain={[lo,hi]}/><Tooltip cursor={{strokeDasharray:'3 3'}}/><ReferenceLine segment={[{x:lo,y:lo},{x:hi,y:hi}]} stroke="#9b9e85" strokeDasharray="4 4"/><Scatter data={points} fill={GREEN} fillOpacity={.45}/></ScatterChart></ResponsiveContainer></ChartCard>
      <ChartCard title={t("Residual Plot")} caption={t("X：預測值 · Y：實際值 − 預測值")}><ResponsiveContainer><ScatterChart margin={{top:10,right:15,left:10,bottom:10}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" dataKey="predicted" name={t("Predicted")} tickFormatter={compact}/><YAxis type="number" dataKey="residual" name={t("Residual")} tickFormatter={compact} width={60}/><Tooltip/><ReferenceLine y={0} stroke="#9b9e85"/><Scatter data={points} fill={GREEN} fillOpacity={.45}/></ScatterChart></ResponsiveContainer></ChartCard>
      <ChartCard title={t("Learning Curve")} caption={t("僅使用訓練集合進行 5-fold 評估")}><ResponsiveContainer><LineChart data={d.learning_curve} margin={{top:10,right:20,left:5,bottom:10}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="samples" tickFormatter={compact}/><YAxis tickFormatter={compact} width={58}/><Tooltip formatter={(v:any)=>num(Number(v))}/><Legend/><Line dataKey="train_rmse" name={t("Training RMSE")} stroke={GREEN} strokeWidth={2}/><Line dataKey="validation_rmse" name={t("Validation RMSE")} stroke="#98b180" strokeWidth={2}/></LineChart></ResponsiveContainer></ChartCard>
      <ChartCard title={t("Feature Importance / Coefficients")} caption={t(`${d.importance_type} · 前 10 個編碼後特徵`)}><ResponsiveContainer><BarChart data={d.importance.slice(0,10)} layout="vertical" margin={{top:5,right:25,left:0,bottom:5}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tickFormatter={compact}/><YAxis dataKey="feature" type="category" width={140} tick={{fontSize:10}} tickFormatter={(s:string)=>s.length>23?s.slice(0,22)+'…':s}/><Tooltip/><ReferenceLine x={0}/><Bar dataKey="value" fill={GREEN} radius={2}/></BarChart></ResponsiveContainer></ChartCard></div>
    <div className="interpretation"><span className="eyebrow">{t("READING THE RESULTS")}</span><h3>{t("從結果解讀模型")}</h3><ul>{d.explanations.map((text:string)=><li key={text}>{text}</li>)}</ul></div>
  </Section>;
}
function downloadText(filename:string,text:string,type='text/csv;charset=utf-8') {
  const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function csvCell(v:unknown){const s=typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:String(v??'');return '"'+s.replaceAll('"','""')+'"';}
function PredictionForm({data}: {data: Result}) {
  const {t,language}=useI18n();
  const [input,setInput]=useState<Record<string,string>>(()=>defaults(data.feature_schema));
  const [model,setModel]=useState<Row|null>(null),[modelError,setModelError]=useState(''),[error,setError]=useState('');
  const [history,setHistory]=useState<Row[]>([]),[prediction,setPrediction]=useState<number|null>(null);
  useEffect(()=>{const ac=new AbortController();fetch(link(data.id,'model.json'),{signal:ac.signal}).then(r=>{if(!r.ok)throw Error("模型檔案載入失敗");return r.json();}).then(m=>{if(m.id!==data.id)throw Error("模型與資料集 ID 不一致");setModel(m);}).catch(e=>{if(e.name!=='AbortError')setModelError(e.message);});return()=>ac.abort();},[data.id]);
  function submit(e:React.FormEvent){e.preventDefault();try{setError('');validate(data.feature_schema,input);if(!model||model.id!==data.id)throw Error("模型尚未準備完成");const value=predict(model,input);setPrediction(value);setHistory(h=>[...h,{dataset_id:data.id,model:data.recommended_model,timestamp:new Date().toISOString(),...input,prediction:value,unit:data.prediction_unit}]);}catch(e){setError((e as Error).message);}}
  function exportHistory(){if(!history.length)return;const keys=Object.keys(history[0]);downloadText(`${data.id}_prediction_results.csv`,[keys.map(csvCell).join(','),...history.map(r=>keys.map(k=>csvCell(r[k])).join(','))].join('\r\n'));}
  return <Section n={5} title={t("Interactive Prediction")} description={t("使用此資料集實際訓練的 CV 推薦模型，在瀏覽器完成前處理與推論。")}>
    {!data.prediction_configuration.supported ? <Empty>{t("此模型尚不支援瀏覽器預測。")}</Empty> : <><div className="prediction-heading"><span className="badge">{data.recommended_model}</span><span className="caption">{model?t("模型已載入 · 本機計算"):modelError?t("模型不可用"):t("模型載入中…")}</span></div><p className="caption">{t("輸入為清理／特徵工程後的模型欄位；預設值與範圍僅依訓練集產生。類別不得任意更換，數字須落在訓練範圍。")}{data.id==='bike'?t("天氣數值依來源標準化尺度輸入。"):''}</p>
      <form onSubmit={submit}><div className="form-grid">{data.feature_schema.map(f=><label key={f.name}><span>{f.name}<small>{f.unit}</small></span>{f.type==='category'?<select required aria-label={f.name} value={input[f.name]} onChange={e=>{setInput({...input,[f.name]:e.target.value});setPrediction(null);}}>{f.values?.map(v=><option key={v} value={v}>{v}</option>)}</select>:<input required type="number" step="any" aria-label={f.name} min={f.min} max={f.max} value={input[f.name]} onChange={e=>{setInput({...input,[f.name]:e.target.value});setPrediction(null);}}/>}{f.type==='number'&&<small className="range">{num(f.min)} {t("–")} {num(f.max)}</small>}</label>)}</div>
      <div className="form-actions"><button type="submit" className="primary" disabled={!model||!!modelError}>{t("產生預測 ↗")}</button><button type="button" onClick={()=>{setInput(defaults(data.feature_schema));setPrediction(null);setError('');}}>{t("重設輸入")}</button><button type="button" disabled={!history.length} onClick={exportHistory}>{t("下載預測 CSV (")}{history.length}{t(")")}</button></div></form>
      {(error||modelError)&&<div className="error" role="alert">{t(error||modelError)}</div>}
      <div className="prediction-result" aria-live="polite"><div><span className="eyebrow">{t("PREDICTED")} {data.target_column.toUpperCase()}</span><strong>{prediction===null?t("等待輸入"):num(prediction,2)} <small>{prediction===null?'':data.prediction_unit}</small></strong></div><p>{prediction===null?t("確認欄位後按下「產生預測」。"):t(`由 ${data.display_name} 的 ${data.recommended_model} 計算。`)}{prediction!==null&&(prediction<0||(data.id==='spotify'&&prediction>100))?t(" 線性／回歸模型可能超出目標物理範圍，此處保留原始輸出，不做截斷。"):''}</p></div></>}
  </Section>;
}
function DownloadSection({data}: {data: Result}) {
  const {t,language}=useI18n();
  const files=[['model_comparison.csv',t("模型比較"),'CSV'],['feature_selection.csv',t("特徵選擇"),'CSV'],['test_predictions.csv',t("測試集預測結果"),'CSV'],['test_rmse.png',t("模型 RMSE 圖"),'PNG'],['test_r2.png',t("模型 R² 圖"),'PNG'],['features_test_rmse.png',t("特徵數量 RMSE 圖"),'PNG'],['features_test_r2.png',t("特徵數量 R² 圖"),'PNG'],['diagnostics.png',t("模型診斷圖"),'PNG'],['summary.json',t("資料集摘要"),'JSON'],['report.md',t("模型評估報告"),'MD'],['results.json',t("完整分析結果"),'JSON']];
  return <Section n={6} title={t("Downloads & Report")} description={t("每個下載檔案名稱皆包含目前 Dataset ID；即時預測紀錄請由上方表單下載。")}><div className="downloads">{files.map(([file,label,type])=><a key={file} href={link(data.id,file)} download={`${data.id}_${file}`}><span className="file-icon">{type}</span><span>{label}<small>{data.id}</small></span><span className="download-arrow">{t("↓")}</span></a>)}</div></Section>;
}
function Dashboard({data}: {data: Result}) {
  const {t,language}=useI18n();return <><DatasetOverview data={data}/><ModelComparison data={data}/><FeatureSelection data={data}/><ModelDiagnostics data={data}/><PredictionForm data={data}/><DownloadSection data={data}/></>;}
function AppContent(){
  const {t,language}=useI18n();
  const [registry,setRegistry]=useState<Dataset[]>([]),[id,setId]=useState('king-county'),[data,setData]=useState<Result|null>(null),[state,setState]=useState('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const ac=new AbortController();fetch(`${BASE}data/registry.json`,{signal:ac.signal}).then(r=>{if(!r.ok)throw Error("找不到 Dataset Registry，請先執行資料驗證。");return r.json();}).then(setRegistry).catch(e=>{if(e.name!=='AbortError'){setError(e.message);setState('error');}});return()=>ac.abort();},[retry]);
  useEffect(()=>{const ac=new AbortController();setData(null);setState('loading');setError('');fetch(link(id,'results.json'),{signal:ac.signal}).then(r=>{if(r.status===404)throw Error("此資料集尚未產生分析結果，請執行 Python 訓練。");if(!r.ok)throw Error(`載入失敗 (${r.status})`);return r.json();}).then(result=>{if(result.id!==id)throw Error("資料集 ID 不一致");if(result.status!=='ready')throw Error(result.message||t("此資料集訓練失敗"));setData(result);setState('ready');}).catch(e=>{if(e.name!=='AbortError'){setState('error');setError(e.message);}});return()=>ac.abort();},[id,retry]);
  const current=registry.find(r=>r.id===id);
  return <><div className="topbar"><span className="brand-mark">{t("R")}<span>{t("²")}</span></span><span>{t("REGRESSION LAB")} <small>{t("/ RESEARCH WORKSPACE")}</small></span><span className="topbar-right"><i/> {registry.length} {t("DATASETS · ONE WORKSPACE")}</span><LanguageToggle/></div>
    <div className="shell"><aside><span className="eyebrow">{t("ANALYSIS WORKSPACE")}</span><nav>{sections.map((s,i)=><a key={s} href={`#section-${i+1}`}><span>{String(i+1).padStart(2,'0')}</span>{t(s)}</a>)}</nav><div className="sidebar-note"><span className="eyebrow">{t("REPRODUCIBLE BY DESIGN")}</span><p>{t("獨立資料集")}<br/>{t("訓練集交叉驗證")}<br/>{t("真實模型推論")}</p><small>{t("Python → JSON → React")}</small></div></aside>
    <main><header className="hero"><div className="hero-kicker"><span className="eyebrow">{t("APPLIED MACHINE LEARNING")}</span><span className="badge">{t("AI COURSE PROJECT")}</span></div><h1>{t("Kaggle Multiple")}<br/><span>{t("Linear Regression Lab")}</span></h1><p>{t("7 Datasets · Machine Learning · Feature Selection · Model Comparison")}</p><div className="hero-bottom"><span>{t("探索資料、比較模型，理解每個特徵帶來的改變。")}</span><span className="current-tag">{current?.display_name||'King County House Sales'}</span></div></header>
      <div className="dataset-selector"><div><label htmlFor="dataset-select">{t("選擇分析資料集")}</label><p>{t("切換後，圖表、模型、預測表單與下載將同步更新。")}</p></div><select id="dataset-select" value={id} onChange={e=>{if(e.target.value===id)return;setId(e.target.value);setData(null);setState('loading');}} disabled={!registry.length}>{registry.map(r=><option key={r.id} value={r.id}>{r.display_name}</option>)}</select></div>
      <div role="status" aria-live="polite" className="status-line"><span className={state==='ready'?'dot ready':'dot'}/>{state==='ready'?t(`${current?.display_name} · 真實訓練結果 · ${data?.dataset_summary.sampled?'抽樣分析':'全量分析'}`):state==='loading'?t("正在載入目前資料集…"):t("資料尚未就緒")}</div>
      {state==='ready'&&data?<Dashboard key={id} data={localizeResult(data,language,t)}/>:state==='loading'?<Empty>{t("正在讀取資料與模型評估結果…")}</Empty>:<><div className="error" role="alert"><b>{current?.display_name}</b><p>{t(error)}</p><button onClick={()=>setRetry(v=>v+1)}>{t("重新載入")}</button></div>{sections.map((title,i)=><Section key={title} n={i+1} title={title} description=""><Empty>{t("此資料集目前沒有可用結果。仍可切換其他資料集。")}</Empty></Section>)}</>}
      <footer><strong>{t("REGRESSION LAB")}</strong><span>{t("每份資料獨立建模 · 以證據解讀結果")}</span><small>{data?t(`結果產生：${new Date(data.generated_at).toLocaleString(language==='zh'?'zh-TW':'en-US',{timeZone:'Asia/Taipei'})} (台北時間)`):''}</small></footer>
    </main></div></>;
}
export function App(){return <LanguageProvider><AppContent/></LanguageProvider>;}
if (import.meta.env.MODE !== 'test') createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
