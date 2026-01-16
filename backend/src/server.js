import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import adminUsersRouter from "./routes/adminUsers.js";
import adminBaseRouter from "./routes/adminBase.js";
import reportRoutes from "./routes/report.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "1mb" }));
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://sistema-de-gestao-b58.pages.dev'
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin) || String(process.env.CORS_ORIGIN) === '*') {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
        credentials: true
    })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminBaseRouter);
app.use("/api/admin/report", reportRoutes);
app.use("/api/admin/users", adminUsersRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Backend rodando na porta ${port}`));
