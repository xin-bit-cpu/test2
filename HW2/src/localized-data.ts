const datasets: Record<string,[string,string]>={
  'king-county':['House sales in Seattle and King County, modeled using building characteristics and location.','Remove id and date. Keep only the first sale for each property ID to prevent the same property from appearing in both splits.'],
  spotify:['Predict track popularity from audio characteristics, without using artist, album, or track names as identification shortcuts.','Deduplicate by track_id. Remove index, track name, album, artist, and track_id; retain audio features and genre.'],
  laptop:['Predict laptop prices from brand, screen, and hardware specifications.','Map Price_euros to Price and remove laptop_ID. Product uses the first word of the product family; CPU/GPU use brand and series to reduce sparse categories.'],
  bike:['Hourly bicycle rentals in Washington, D.C., modeled using calendar and weather conditions.','Use the Kaggle hourly version of the same Capital Bikeshare/UCI source; map cnt to count. Exclude casual and registered because their sum equals cnt. Remove instant and dteday. Use a chronological 80/20 split and TimeSeriesSplit.'],
  'used-car':['The more detailed CarDekho v3 includes mileage, engine size, power, torque, and seating.','The smaller car data.csv does not meet the feature-count requirement. Use the 12 original inputs in v3. Map selling_price to Selling_Price, reduce vehicle names to brands, and parse numeric specifications.'],
  'house-rent':['Rental listings across Indian cities, relating rent to area, location, layout, and furnishings.','Exclude Point of Contact. Fewer than 11 original usable fields remain; this does not meet the original-count requirement. Split Posted On into year/month/day/weekday and Floor into current/total floors as an interpretable engineering proposal.'],
  flight:['Predict fares using airline, origin/destination, departure date, times, stops, and flight duration.','This source is XLSX, not CSV, and all source columns were verified. Its 10 original inputs fall below 11. Date/time decomposition is an engineering proposal. Exclude potentially price-related Additional_Info and redundant Route information.'],
};
const fields: Record<string,string>={
  bedrooms:'Number of bedrooms',bathrooms:'Bathrooms, including partial bathrooms',sqft_living:'Living area',sqft_lot:'Lot area',floors:'Number of floors',waterfront:'Waterfront: 0 no / 1 yes',view:'View rating',condition:'Condition rating',grade:'Construction quality grade',sqft_above:'Above-ground floor area',sqft_basement:'Basement area',yr_built:'Construction year',yr_renovated:'Renovation year; 0 means no recorded renovation',zipcode:'ZIP code',lat:'Latitude',long:'Longitude',sqft_living15:'Nearby homes’ average living area',sqft_lot15:'Nearby homes’ average lot area',
  duration_ms:'Track duration',explicit:'Explicit content: 0 no / 1 yes',key:'Pitch class: 0–11',mode:'Mode: 0 minor / 1 major',speechiness:'Spoken-word content',acousticness:'Acoustic confidence',instrumentalness:'Instrumental confidence',liveness:'Live-performance confidence',valence:'Musical positiveness',time_signature:'Time signature',track_genre:'Track genre',
  Company:'Laptop manufacturer',Product:'Product family (first word)',TypeName:'Laptop type',Inches:'Screen diagonal',ScreenResolution:'Screen specifications and resolution',Cpu:'CPU brand and series (first two words)',Ram:'RAM capacity',Memory:'Storage specifications',Gpu:'GPU brand and series (first two words)',OpSys:'Operating system',Weight:'Weight',
  season:'Season: 1 spring / 2 summer / 3 fall / 4 winter',yr:'Year: 0 = 2011, 1 = 2012',mnth:'Month: 1–12',hr:'Hour: 0–23',holiday:'Public holiday flag',weekday:'Weekday: 0 Sunday, 1–6 Monday–Saturday',workingday:'Working-day flag',weathersit:'Weather: 1 clear through 4 severe',temp:'Normalized temperature',atemp:'Normalized feels-like temperature',hum:'Normalized relative humidity',windspeed:'Normalized wind speed',
  name:'Vehicle brand (first word of vehicle name)',year:'Vehicle registration year',km_driven:'Distance driven',fuel:'Fuel type',seller_type:'Seller type',transmission:'Transmission type',owner:'Previous-owner category',mileage:'Fuel economy; interpret by fuel type',engine:'Engine displacement',max_power:'Maximum power',torque:'Maximum torque; kgm converted to Nm',seats:'Number of seats',
  BHK:'Bedroom / hall / kitchen layout',Size:'Rental floor area','Area Type':'Area measurement type','Area Locality':'Locality',City:'City','Furnishing Status':'Furnishing level','Tenant Preferred':'Preferred tenant category',Bathroom:'Number of bathrooms',posted_year:'Listing year',posted_month:'Listing month',posted_day:'Listing day of month',posted_weekday:'Listing weekday: 0 Monday–6 Sunday',floor_number:'Current floor: ground 0, upper/lower basement -1/-2',total_floors:'Total building floors',
  Airline:'Airline',Source:'Origin city',Destination:'Destination city',Total_Stops:'Number of stops; 0 for nonstop',journey_month:'Departure month',journey_day:'Departure day of month',journey_weekday:'Departure weekday: 0 Monday–6 Sunday',Dep_Time_hour:'Departure hour',Dep_Time_minute:'Departure minute',Arrival_Time_hour:'Arrival hour',Arrival_Time_minute:'Arrival minute',duration_minutes:'Total flight duration',
};
const diagnosticPhrases: Record<string,string>={
  '最終學習曲線：':'Final learning curve: ','，差距 ':'; gap ',
  '差距超過驗證誤差的 20%，有過度擬合跡象。':'The gap exceeds 20% of validation error, suggesting overfitting.',
  '依此差距尚無強烈過度擬合證據。':'This gap does not provide strong evidence of overfitting.',
  '殘差與預測值的 Pearson r = ':'Pearson correlation between residuals and predictions: r = ',
  '此線性相關檢查無法排除異方差或非線性規律，需配合殘差圖。':'This linear-correlation check cannot rule out heteroscedasticity or nonlinear patterns; inspect the residual plot.',
  'CV 選出 ':'CV selected ',' 個特徵；一個特徵 CV RMSE ':' features; single-feature CV RMSE ',
  '，最佳組合 ':'; best combination ','，全部特徵 ':'; all features ',
  '最顯著的編碼後特徵為 ':'The strongest encoded feature is ',
  '；係數表示控制其他輸入後的關聯，不等於因果。':'; coefficients describe associations conditional on other inputs, not causation.',
  '欠擬合評估：訓練集目標標準差 ':'Underfitting check: training-target standard deviation ',
  '，最大樣本 Training RMSE ':'; largest-sample training RMSE ',
  '訓練誤差仍超過目標標準差的 80%，有高偏差跡象；僅為啟發式檢查。':'Training error exceeds 80% of the target standard deviation, suggesting high bias. This is only a heuristic.',
  '目前無此高偏差門檻的證據，不能單憑 RMSE 排除欠擬合。':'This high-bias threshold is not met. RMSE alone cannot rule out underfitting.',
};
// 只翻譯顯示用副本，原始數值、欄位 ID、類別值與模型不變。
export function localizeResult<T>(source:T,language:'zh'|'en',t:(s:string)=>string):T {
  if(language==='zh')return source;
  const data=source as any;
  const [description,note]=datasets[data.id]??[data.description,data.note];
  return {...data,description,note,prediction_unit:t(data.prediction_unit),
    feature_schema:data.feature_schema.map((f:any)=>({...f,description:fields[f.name]??f.name.replaceAll('_',' '),unit:t(f.unit)})),
    diagnostic_results:{...data.diagnostic_results,explanations:data.diagnostic_results.explanations.map((text:string)=>{
      for(const [zh,en] of Object.entries(diagnosticPhrases))text=text.replaceAll(zh,en);
      return text.replaceAll('，',', ').replaceAll('。','. ').replaceAll('；','; ').trim();
    })}
  };
}
