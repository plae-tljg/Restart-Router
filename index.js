import { configDotenv } from "dotenv";
import { authentication_login, request_challenge, send_restart } from "./app.js";
import { xml2obj } from "./lib/Utils.js";

configDotenv()

const run = async () => {
    let { headers, data, firstnonce, cookies } = await request_challenge(process.env.ROUTER_USERNAME)
    let { response } = xml2obj(data)
    const { auth_cookies } = await authentication_login(response.salt, response.iterations, response.servernonce, firstnonce, headers.__requestverificationtoken, cookies, process.env.ROUTER_PASSWORD)
    await send_restart(auth_cookies)
}

run()