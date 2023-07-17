import axios from "axios";
import CryptoJs from 'crypto-js';
import { obj2xml } from "./lib/Utils.js";
import { parse } from 'node-html-parser';
import logger from "./lib/Logger.js";

const apiConnection = axios.create({
    baseURL: `http://192.168.8.1`,
    withCredentials: true
})

const CryptoConfig = CryptoJs.lib.Base.extend({
    keySize: 8,
    hasher: CryptoJs.algo.SHA256,
    hmac: CryptoJs.HmacSHA256
})

const getSaltedPassword = (password, salt, iterations) => CryptoJs.PBKDF2(password, salt, { keySize: CryptoConfig.keySize, iterations, hasher: CryptoConfig.hasher })

const getClientProof = (password, salt, iterations, authMessage) => {
    const spwd = getSaltedPassword(password, salt, iterations);
    const ckey = getClientKey(spwd);
    const skey = getStoredKey(ckey);
    const csig = getSignature(skey, authMessage);

    for (var i = 0; i < ckey.sigBytes/4; i += 1) {
        ckey.words[i] = ckey.words[i] ^ csig.words[i]
    }
    return ckey.toString();
}

const getClientKey = (saltedPassword) => {
    return CryptoConfig.hmac(saltedPassword, "Client Key")
}

// Needed for verification of the server
const getServerKey = (saltedPassword) => {
    return CryptoConfig.hmac(saltedPassword, "Server Key")
}

const getSignature = (storedKey, authMessage) => CryptoConfig.hmac(storedKey, authMessage);

const getStoredKey = (clientKey) => {
    const hasher = CryptoConfig.hasher.create();
    hasher.update(clientKey);
    return hasher.finalize();
}

const get_tokens = async (url, headers = null) => {
    try {
        const response = await apiConnection.get(url, {
            headers
        })
        
        const setCookies = response.headers["set-cookie"]

        const root = parse(response.data)
        const csrfMetaElements = root.querySelectorAll('meta[name="csrf_token"]');
        return {
            csrf_tokens: csrfMetaElements.map( el => el.getAttribute('content') ),
            cookies: setCookies.length > 0 ? setCookies.map(cookie => cookie.split(";")[0] + ";") : null
        }
    } catch (error) {
        logger.error(error)
    }
}

export const request_challenge = async (username) => {
    logger.info("Start Challenge Request")

    logger.info("Getting CSRF Tokens")
    const { csrf_tokens, cookies } = await get_tokens('/')
    logger.debug(csrf_tokens, "CSRF Tokens")
    logger.debug(cookies, "Cookies")

    const firstnonce = CryptoJs.lib.WordArray.random(32).toString()
    const data = obj2xml({
        request: {
            username,
            firstnonce,
            mode: 1 // For RSA
        }
    })
    const headers = {
        __RequestVerificationToken: csrf_tokens[0],
        Cookie: cookies.join(" ")
    }
    const request = {
        url: '/api/user/challenge_login',
        method: 'post',
        headers,
        data
    }

    logger.info("Requested Login Challenge")
    logger.debug(request, "Login Challenge Request - REQUEST")
    const response = await apiConnection.request(request)
    const output = { status: response.status, headers: response.headers, data: response.data, firstnonce, cookies };
    logger.debug(output, "Login Challenge - RESPONSE");
    logger.info("Got Login Challenge")
    return output;
}

export const authentication_login = async (salt, iterations, serverNonce, firstnonce, request_verification_token, cookies, password) => {
    const scram_salt = CryptoJs.enc.Hex.parse(salt)
    const authMsg = `${firstnonce},${serverNonce},${serverNonce}`;
    const clientproof = getClientProof(password, scram_salt, iterations, authMsg)

    const data = obj2xml({
        request: {
            clientproof,
            finalnonce: serverNonce
        }
    })
    const headers = {
        "__RequestVerificationToken": request_verification_token,
        Cookie: cookies.join(" ")
    }
    const request = {
        url: '/api/user/authentication_login',
        method: 'post',
        headers,
        data
    }

    logger.info("Send Server Challenge Request")
    logger.debug(request, "Request Server Challenge - REQUEST")
    const response = await apiConnection.request(request)

    const setCookies = response.headers["set-cookie"]

    const output = { 
        status: response.status,
        headers: response.headers,
        data: response.data,
        auth_cookies: setCookies.length > 0 ? setCookies.map(cookie => cookie.split(";")[0] + ";") : null
    };
    logger.debug(output, "Request Server Challenge - RESPONSE");
    logger.info("Got Server Challenge Response")
    return output;
}

export const send_restart = async (auth_cookies) => {
    logger.info("Start Restart Request")

    logger.info("Getting CSRF Tokens")
    const { csrf_tokens, cookies } = await get_tokens('/html/reboot.html', { 
        Cookie: auth_cookies.join(" ")
    })
    logger.debug(csrf_tokens, "CSRF Tokens")
    logger.debug(cookies, "Cookies")
    logger.info("Got Tokens")

    const data = obj2xml({
        request: {
            Control: 1
        }
    })
    const headers = {
        __RequestVerificationToken: csrf_tokens[0],
        Cookie: cookies.join(" ")
    }
    const request = {
        url: '/api/device/control',
        method: 'post',
        headers,
        data
    }

    logger.info("Send Restart Request")
    logger.debug(request, "Restart Request - REQUEST")
    const response = await apiConnection.request(request)
    const output = { status: response.status, headers: response.headers, data: response.data };
    logger.debug(output, "Restart - RESPONSE");
    logger.info("Got Restart Response")
}