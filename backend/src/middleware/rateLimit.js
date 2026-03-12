import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20000, // máximo de 20000 requests por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Muitas requisições. Tente novamente em alguns minutos."
    }
});
