"""只同步欄位說明與來源 metadata，絕不改寫模型、樣本或評估數值。"""
import json
from data import ROOT,OUT,write_json
from registry import public_registry
from descriptions import DESCRIPTIONS
registry=public_registry()
write_json(OUT/'registry.json',registry)
for entry in registry:
    p=OUT/entry['id']/'results.json'
    if not p.exists():continue
    r=json.loads(p.read_text(encoding='utf-8'))
    if r.get('status')!='ready':continue
    r.update({k:v for k,v in entry.items() if k.startswith('source_')})
    for field in r['feature_schema']:field['description']=DESCRIPTIONS.get(field['name'],field['description'])
    write_json(p,r)
    report=OUT/entry['id']/'report.md'
    text=report.read_text(encoding='utf-8')
    marker='\n\n## 來源版本\n'
    text=text.split(marker)[0]+marker+f"Kaggle version {entry['source_version']}；授權：{entry['source_license']}；來源更新：{entry['source_last_updated']}。\n"
    report.write_text(text,encoding='utf-8')
print('Dataset metadata synchronized.')
lines=['# 全量分析結果摘要','','以下皆為真實訓練輸出；模型依訓練集 CV RMSE 推薦，Test 指標僅做最終評估。','','| 資料集 | 分析筆數 | CV 推薦模型 | CV RMSE | Test RMSE | Test R² | 單位 | CV 最佳特徵數 |','|---|---:|---|---:|---:|---:|---|---:|']
for entry in registry:
    r=json.loads((OUT/entry['id']/'results.json').read_text(encoding='utf-8'))
    if r.get('status')!='ready':continue
    best=next(m for m in r['model_results'] if m['name']==r['recommended_model'])
    lines.append(f"| {entry['display_name']} | {r['dataset_summary']['analyzed_samples']:,} | {r['recommended_model']} | {best['cv_rmse']:,.3f} | {best['test_rmse']:,.3f} | {best['test_r2']:.4f} | {r['prediction_unit']} | {r['best_features']['count']} |")
lines+=['','各資料集 RMSE 單位不同，不能直接跨資料集排名。最佳特徵數屬 Linear Regression 前向選擇分析，與五模型比較的推薦模型分開。租屋與機票的原始有效欄位不足 11，衍生特徵方案不等於已符合原始數量要求。','','詳細指標、選入特徵、學習曲線與動態解讀見各組 `public/data/<id>/report.md`／`results.json`。']
(ROOT/'docs').mkdir(exist_ok=True)
(ROOT/'docs'/'RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
