"""七組資料各自設定；實際欄位與筆數由 audit 讀檔後產生。"""
REGISTRY = [
    dict(id="king-county", display_name="King County House Sales", slug="harlfoxem/housesalesprediction", file="kc_house_data.csv", target_column="price", prediction_unit="USD", description="西雅圖與 King County 房屋成交資料，依建物條件與位置預測售價。", note="移除 id 與 date；同一房屋 id 僅保留第一筆，避免重複物件跨集合。"),
    dict(id="spotify", display_name="Spotify Tracks", slug="maharshipandya/-spotify-tracks-dataset", file="dataset.csv", target_column="popularity", prediction_unit="流行度分數 (0–100)", description="以音訊特性分析歌曲流行度；不將曲名、藝人與專輯識別資訊當作預測捷徑。", note="依 track_id 去重；移除索引、曲名、專輯、藝人與 track_id，保留音訊特徵與曲風。"),
    dict(id="laptop", display_name="Laptop Price", slug="muhammetvarl/laptop-price", file="laptop_price.csv", target_column="Price", prediction_unit="EUR", description="依筆電品牌、螢幕與硬體規格預測價格。", note="來源目標為 Price_euros，統一映射為 Price；移除 laptop_ID。Product 使用產品系列首字，CPU/GPU 使用廠牌與系列，降低稀疏類別。"),
    dict(id="bike", display_name="Bike Sharing Demand", slug="marklvl/bike-sharing-dataset", file="hour.csv", target_column="count", prediction_unit="每小時租借次數", description="Washington D.C. 每小時自行車租借量；使用日曆與天氣因素。", note="使用相同 Capital Bikeshare/UCI 來源的 Kaggle hourly 版本；cnt 映射 count。casual + registered = cnt，兩欄必須排除；移除 instant、dteday。採時間順序 80/20 與 TimeSeriesSplit。"),
    dict(id="used-car", display_name="Used Car Price", slug="nehalbirla/vehicle-dataset-from-cardekho", file="Car details v3.csv", target_column="Selling_Price", prediction_unit="INR", description="採用較完整的 CarDekho v3，包含里程、引擎、馬力、扭力與座位數。", note="較小的 car data.csv 不符合欄位下限，因此選 v3 的 12 個原始輸入欄位。selling_price 映射 Selling_Price；車名轉品牌、規格字串取數值。"),
    dict(id="house-rent", display_name="House Rent Prediction", slug="iamsouravbanerjee/house-rent-prediction-dataset", file="House_Rent_Dataset.csv", target_column="Rent", prediction_unit="INR / 月", description="印度多城市租屋資料，分析面積、位置、格局與設備對租金的影響。", note="排除聯絡人 Point of Contact；原始有效欄位不足 11，不宣稱符合。Posted On 拆年月日／星期，Floor 拆所在樓層／總樓層，屬可解釋特徵工程方案。"),
    dict(id="flight", display_name="Flight Ticket Price", slug="nikhilmittal/flight-fare-prediction-mh", file="Data_Train.xlsx", target_column="Price", prediction_unit="INR", description="依航空公司、路線、出發日期、時刻、停站與飛行時間預測票價。", note="此版本為 XLSX 而非 CSV，讀取後核對全部原始欄位。原始 10 個輸入不足 11；日期／時間拆解提供合理方案。排除可能反映價格的 Additional_Info，Route 與 Source/Destination/停站重複而排除。"),
]

def public_registry():
    import json
    from pathlib import Path
    out=[]
    for r in REGISTRY:
        p=Path(__file__).resolve().parents[1]/"public"/"data"/r["id"]/"source.json"
        source=json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        out.append({**r,"kaggle_url":"https://www.kaggle.com/datasets/"+r["slug"],"data_source":r["file"],"source_version":source.get("version"),"source_license":source.get("license"),"source_last_updated":source.get("last_updated")})
    return out
