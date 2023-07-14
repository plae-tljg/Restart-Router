import axios from "axios";
import { getNonce, obj2xml } from "./lib/Utils.js";
import { parse } from 'node-html-parser';
import logger from "./lib/Logger.js";

const apiConnection = axios.create({
    baseURL: `http://192.168.8.1`,
    withCredentials: true
})

export const request_challenge = async (username) => {
    logger.info("Start Challenge Request")

    logger.info("Getting CSRF Tokens")
    const { csrf_tokens, cookies } = await get_tokens('/')
    logger.debug(csrf_tokens, "CSRF Tokens")
    logger.debug(cookies, "Cookies")

    const firstnonce = getNonce(32)
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

    logger.debug(request, "Login Challenge Request - REQUEST")
    const response = await apiConnection.request(request)
    const output = { status: response.status, headers: response.headers, data: response.data };
    logger.debug(output, "Login Challenge - RESPONSE");
    return output;
}

export const get_tokens = async (url) => {
    try {
        const response = await apiConnection.get(url)
        
        const setCookies = response.headers["set-cookie"]

        const root = parse(response.data)
        const csrfMetaElements = root.querySelectorAll('meta[name="csrf_token"]');
        return {
            csrf_tokens: csrfMetaElements.map( el => el.getAttribute('content') ),
            cookies: setCookies.length > 0 ? setCookies.map(cookie => cookie.split(";")[0] + ";") : null
        }
    } catch (error) {
        console.error(error)
    }
}