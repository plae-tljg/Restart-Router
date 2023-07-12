import { getNonce, obj2xml } from "./lib/Scram.js";

var username = "user";

var firstnonce = getNonce(32);
var body = obj2xml({
    request: {
        username,
        firstnonce,
        mode: 1 // For RSA
    }
})
console.log(body);
