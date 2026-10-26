import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {predict, defaults, validate} from '../src/inference.mjs';
const base=path.resolve('public/data');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const registry=json(path.join(base,'registry.json'));
test('registry contains seven unique datasets',()=>{assert.equal(registry.length,7);assert.equal(new Set(registry.map(r=>r.id)).size,7);});
for(const entry of registry){
  test(`${entry.id}: real results, all five models, complete forward selection, downloads and inference parity`,()=>{
    const folder=path.join(base,entry.id),r=json(path.join(folder,'results.json')),model=json(path.join(folder,'model.json'));
    assert.equal(r.status,'ready');assert.equal(r.id,entry.id);assert.equal(model.id,entry.id);
    assert.equal(r.model_results.length,5);
    assert.equal(r.recommended_model,[...r.model_results].sort((a,b)=>a.cv_rmse-b.cv_rmse)[0].name);
    assert.equal(r.best_features.count,[...r.feature_selection_results].sort((a,b)=>a.cv_rmse-b.cv_rmse)[0].count);
    assert.equal(r.feature_selection_results.length,r.feature_schema.length);
    r.feature_selection_results.forEach((step,i)=>{assert.equal(step.count,i+1);assert.equal(new Set(step.selected_features).size,i+1);if(i)assert.ok(r.feature_selection_results[i-1].selected_features.every(f=>step.selected_features.includes(f)));});
    for(const row of [...r.model_results,...r.feature_selection_results])for(const key of ['cv_rmse','test_rmse','test_r2','test_mae'])assert.ok(Number.isFinite(row[key]),key);
    const s=r.dataset_summary;assert.equal(s.training_samples+s.testing_samples,s.analyzed_samples);assert.equal(s.original_feature_count,r.audit.original_features.length);assert.equal(s.encoded_feature_count,model.feature_order.length);assert.match(r.audit.sha256,/^[a-f0-9]{64}$/);
    const input=defaults(r.feature_schema);assert.equal(validate(r.feature_schema,input),true);assert.ok(Number.isFinite(predict(model,input)));
    const numeric=r.feature_schema.find(f=>f.type==='number');if(numeric){assert.throws(()=>validate(r.feature_schema,{...input,[numeric.name]:''}));assert.throws(()=>validate(r.feature_schema,{...input,[numeric.name]:numeric.max+1}));}
    const cat=r.feature_schema.find(f=>f.type==='category');if(cat)assert.throws(()=>validate(r.feature_schema,{...input,[cat.name]:'__invalid__'}));
    for(const c of json(path.join(folder,'parity.json'))){const actual=predict(model,c.input);assert.ok(Math.abs(actual-c.expected)<=1e-7*Math.max(1,Math.abs(c.expected)),`${entry.id}: JS ${actual}, Python ${c.expected}`);}
    for(const f of ['model_comparison.csv','feature_selection.csv','test_predictions.csv','summary.json','report.md','test_rmse.png','test_r2.png','features_test_rmse.png','features_test_r2.png','diagnostics.png']){const bytes=fs.readFileSync(path.join(folder,f));assert.ok(bytes.length>20);if(f.endsWith('.png'))assert.equal(bytes.subarray(1,4).toString(),'PNG');}
    if(entry.id==='bike')assert.ok(!r.feature_schema.some(f=>['casual','registered','instant','count','cnt'].includes(f.name)));
    if(['house-rent','flight'].includes(entry.id))assert.equal(r.audit.raw_requirement_met,false);
  });
}
