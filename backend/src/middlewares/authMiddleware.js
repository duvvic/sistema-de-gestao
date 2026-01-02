const { createAuthClient, supabase } = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
        // Validate token by getting user info
        const authClient = createAuthClient(token);
        const { data: { user }, error } = await authClient.auth.getUser();

        if (error || !user) {
            console.error('Auth Error:', error);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user and scoped client to request
        req.user = user;
        req.supabase = authClient;

        next();
    } catch (err) {
        console.error('Middleware Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = authMiddleware;
