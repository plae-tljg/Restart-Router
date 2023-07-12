import CryptoJs from 'crypto-js';

export const getNonce = (keysize) => {
    let nonce = CryptoJs.lib.WordArray.random(keysize)
    return nonce.toString();
}

export const obj2xml = (obj) => {
    if (Object.keys(obj).length !== 1)
        throw "Object must have only one root element";
    return `<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>${rec_obj2xml(obj)}`
}
const rec_obj2xml = (obj) => {
    return Object.keys(obj).reduce( ( prev, current ) => {
        let out = ( typeof obj[current] !== 'object' ) ? obj[current] : rec_obj2xml(obj[current]);
        return `${prev}<${current}>${out}</${current}>`
    }, "" )
}