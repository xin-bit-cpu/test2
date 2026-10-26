// 僅計算匯出的已訓練模型；不可在此加入估價公式或亂數。
export function vectorize(model, input) {
  const vector = [];
  for (const f of model.numeric) {
    const raw = input[f.name];
    const value = raw === null || raw === undefined || raw === '' ? f.fill : Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${f.name} 必須是有限數字`);
    vector.push((value - f.mean) / f.scale);
  }
  for (const f of model.categorical) {
    const raw = input[f.name];
    const value = raw === null || raw === undefined || raw === '' ? f.fill : String(raw);
    vector.push(...f.values.map(v => Number(v === value)));
  }
  if (vector.length !== model.feature_order.length) throw new Error('模型特徵順序不一致');
  return vector;
}
export function predict(model, input) {
  const x = vectorize(model, input);
  let value;
  if (model.kind === 'linear') {
    if (x.length !== model.coef.length) throw new Error('模型係數維度不一致');
    value = model.intercept + model.coef.reduce((s, c, i) => s + c * x[i], 0);
  } else if (model.kind === 'forest') {
    // sklearn 決策樹 predict 會將輸入轉為 float32。
    const xf = x.map(Math.fround);
    value = model.trees.reduce((sum, tree) => {
      let n = 0;
      while (tree.left[n] !== -1) n = xf[tree.feature[n]] <= tree.threshold[n] ? tree.left[n] : tree.right[n];
      return sum + tree.value[n];
    }, 0) / model.trees.length;
  } else throw new Error('尚不支援此模型');
  if (!Number.isFinite(value)) throw new Error('模型回傳無效預測');
  return value;
}
export function defaults(schema) { return Object.fromEntries(schema.map(f => [f.name, String(f.default)])); }
export function validate(schema, input) {
  for (const f of schema) {
    const raw = input[f.name];
    if (raw === '' || raw === null || raw === undefined) throw new Error(`請填寫 ${f.name}`);
    if (f.type === 'category' && !f.values.includes(String(raw))) throw new Error(`${f.name} 類別無效`);
    if (f.type === 'number' && (!Number.isFinite(Number(raw)) || Number(raw) < f.min || Number(raw) > f.max)) throw new Error(`${f.name} 須介於 ${f.min}～${f.max}`);
  }
  return true;
}
