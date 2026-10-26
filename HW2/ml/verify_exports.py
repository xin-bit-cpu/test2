"""對照全部 35 個真實 sklearn 模型與 JavaScript 匯出推論。"""
import json
import subprocess
import joblib
import numpy as np
import pandas as pd
from data import ROOT,OUT,write_json
from registry import REGISTRY
from train import export_model

cases=[]
for r in REGISTRY:
    folder=OUT/r['id']
    result=json.loads((folder/'results.json').read_text(encoding='utf-8'))
    inputs=[c['input'] for c in json.loads((folder/'parity.json').read_text(encoding='utf-8'))]
    X=pd.DataFrame({f['name']:pd.Series([c[f['name']] if c[f['name']] is not None else np.nan for c in inputs],dtype=float if f['type']=='number' else object) for f in result['feature_schema']})
    for row in result['model_results']:
        pipe=joblib.load(ROOT/'artifacts'/r['id']/(row['name'].replace(' ','_')+'.joblib'))
        expected=pipe.predict(X)
        cases.append({'id':r['id'],'name':row['name'],'model':export_model(pipe,r['id']),'cases':[{'input':c,'expected':float(p)} for c,p in zip(inputs,expected)]})

script="""
import {predict} from './src/inference.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const models=JSON.parse(input);let count=0,maxRelativeError=0;
for(const m of models)for(const c of m.cases){
  const value=predict(m.model,c.input),error=Math.abs(value-c.expected)/Math.max(1,Math.abs(c.expected));
  if(!Number.isFinite(error)||error>1e-7)throw Error(`${m.id} ${m.name}: JS ${value}, Python ${c.expected}`);
  maxRelativeError=Math.max(maxRelativeError,error);count++;
}
console.log(JSON.stringify({models:models.length,cases:count,max_relative_error:maxRelativeError,passed:true}));
"""
run=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,input=json.dumps(cases),capture_output=True,text=True,encoding='utf-8',check=True)
summary=json.loads(run.stdout)
write_json(OUT/'verification.json',summary)
print(json.dumps(summary))
