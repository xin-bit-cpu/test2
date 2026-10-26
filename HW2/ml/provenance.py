"""記錄官方 Kaggle 版本與授權；使用 ZIP SHA256 識別實際分析快照。"""
import json
import hashlib
from datetime import datetime,timezone
from urllib.request import urlopen,Request
from data import OUT,RAW,write_json
from registry import REGISTRY

for r in REGISTRY:
    previous=OUT/r['id']/'source.json'
    sha=hashlib.sha256((RAW/(r['id']+'.zip')).read_bytes()).hexdigest()
    if previous.exists():
        saved=json.loads(previous.read_text(encoding='utf-8'))
        if saved.get('archive_sha256')==sha:
            write_json(RAW/(r['id']+'.source.json'),saved)
            print(r['id'],saved['version'],'pinned snapshot',flush=True)
            continue
    with urlopen(Request('https://www.kaggle.com/api/v1/datasets/view/'+r['slug'],headers={'User-Agent':'RegressionLab/1.0'}),timeout=60) as f:
        meta=json.load(f)
    info={"id":r['id'],"kaggle_ref":meta['ref'],"version":meta['currentVersionNumber'],"last_updated":meta['lastUpdated'],"license":meta.get('licenseName'),"metadata_checked_at":datetime.now(timezone.utc).isoformat(),"archive_filename":r['id']+'.zip',"archive_sha256":sha,"note":"版本 metadata 與下載於本次工作期間核對；實際分析內容由 audit SHA256 唯一識別。"}
    write_json(OUT/r['id']/'source.json',info)
    write_json(RAW/(r['id']+'.source.json'),info)
    print(r['id'],info['version'],flush=True)
