import { sendError } from "../utils/responseHelper.js";

/**
 * Middleware para validar o corpo da requisição usando Zod
 * @param {import('zod').ZodSchema} schema 
 */
export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        if (err instanceof Error && err.name === 'ZodError') {
            // Ensure Zod error details are exposed in the return message
            const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return sendError(res, errorMessage, 400);
        }
        return sendError(res, err.message || 'Dados inválidos', 400);
    }
};
