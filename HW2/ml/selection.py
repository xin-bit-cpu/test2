"""在每個 fold 中快取獨立欄位前處理；不跨 fold 共用學到的統計。"""
import numpy as np
from joblib import Parallel, delayed
from sklearn.base import clone
from sklearn.metrics import root_mean_squared_error
from scipy import sparse

class FoldCache:
    def __init__(self, X, y, cv, make_pipeline):
        self.folds=[]
        self.numeric=set(X.select_dtypes(include='number').columns)
        for train,valid in cv.split(X,y):
            pre=make_pipeline(X).named_steps['pre']
            A=pre.fit_transform(X.iloc[train]);B=pre.transform(X.iloc[valid])
            groups={};offset=0
            for name,tr,cols in pre.transformers_:
                if name=='numeric':
                    for c in cols:groups[c]=[offset];offset+=1
                elif name=='categorical':
                    for c,categories in zip(cols,tr.named_steps['encode'].categories_):
                        groups[c]=list(range(offset,offset+len(categories)));offset+=len(categories)
            self.folds.append((A,B,y.iloc[train],y.iloc[valid],groups))

    def score(self, columns, estimator):
        # 與重新建立候選 Pipeline 相同的 numeric→categorical 順序。
        ordered=[c for c in columns if c in self.numeric]+[c for c in columns if c not in self.numeric]
        scores=[]
        for A,B,train_y,valid_y,groups in self.folds:
            indexes=[i for c in ordered for i in groups[c]]
            train_x,valid_x=A[:,indexes],B[:,indexes]
            # ColumnTransformer 對純數值或完全稠密 OHE 輸出 dense；保留相同解法。
            dense=all(c in self.numeric or len(groups[c])==1 for c in ordered)
            if dense and sparse.issparse(train_x):train_x,valid_x=train_x.toarray(),valid_x.toarray()
            model=clone(estimator).fit(train_x,train_y)
            scores.append(root_mean_squared_error(valid_y,model.predict(valid_x)))
        return float(np.mean(scores))

    def candidates(self, selected, remaining, estimator):
        return Parallel(n_jobs=4,prefer='threads')(delayed(self.score)(selected+[c],estimator) for c in remaining)
