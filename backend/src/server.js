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
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', process.env.CORS_ORIGIN];
            if (allowedOrigins.indexOf(origin) === -1 && String(process.env.CORS_ORIGIN) !== '*') {
                // Se não estiver na lista, mas for desenvolvimento, vamos permitir para facilitar
                // Mas o ideal é adicionar o 5173 na lista acima
                return callback(null, true);
            }
            return callback(null, true);
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api", adminUsersRouter);
app.use("/api/admin", adminBaseRouter);
app.use("/api/admin/report", reportRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Backend rodando na porta ${port}`));
