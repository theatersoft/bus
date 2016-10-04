export default function executor (_r, _j) {
    return {
        promise: new Promise((r, j) => {_r = r; _j = j}),
        resolve: v => _r(v),
        reject: e => _j(e)
    }
}