import numpy as np, json
cols=["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal","num"]
rows=[l.strip().split(",") for l in open("scripts/cleveland.data") if l.strip()]
raw=[[None if v=="?" else float(v) for v in r] for r in rows]
data={c:np.array([r[i] for r in raw],dtype=object) for i,c in enumerate(cols)}
def fill(c,mode=False):
    a=data[c]; vals=np.array([v for v in a if v is not None],float)
    f=np.bincount(vals.astype(int)).argmax() if mode else np.median(vals)
    data[c]=np.array([f if v is None else v for v in a],float)
for c in cols: fill(c, c in("ca","thal"))
y=(data["num"]>0).astype(float)
# features
feat={}; names=[]
for c in ["age","trestbps","chol","thalach","oldpeak","ca"]: feat[c]=data[c]
feat["sex_male"]=data["sex"]; feat["fbs_high"]=data["fbs"]; feat["exang"]=data["exang"]
for v,n in [(2,"cp_atypical"),(3,"cp_nonanginal"),(4,"cp_asymptomatic")]: feat[n]=(data["cp"]==v)*1.0
for v,n in [(1,"restecg_stt"),(2,"restecg_lvh")]: feat[n]=(data["restecg"]==v)*1.0
for v,n in [(2,"slope_flat"),(3,"slope_down")]: feat[n]=(data["slope"]==v)*1.0
for v,n in [(6,"thal_fixed"),(7,"thal_reversible")]: feat[n]=(data["thal"]==v)*1.0
names=list(feat); X=np.column_stack([feat[n] for n in names])
def fit(X,y,lam=0.5,iters=5000,lr=0.1):
    mu=X.mean(0); sd=X.std(0); sd[sd==0]=1; Z=(X-mu)/sd
    w=np.zeros(Z.shape[1]); b=0.0; n=len(y)
    for _ in range(iters):
        p=1/(1+np.exp(-(Z@w+b))); g=Z.T@(p-y)/n+lam*w/n; w-=lr*g; b-=lr*(p-y).mean()
    return mu,sd,w,b
def pred(m,X):
    mu,sd,w,b=m; return 1/(1+np.exp(-(((X-mu)/sd)@w+b)))
def auc(y,p):
    o=np.argsort(p); r=np.empty(len(p)); r[o]=np.arange(1,len(p)+1)
    npos=y.sum(); nneg=len(y)-npos; return (r[y==1].sum()-npos*(npos+1)/2)/(npos*nneg)
rng=np.random.default_rng(42); idx=rng.permutation(len(y)); folds=np.array_split(idx,5)
accs=[];aucs=[];sens=[];spec=[]
for k in range(5):
    te=folds[k]; tr=np.concatenate([folds[j] for j in range(5) if j!=k])
    m=fit(X[tr],y[tr]); p=pred(m,X[te]); yh=p>=0.5
    accs.append((yh==y[te]).mean()); aucs.append(auc(y[te],p))
    sens.append((yh&(y[te]==1)).sum()/(y[te]==1).sum()); spec.append((~yh&(y[te]==0)).sum()/(y[te]==0).sum())
m=fit(X,y); mu,sd,w,b=m
out={"dataset":"UCI Cleveland Heart Disease","samples":int(len(y)),"positives":int(y.sum()),
 "metrics":{"accuracy":round(float(np.mean(accs)),4),"auc":round(float(np.mean(aucs)),4),"sensitivity":round(float(np.mean(sens)),4),"specificity":round(float(np.mean(spec)),4),"folds":5},
 "intercept":round(float(b),6),
 "features":[{"name":n,"mean":round(float(mu[i]),6),"std":round(float(sd[i]),6),"weight":round(float(w[i]),6)} for i,n in enumerate(names)]}
json.dump(out,open("src/lib/heart-model.json","w"),indent=2)
print(json.dumps(out["metrics"]), out["intercept"])
for f in out["features"]: print(f["name"],f["weight"])
# sanity examples
print("row0 p",pred(m,X[:3]), y[:3])
