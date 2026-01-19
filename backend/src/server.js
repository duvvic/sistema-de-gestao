import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import adminUsersRouter from "./routes/adminUsers.js";
import adminBaseRouter from "./routes/adminBase.js";
import reportRoutes from "./routes/report.js";
import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notes.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "1mb" }));
// Logger simples para diagnosticar se as requisições estão chegando
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors()); // Aceita tudo por padrão para testes de produção

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminBaseRouter);
app.use("/api/admin/report", reportRoutes);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/notes", notesRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Backend rodando na porta ${port}`));
