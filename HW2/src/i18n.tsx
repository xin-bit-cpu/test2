import React, {createContext, useContext, useEffect, useState} from 'react';
import {localizeResult} from './localized-data';
export type Language = 'zh' | 'en';
export const LANGUAGE_KEY = 'regression-lab-language';

// 以來源文字為索引；資料欄位名稱與模型參數仍保留原始識別名稱。
const english: Record<string, string> = {
  '來源筆數':'Source samples','分析筆數':'Analyzed samples','原始有效特徵':'Original usable features','候選特徵':'Candidate features','編碼後特徵':'Encoded features','缺失輸入值':'Missing input values',
  '先了解資料，再解讀模型。所有數值來自實際資料檔。':'Understand the data before interpreting the models. All values come from the actual source files.',
  '查看 Kaggle 來源 ↗':'View Kaggle source ↗','訓練集':'Training set','測試集':'Test set','清理後':'After cleaning',
  '本次為真實資料抽樣分析：':'This analysis uses a real-data sample:','筆，並非全量訓練。可用':'rows, rather than the full dataset. Run','重新產生全量結果。':'to regenerate full-data results.',
  '原始有效特徵數符合 11～29 個。':'The original usable feature count meets the 11–29 requirement.',
  '原始有效特徵不足 11 個；特徵工程不等於增加原始欄位，需教師認可方案。':'Fewer than 11 original usable features. Engineered features do not increase the original column count; instructor approval is required.',
  '欄位字典與來源驗證 ·':'Feature dictionary and source verification ·','個候選特徵':'candidate features','Missing Values（訓練集）':'Missing Values (training set)',
  '原始來源：':'Source file:','未核對':'Unverified','授權未核對':'License unverified','· 原始輸入欄數（含之後排除的欄位）：':'· Source input columns (including excluded columns):','原始檔案欄位':'Source column','型態':'Type','缺失值':'Missing values','來源 ZIP SHA256：':'Source ZIP SHA256:',
  '五種模型，相同切分；以訓練集 5-fold CV 選擇參數與推薦模型。':'Five models share the same split. Parameters and the recommended model are selected using 5-fold training-set CV.',
  '深綠色標示訓練集 CV RMSE 最低模型':'Dark green marks the lowest training CV RMSE','測試集僅用於最終評估':'The test set is reserved for final evaluation','R² · 允許負值':'R² · negative values allowed','排序':'Sort by','CV 推薦':'CV recommended','尚無模型比較結果。':'No model comparison results available.',
  '特徵越多，預測越好嗎？':'Do more features improve predictions?',
  'Linear Regression · Forward Selection · 每步選入使訓練 CV RMSE 最低的候選欄位。':'Linear Regression · Forward Selection · Each step adds the candidate with the lowest training CV RMSE.',
  '尚無特徵選擇結果。':'No feature selection results available.','CV 最佳特徵數':'CV-selected feature count','最佳 CV RMSE':'Best CV RMSE','對應 Test R²':'Corresponding Test R²','虛線標記訓練 CV 選出的特徵數':'The dashed line marks the feature count selected by training CV',
  '每步測試結果供事後比較，未用於選擇特徵。CV 分數用於搜尋，可能存在選擇偏差。':'Stepwise test results are shown for retrospective comparison, not feature selection. CV scores used during search may have selection bias.','CV 最佳':'CV selected',
  '依目前資料集與 CV 推薦模型產生。':'Generated for the current dataset and its CV-recommended model.','尚無診斷資料。':'No diagnostic results available.','· 指標使用全部測試資料，散點圖最多顯示 800 筆。':'· Metrics use the full test set; scatter plots display up to 800 samples.',
  'X：實際值 · Y：預測值 ·':'X: actual · Y: predicted ·','X：預測值 · Y：實際值 − 預測值':'X: predicted · Y: actual − predicted','僅使用訓練集合進行 5-fold 評估':'5-fold evaluation uses only the training set','· 前 10 個編碼後特徵':'· Top 10 encoded features','從結果解讀模型':'Interpreting the results',
  '模型檔案載入失敗':'Could not load the model file','模型與資料集 ID 不一致':'The model and dataset IDs do not match','模型尚未準備完成':'The model is not ready',
  '使用此資料集實際訓練的 CV 推薦模型，在瀏覽器完成前處理與推論。':'Preprocessing and inference run in your browser using the actual CV-recommended model trained on this dataset.',
  '此模型尚不支援瀏覽器預測。':'Browser prediction is not supported for this model.','模型已載入 · 本機計算':'Model loaded · computed locally','模型不可用':'Model unavailable','模型載入中…':'Loading model…',
  '輸入為清理／特徵工程後的模型欄位；預設值與範圍僅依訓練集產生。類別不得任意更換，數字須落在訓練範圍。':'Inputs are the cleaned or engineered model fields. Defaults and ranges come only from the training set. Choose a listed category and enter numbers within the training range.',
  '天氣數值依來源標準化尺度輸入。':'Enter weather values using the source dataset’s normalized scale.',
  '產生預測 ↗':'Predict ↗','重設輸入':'Reset inputs','下載預測 CSV (':'Download predictions CSV (','等待輸入':'Awaiting input','確認欄位後按下「產生預測」。':'Check the inputs, then select “Predict”.','由':'Computed by','的':'using','計算。':'.',
  '線性／回歸模型可能超出目標物理範圍，此處保留原始輸出，不做截斷。':'Regression predictions may fall outside the physical target range. The original output is shown without clipping.',
  '模型比較':'Model comparison','特徵選擇':'Feature selection','測試集預測結果':'Test-set predictions','模型 RMSE 圖':'Model RMSE chart','模型 R² 圖':'Model R² chart','特徵數量 RMSE 圖':'Feature-count RMSE chart','特徵數量 R² 圖':'Feature-count R² chart','模型診斷圖':'Model diagnostics','資料集摘要':'Dataset summary','模型評估報告':'Model evaluation report','完整分析結果':'Full analysis results',
  '每個下載檔案名稱皆包含目前 Dataset ID；即時預測紀錄請由上方表單下載。':'Every download filename includes the current Dataset ID. Download interactive prediction history from the form above.',
  '找不到 Dataset Registry，請先執行資料驗證。':'Dataset registry not found. Run data validation first.','此資料集尚未產生分析結果，請執行 Python 訓練。':'No analysis results exist for this dataset. Run the Python training pipeline.','載入失敗 (':'Loading failed (','資料集 ID 不一致':'Dataset ID mismatch','此資料集訓練失敗':'Training failed for this dataset',
  '獨立資料集':'Independent datasets','訓練集交叉驗證':'Training-set cross-validation','真實模型推論':'Real model inference',
  '探索資料、比較模型，理解每個特徵帶來的改變。':'Explore the data, compare models, and understand how each feature changes the results.',
  '選擇分析資料集':'Select dataset','切換後，圖表、模型、預測表單與下載將同步更新。':'Charts, models, prediction forms, and downloads update together when you switch.',
  '· 真實訓練結果 ·':'· Actual training results ·','抽樣分析':'Sample analysis','全量分析':'Full-data analysis','正在載入目前資料集…':'Loading the selected dataset…','資料尚未就緒':'Data not ready','正在讀取資料與模型評估結果…':'Loading data and model evaluation results…','重新載入':'Reload','此資料集目前沒有可用結果。仍可切換其他資料集。':'No results are available for this dataset. You can still select another dataset.',
  '每份資料獨立建模 · 以證據解讀結果':'Independent models for each dataset · Evidence-based interpretation','結果產生：':'Generated:','(台北時間)':'(Taipei time)',
  '流行度分數 (0–100)':'Popularity score (0–100)','每小時租借次數':'Hourly rentals','INR / 月':'INR / month','數值':'Numeric value','類別':'Category','毫秒':'ms','英吋':'inches','分鐘':'minutes','km/l 或 km/kg（依燃料）':'km/l or km/kg (by fuel)','Nm（kgm 已換算）':'Nm (converted from kgm)','標準化溫度 / 41°C':'Temperature / 41°C','標準化體感 / 50°C':'Feels-like temperature / 50°C','相對濕度 / 100':'Relative humidity / 100','風速 / 67':'Wind speed / 67',
};
const chinese: Record<string,string> = {
  'Dataset Overview':'資料集概覽','Model Comparison':'模型比較','Feature Selection':'特徵選擇','Model Diagnostics':'模型診斷','Interactive Prediction':'互動預測','Downloads & Report':'下載與報告',
  'THE DATASET':'資料集','Prediction target':'預測目標','Feature Name':'特徵名稱','Data Type':'資料型態','Description / Unit':'說明／單位','CV RECOMMENDATION':'交叉驗證推薦','Evaluation results':'評估結果','Model':'模型','Best Parameters':'最佳參數',
  'Test RMSE by Model':'各模型測試 RMSE','Test R-squared by Model':'各模型測試 R²','RMSE by Number of Features':'特徵數量與 RMSE','R-squared by Number of Features':'特徵數量與 R²','Number of Features':'特徵數量','Selected Features':'已選特徵','Actual vs Predicted':'實際值與預測值','Residual Plot':'殘差圖','Learning Curve':'學習曲線','Feature Importance / Coefficients':'特徵重要性／係數','Actual':'實際值','Predicted':'預測值','Residual':'殘差','Training RMSE':'訓練 RMSE','Validation RMSE':'驗證 RMSE','Training CV RMSE':'訓練 CV RMSE','READING THE RESULTS':'結果解讀',
  '/ RESEARCH WORKSPACE':'／研究工作區','DATASETS · ONE WORKSPACE':'組資料集 · 同一工作區','ANALYSIS WORKSPACE':'分析工作區','REPRODUCIBLE BY DESIGN':'可重現的實驗設計','APPLIED MACHINE LEARNING':'機器學習應用','AI COURSE PROJECT':'人工智慧課程專案','PREDICTED':'預測結果','Select Dataset':'選擇資料集',
  '7 Datasets · Machine Learning · Feature Selection · Model Comparison':'7 組資料集 · 機器學習 · 特徵選擇 · 模型比較',
};
const pairs = new Map<string, [string,string]>();
for (const [zh,en] of [...Object.entries(english), ...Object.entries(chinese).map(([en,zh])=>[zh,en])]) {
  pairs.set(zh,[zh,en]); pairs.set(en,[zh,en]);
}
export function translate(value: string, language: Language): string {
  const core=value.trim(); const pair=pairs.get(core);
  if(pair)return value.replace(core,pair[language==='zh'?0:1]);
  if(language==='en') {
    value=value.replace(/^由 (.+) 的 (.+) 計算。$/,'Computed by $1 using $2.');
    for(const [zh,en] of Object.entries(english).filter(([zh])=>zh.length>=3).sort((a,b)=>b[0].length-a[0].length))value=value.replaceAll(zh,en);
    return value.replace(/^請填寫 (.+)$/,'Please enter $1').replace(/^(.+) 類別無效$/,'Invalid category for $1').replace(/^(.+) 須介於 (.+)～(.+)$/,'$1 must be between $2 and $3').replace(/^(.+) 必須是有限數字$/,'$1 must be a finite number')
      .replace('模型特徵順序不一致','Model feature order mismatch').replace('模型係數維度不一致','Model coefficient dimension mismatch').replace('尚不支援此模型','Unsupported model').replace('模型回傳無效預測','The model returned an invalid prediction');
  }
  return value;
}
const Context=createContext({language:'zh' as Language,t:(s:string)=>s,toggle:()=>{}});
export function LanguageProvider({children}:{children:React.ReactNode}) {
  const [language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem(LANGUAGE_KEY)==='en'?'en':'zh';}catch{return 'zh';}});
  useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-Hant':'en';try{localStorage.setItem(LANGUAGE_KEY,language);}catch{/* 瀏覽器封鎖儲存時，仍能切換語言。 */}},[language]);
  return <Context.Provider value={{language,t:s=>translate(s,language),toggle:()=>setLanguage(l=>l==='zh'?'en':'zh')}}>{children}</Context.Provider>;
}
export const useI18n=()=>useContext(Context);
export function LanguageToggle(){
  const {language,toggle}=useI18n();
  return <button type="button" className="language-toggle" onClick={toggle} aria-label={language==='zh'?'切換至英文':'Switch to Traditional Chinese'}><span lang="zh-Hant" data-active={language==='zh'}>中文</span><span aria-hidden="true">/</span><span lang="en" data-active={language==='en'}>EN</span></button>;
}
export {localizeResult};
