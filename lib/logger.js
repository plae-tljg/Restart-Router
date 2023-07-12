import pino from 'pino';

const logger = pino({
    level: process.argv.includes('-v') ? 'debug' : 'info',
    transport: {
        target: "pino-pretty",
        options: {
            translateTime: "SYS:HH:MM:ss"
        }
    }
})

export default logger;