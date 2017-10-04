//@flow
export type Executor<T> ={
    promise: Promise<T>,
    resolve: (v:T) => void,
    reject: (e:any) => void
}

export default function executor (_r:any, _j:any):Executor<*> {
    return {
        promise: new Promise((r, j) => {
            _r = r;
            _j = j
        }),
        resolve: (v:any) => _r(v),
        reject: (e:any) => _j(e)
    }
}