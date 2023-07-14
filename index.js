import { request_challenge } from "./app.js";
import logger from "./lib/Logger.js";
import { xml2obj } from "./lib/Utils.js";

const { headers, status, data } = await request_challenge("user")
const out = xml2obj(data)
logger.info(out)