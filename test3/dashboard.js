"use strict";
// Portable inference matches sklearn: raw-space linear coefficients or tree traversal.
window.predictStartupModel = function (model, values) {
  const exported = model.export;
  if (exported.kind === "linear") return Object.entries(exported.coefficients).reduce((sum, [name, coef]) => sum + coef * values[name], exported.intercept);
  const input = exported.features.map(name => Math.fround(values[name]));
  let sum = 0;
  for (const tree of exported.trees) {
    let node = 0;
    while (tree.left[node] !== -1) node = input[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
    sum += tree.value[node];
  }
  return sum / exported.trees.length;
};
(() => {
  const data = window.STARTUP_RESULTS;
  const get = id => document.getElementById(id);
  const number = (n, digits = 2) => new Intl.NumberFormat("en-US", {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(n);
  if (!data || !data.models) {
    get("error").hidden = false;
    get("error").textContent = "尚未找到五種模型結果，請先執行 python train.py，並重新整理網頁。";
    get("prediction-form").querySelector("button").disabled = true;
    return;
  }
  const outputBase = document.body.dataset.outputBase || "";
  for (const link of document.querySelectorAll("[data-output]")) link.href = outputBase + link.dataset.output;
  get("split").textContent = `${data.samples} 筆資料 · ${data.train_samples} 訓練 / ${data.test_samples} 測試`;
  get("run-info").textContent = `更新 ${new Date(data.generated_at).toLocaleString("zh-TW", {timeZone: "Asia/Taipei", hour12: false})} (台北) · sklearn ${data.sklearn_version} · SHA256 ${data.data_sha256.slice(0, 12)}`;
  function cell(row, value) { const td = document.createElement("td"); td.textContent = value; row.append(td); return td; }
  function badge(cell) { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = "CV 推薦"; cell.append(tag); }
  const controls = [];
  for (const item of [{id: "all", name: "五種模型整合比較"}, ...data.models]) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "model-button"; button.textContent = item.name;
    button.addEventListener("click", () => { get("model-select").value = item.id; changeModel(); });
    get("model-buttons").append(button); controls.push({button, id: item.id});
  }
  const allOption = document.createElement("option"); allOption.value = "all"; allOption.textContent = "五種模型整合比較"; get("model-select").append(allOption);
  for (const model of data.models) {
    const option = document.createElement("option"); option.value = model.id; option.textContent = model.name + (model.id === data.recommended_model ? "（CV 推薦）" : ""); get("model-select").append(option);
    const row = document.createElement("tr");
    if (model.id === data.recommended_model) row.className = "recommended";
    const first = cell(row, model.name);
    if (model.id === data.recommended_model) badge(first);
    cell(row, number(model["CV RMSE"])); cell(row, number(model.metrics.RMSE)); cell(row, number(model.metrics["R-squared"], 6)); cell(row, number(model.metrics.MAE));
    cell(row, Object.entries(model.parameters).map(([key, value]) => `${key}=${value ?? "None"}`).join(", ") || "預設參數");
    get("models-body").append(row);
  }
  for (const result of data.selection) {
    const row = document.createElement("tr");
    const recommended = result["Number of Features"] === data.best["Number of Features"];
    if (recommended) row.className = "recommended";
    const first = cell(row, result["Number of Features"]);
    if (recommended) badge(first);
    cell(row, result["Selected Features"].join(", "));
    cell(row, number(result["CV RMSE"])); cell(row, number(result.RMSE)); cell(row, number(result["R-squared"], 6));
    get("selection-body").append(row);
  }
  get("model-select").value = "all";
  let active;
  get("data-description").textContent = `${data.samples} 筆 50 Startups 資料來自你指定的 GaneshSparkz CSV，包含三種支出、State 與目標 Profit。原始 CSV 保留於版本控制。`;
  function predict() {
    const form = get("prediction-form");
    if (!form.reportValidity()) return;
    const values = {"R&D Spend": Number(form.elements.rd.value), "Administration": Number(form.elements.admin.value), "Marketing Spend": Number(form.elements.marketing.value), "State_Florida": Number(form.elements.state.value === "Florida"), "State_New York": Number(form.elements.state.value === "New York")};
    if (Object.values(values).some(value => !Number.isFinite(value))) return;
    get("profit").textContent = active ? number(window.predictStartupModel(active, values)) : "五種模型試算";
    get("multi-profit").replaceChildren();
    get("multi-profit").hidden = Boolean(active);
    if (!active) for (const model of data.models) {
      const item = document.createElement("div"); const name = document.createElement("span"); const value = document.createElement("b");
      name.textContent = model.name; value.textContent = number(window.predictStartupModel(model, values)); item.append(name, value); get("multi-profit").append(item);
    }
    const outside = Object.keys(data.ranges).filter(name => values[name] < data.ranges[name].min || values[name] > data.ranges[name].max);
    get("range-note").textContent = outside.length ? `${outside.join("、")} 超出訓練資料範圍，本次屬於範圍外估計。` : "這是小型資料集的模型估計，並非實際獲利保證。";
  }
  function changeModel() {
    const selected = get("model-select").value;
    active = data.models.find(model => model.id === selected);
    for (const control of controls) control.button.setAttribute("aria-pressed", String(control.id === selected));
    get("view-title").textContent = active ? active.name + " 預測結果" : "五種模型整合比較";
    get("benchmark-chart").src = active ? `diagnostics_${active.id}.png` : "model_comparison.png";
    get("benchmark-chart").alt = active ? active.name + " 實際值對預測值與殘差圖" : "五種模型 RMSE 與 R-squared 整合比較";
    get("diagnostics-chart").src = active ? `diagnostics_${active.id}.png` : "all_models_predictions.png";
    get("diagnostics-chart").alt = active ? active.name + " 預測診斷圖" : "相同測試樣本的真實值與五種模型預測折線整合圖";
    get("prediction-heading").replaceChildren();
    const header = document.createElement("tr");
    const titles = active ? ["原始資料列", "所在地", "實際 Profit", "預測 Profit", "殘差"] : ["原始資料列", "實際 Profit", ...data.models.map(model => model.name)];
    for (const title of titles) { const th = document.createElement("th"); th.textContent = title; header.append(th); }
    get("prediction-heading").append(header);
    const labels = active ? ["測試集 RMSE ↓", "測試集 R² ↑", "測試集 MAE ↓", "目前選取模型"] : ["交叉驗證推薦模型", "推薦模型最佳參數", "推薦模型測試 RMSE ↓", "推薦模型測試 R² ↑"];
    ["first-stat-label", "second-stat-label", "third-stat-label", "fourth-stat-label"].forEach((id, index) => { get(id).textContent = labels[index]; });
    for (const id of ["rmse", "r2", "mae", "feature-count"]) get(id).className = active ? "" : "recommended-summary";
    const notes = active ? ["誤差尺度，與 Profit 單位相同", "決定係數；越接近 1 越好", "平均絕對誤差"] : ["依訓練集 5 折 CV RMSE 選出", "GridSearchCV 於訓練集選出的參數", "以下兩項測試指標均屬於推薦模型"];
    ["first-stat-note", "second-stat-note", "third-stat-note"].forEach((id, index) => { get(id).textContent = notes[index]; });
    if (!active) {
      const recommended = data.models.find(model => model.id === data.recommended_model);
      get("rmse").textContent = recommended.name;
      get("r2").textContent = Object.entries(recommended.parameters).map(([name, value]) => `${name} = ${value ?? "None"}`).join("、") || "預設參數";
      get("mae").textContent = number(recommended.metrics.RMSE);
      get("feature-count").textContent = number(recommended.metrics["R-squared"], 4);
      get("first-stat-note").textContent = `5 折 CV RMSE：${number(recommended["CV RMSE"])}`;
      get("model-description").textContent = "同時比較五種方法的預測；整合畫面分別呈現各模型，沒有將其平均成新模型。";
      get("active-features").textContent = "相同輸入 · 五種獨立預測";
      get("model-equation").textContent = "整合比較顯示五種模型對同一組測試資料的結果。圖表依原始列號排列，並非時間序列。";
      get("prediction-body").replaceChildren();
      for (const item of data.models[0].predictions) {
        const row = document.createElement("tr"); cell(row, item["Row ID"]); cell(row, number(item.Profit));
        for (const model of data.models) cell(row, number(model.predictions.find(prediction => prediction["Row ID"] === item["Row ID"])["Predicted Profit"]));
        get("prediction-body").append(row);
      }
      get("predictions-download").href = outputBase + "all_models_predictions.csv";
      predict(); return;
    }
    get("rmse").textContent = number(active.metrics.RMSE); get("r2").textContent = number(active.metrics["R-squared"], 4); get("mae").textContent = number(active.metrics.MAE);
    get("feature-count").textContent = active.name;
    get("model-description").textContent = active.description;
    get("active-features").textContent = `${active.name} · 5 個編碼後特徵`;
    get("prediction-body").replaceChildren();
    for (const item of active.predictions) {
      const row = document.createElement("tr");
      [item["Row ID"], item.State, number(item.Profit), number(item["Predicted Profit"]), number(item.Residual)].forEach(value => cell(row, value));
      get("prediction-body").append(row);
    }
    get("predictions-download").href = outputBase + `predictions_${active.id}.csv`;
    const exported = active.export;
    get("model-equation").textContent = exported.kind === "linear" ? `${active.name}: Profit = ` + number(exported.intercept, 4) + Object.entries(exported.coefficients).map(([name, coef]) => ` ${coef >= 0 ? "+" : "−"} ${number(Math.abs(coef), 6)} × ${name}`).join("") : `Random Forest：${exported.trees.length} 棵決策樹預測值的平均。網頁使用訓練後匯出的完整樹結構計算。`;
    predict();
  }
  get("model-select").addEventListener("change", changeModel);
  get("prediction-form").addEventListener("submit", event => { event.preventDefault(); predict(); });
  changeModel();
})();
