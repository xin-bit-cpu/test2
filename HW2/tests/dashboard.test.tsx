// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeAll,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,configure,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import fs from 'node:fs';
import {App} from '../src/main';
import {predict} from '../src/inference.mjs';
import {LANGUAGE_KEY} from '../src/i18n';
const read=(p:string)=>JSON.parse(fs.readFileSync('public/'+p,'utf8'));
const registry=read('data/registry.json');
beforeAll(()=>{
  configure({asyncUtilTimeout:5000});
  // JSDOM 不計算排版；這裡提供圖表容器尺寸，測試仍使用真實圖表元件。
  Object.defineProperty(HTMLElement.prototype,'getBoundingClientRect',{value(){return {width:800,height:300,x:0,y:0,top:0,left:0,right:800,bottom:300,toJSON(){return this;}};}});
  vi.stubGlobal('ResizeObserver',class{callback:any;constructor(callback:any){this.callback=callback;}observe(){this.callback([{contentRect:{width:800,height:300}}]);}unobserve(){}disconnect(){}});
  vi.stubGlobal('fetch',vi.fn(async(url:string,opts:any={})=>{
    await new Promise(resolve=>setTimeout(resolve,2));
    if(opts.signal?.aborted)throw new DOMException('Aborted','AbortError');
    const file='public/'+String(url).replace(/^\.?\//,'');
    if(!fs.existsSync(file))return {ok:false,status:404};
    return {ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};
  }));
});
afterEach(cleanup);
beforeEach(()=>localStorage.clear());
test('seven dataset switches synchronize forms, model, units, links and reset prediction',async()=>{
  render(<App/>);
  await waitFor(()=>expect(screen.getByRole('combobox',{name:/選擇分析資料集/}).querySelectorAll('option')).toHaveLength(7));
  for(const entry of registry){
    fireEvent.change(screen.getByRole('combobox',{name:/選擇分析資料集/}),{target:{value:entry.id}});
    await waitFor(()=>expect(screen.getByRole('button',{name:'產生預測 ↗'}).disabled).toBe(false));
    const r=read(`data/${entry.id}/results.json`),m=read(`data/${entry.id}/model.json`);
    expect(screen.getByText('等待輸入')).toBeTruthy();
    const form=document.querySelector('form')!;
    expect(form.querySelectorAll('input,select')).toHaveLength(r.feature_schema.length);
    const input:Record<string,string>={};
    for(const f of r.feature_schema){const el=within(form).getByLabelText(f.name) as HTMLInputElement;expect(el.value).toBe(String(f.default));input[f.name]=el.value;expect(el.tagName).toBe(f.type==='category'?'SELECT':'INPUT');}
    const expected=predict(m,input);
    fireEvent.click(screen.getByRole('button',{name:'產生預測 ↗'}));
    expect(screen.queryByText('等待輸入')).toBeNull();
    expect(document.querySelector('.prediction-result')!.textContent).toContain(expected.toLocaleString('en-US',{maximumFractionDigits:2}));
    expect(document.querySelector('.prediction-result')!.textContent).toContain(r.prediction_unit);
    const links=Array.from(document.querySelectorAll<HTMLAnchorElement>('.downloads a'));
    expect(links).toHaveLength(11);
    links.forEach(a=>{expect(a.getAttribute('href')).toContain(`data/${entry.id}/`);expect(a.download.startsWith(entry.id+'_')).toBe(true);});
    const numeric=r.feature_schema.find((f:any)=>f.type==='number');
    if(numeric){fireEvent.change(within(form).getByLabelText(numeric.name),{target:{value:''}});fireEvent.submit(form);expect(screen.getByRole('alert').textContent).toContain(numeric.name);}
    fireEvent.click(screen.getByRole('button',{name:'重設輸入'}));
    expect(screen.getByText('等待輸入')).toBeTruthy();expect(screen.queryByRole('alert')).toBeNull();
  }
},30000);
test('rapid dataset changes keep the latest dataset and missing results stay isolated',async()=>{
  render(<App/>);await waitFor(()=>expect(screen.getByRole('combobox',{name:/選擇分析資料集/}).querySelectorAll('option')).toHaveLength(7));
  const selector=screen.getByRole('combobox',{name:/選擇分析資料集/});
  fireEvent.change(selector,{target:{value:'spotify'}});fireEvent.change(selector,{target:{value:'flight'}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'產生預測 ↗'}).disabled).toBe(false));
  expect(document.querySelector('.dataset-title')!.textContent).toBe('Flight Ticket Price');
  const original=globalThis.fetch;
  vi.stubGlobal('fetch',async(url:any,opts:any)=>String(url).includes('/laptop/results.json')?{ok:false,status:404}:original(url,opts));
  fireEvent.change(selector,{target:{value:'laptop'}});
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('尚未產生分析結果'));
  expect(screen.queryByRole('button',{name:'產生預測 ↗'})).toBeNull();
  fireEvent.change(selector,{target:{value:'king-county'}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'產生預測 ↗'}).disabled).toBe(false));
  expect(document.querySelector('.dataset-title')!.textContent).toBe('King County House Sales');
  vi.stubGlobal('fetch',original);
});
test('language switch preserves predictions and inputs, covers seven datasets, and persists after remount',async()=>{
  render(<App/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'產生預測 ↗'}).disabled).toBe(false));
  fireEvent.change(screen.getByLabelText('bedrooms'),{target:{value:'4'}});
  fireEvent.click(screen.getByRole('button',{name:'產生預測 ↗'}));
  const prediction=document.querySelector('.prediction-result strong')!.textContent;
  const requests=vi.mocked(fetch).mock.calls.length;
  fireEvent.click(screen.getByRole('button',{name:'切換至英文'}));
  expect(document.documentElement.lang).toBe('en');
  expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
  expect(screen.getByRole('heading',{name:'Dataset Overview'})).toBeTruthy();
  expect((screen.getByLabelText('bedrooms') as HTMLInputElement).value).toBe('4');
  expect(document.querySelector('.prediction-result strong')!.textContent).toBe(prediction);
  expect(vi.mocked(fetch).mock.calls.length).toBe(requests);
  for(const entry of registry){
    fireEvent.change(screen.getByRole('combobox',{name:'Select dataset'}),{target:{value:entry.id}});
    await waitFor(()=>expect(screen.getByRole('button',{name:'Predict ↗'}).disabled).toBe(false));
    expect(document.querySelector('main')!.textContent).not.toMatch(/[\u3400-\u9fff]/);
    expect(document.querySelector('.dataset-title')!.textContent).toBe(entry.display_name);
    const form=document.querySelector('form')!;
    const field=read(`data/${entry.id}/results.json`).feature_schema.find((f:any)=>f.type==='number');
    fireEvent.change(within(form).getByLabelText(field.name),{target:{value:''}});
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toBe(`Please enter ${field.name}`);
    fireEvent.click(screen.getByRole('button',{name:'Reset inputs'}));
  }
  cleanup();render(<App/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Predict ↗'}).disabled).toBe(false));
  expect(document.documentElement.lang).toBe('en');
  fireEvent.click(screen.getByRole('button',{name:'Switch to Traditional Chinese'}));
  expect(document.documentElement.lang).toBe('zh-Hant');
  expect(screen.getByRole('heading',{name:'資料集概覽'})).toBeTruthy();
  expect(localStorage.getItem(LANGUAGE_KEY)).toBe('zh');
},30000);
