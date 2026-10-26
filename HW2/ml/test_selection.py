"""驗證 fold 快取與每個候選重建 Pipeline 的 CV 分數一致。"""
import unittest
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold,cross_val_score
from threadpoolctl import threadpool_limits
from data import audit
from registry import REGISTRY
from train import pipeline
from selection import FoldCache

class SelectionTest(unittest.TestCase):
    def test_cached_preprocessing_matches_fold_pipelines(self):
        r=next(r for r in REGISTRY if r['id']=='laptop')
        frame,_=audit(r);frame=frame.sample(200,random_state=42)
        X=frame.drop(columns=[r['target_column']]);y=frame[r['target_column']]
        # 補值與未知類別的處理必須仍由各 fold 自己決定。
        X.loc[X.index[:5],'Ram']=np.nan
        cv=KFold(5,shuffle=True,random_state=42)
        with threadpool_limits(limits=1):
            cache=FoldCache(X,y,cv,lambda f:pipeline(f,LinearRegression()))
            estimator=pipeline(X,LinearRegression()).named_steps['model']
            for cols in [['Ram'],['Company','Ram'],['Ram','Company'],['Cpu','Company','Weight']]:
                expected=-cross_val_score(pipeline(X[cols],LinearRegression()),X[cols],y,cv=cv,scoring='neg_root_mean_squared_error').mean()
                np.testing.assert_allclose(cache.score(cols,estimator),float(expected),rtol=1e-6,atol=1e-5)

if __name__=='__main__':unittest.main()
