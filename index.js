import { request_challenge } from "./app.js";
import logger from "./lib/Logger.js";
import { xml2obj } from "./lib/Utils.js";

// const { headers, status, data } = await request_challenge("user")
// console.log(data)
let xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<response>\r\n<salt>64494c4d4a424d4953623078306835376f7651534936396d5067593235585700</salt>\r\n<iterations>100</iterations>\r\n<servernonce>ec84a45be6feb41c4f6c8985f9279d7af74663f6dae4b929959c1cd5c8dd2a97SbQ4KEiV33KFif019dXRiQwbNJEtIgoS</servernonce>\r\n<modeselected>1</modeselected>\r\n</response>\r\n`
const out = xml2obj(xml)
logger.info(out)