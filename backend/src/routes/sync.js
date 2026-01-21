import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const normalizeKey = (key) => key?.toString().toLowerCase().trim().replace(/[-_]/g, '').replace(/\s/g, '') || '';

async function syncTable(sheet, tableName, onConflict) {
    const rows = [];
    const excelHeaders = {};

    const translations = {
        'idtarefa': 'ID_Tarefa',
        'idprojeto': 'ID_Projeto',
        'idcliente': 'ID_Cliente',
        'idcolaborador': 'ID_Colaborador',
        'idcolaborado': 'ID_Colaborador',
        'oqueprecisaserfeito': 'Afazer',    // Mapping based on user image -> DB "Afazer"
        'statustaref': 'StatusTarefa',      // Mapping based on user image -> DB "StatusTarefa"
        'contatoprincipal': 'contato_principal', // Fix for the 500 error
        'inicioprevist': 'inicio_previsto',
        'inicioreal': 'inicio_real',
        'entregaestim': 'entrega_estimada',
        'entregareal': 'entrega_real',
        'porcentagem': 'Porcentagem',
        'prioridade': 'Prioridade',
        'impacto': 'Impacto',
        'riscos': 'Riscos',
        'idhorastrabalhadas': 'ID_Horas_Trabalhadas',
        'idhorastrabalhada': 'ID_Horas_Trabalhadas',
        'horastrabalhadas': 'Horas_Trabalhadas',
        'horastrabalhada': 'Horas_Trabalhadas',
        'pais': 'Pais',
        'nomeprojeto': 'NomeProjeto',
        'nomecliente': 'NomeCliente',
        'email': 'email',
        'data': 'Data',
        'descricao': 'Descricao',
        'horainicio': 'Hora_Inicio',
        'horafim': 'Hora_Fim',
        'almocodeduzido': 'Almoco_Deduzido'
    };

    sheet.getRow(1).eachCell((cell, colNumber) => {
        const norm = normalizeKey(cell.value);
        excelHeaders[colNumber] = translations[norm] || cell.value?.toString().trim();
    });

    // 1. Coletar dados da planilha
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData = {};
        let hasData = false;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const dbField = excelHeaders[colNumber];
            if (!dbField || dbField === 'id_tarefa_novo') return;

            let val = cell.value;
            // Trata fórmulas do Excel
            if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
            // Trata Hiperlinks (extrai apenas o link/texto)
            if (val && typeof val === 'object' && val.text !== undefined) val = val.text;
            if (val && typeof val === 'object' && val.hyperlink !== undefined) val = val.hyperlink;

            if (dbField === 'Data') {
                if (val instanceof Date) {
                    const y = val.getUTCFullYear();
                    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
                    const d = String(val.getUTCDate()).padStart(2, '0');
                    val = `${y}-${m}-${d}`;
                } else if (typeof val === 'string' && val.includes('/')) {
                    const p = val.split('/');
                    if (p.length === 3) {
                        const d = p[0].padStart(2, '0');
                        const m = p[1].padStart(2, '0');
                        const y = p[2].length === 2 ? `20${p[2]}` : p[2];
                        val = `${y}-${m}-${d}`;
                    }
                }
            }

            rowData[dbField] = val;
            hasData = true;
        });

        // CRITICAL FIX: Se for horas_trabalhadas e não tiver ID, gera um UUID
        if (hasData && tableName === 'horas_trabalhadas' && !rowData['ID_Horas_Trabalhadas']) {
            rowData['ID_Horas_Trabalhadas'] = randomUUID();
        }

        // SAFETY: Remover colunas que não existem no banco para evitar erro
        if (hasData && tableName === 'horas_trabalhadas') {
            const ALLOWED = ['ID_Horas_Trabalhadas', 'Data', 'ID_Colaborador', 'ID_Cliente', 'ID_Projeto', 'ID_Tarefa', 'Horas_Trabalhadas', 'Hora_Inicio', 'Hora_Fim', 'Almoco_Deduzido', 'Descricao', 'id_tarefa_novo'];
            Object.keys(rowData).forEach(key => {
                if (!ALLOWED.includes(key)) {
                    delete rowData[key];
                }
            });
        }

        // SAFETY: Remover colunas extras para fato_tarefas
        if (hasData && tableName === 'fato_tarefas') {
            const ALLOWED = [
                'ID_Tarefa', 'ID_Cliente', 'ID_Projeto', 'Afazer', 'ID_Colaborador',
                'inicio_previsto', 'inicio_real', 'entrega_estimada', 'entrega_real',
                'Prioridade', 'Impacto', 'Riscos', 'Porcentagem', 'StatusTarefa', 'id_tarefa_novo'
            ];
            Object.keys(rowData).forEach(key => {
                if (!ALLOWED.includes(key)) {
                    delete rowData[key];
                }
            });
        }

        // SAFETY: dim_clientes
        if (hasData && tableName === 'dim_clientes') {
            const ALLOWED = ['ID_Cliente', 'NomeCliente', 'contato_principal', 'ativo', 'Contrato', 'Criado', 'NewLogo', 'Pais', 'Desativado'];
            Object.keys(rowData).forEach(key => {
                if (!ALLOWED.includes(key)) delete rowData[key];
            });
        }

        // SAFETY: dim_projetos
        if (hasData && tableName === 'dim_projetos') {
            const ALLOWED = ['ID_Projeto', 'ID_Cliente', 'NomeProjeto', 'StatusProjeto', 'budget', 'startDate', 'estimatedDelivery', 'manager', 'description', 'ativo', 'valor_total_rs'];
            Object.keys(rowData).forEach(key => {
                if (!ALLOWED.includes(key)) delete rowData[key];
            });
        }

        // SAFETY: dim_colaboradores
        if (hasData && tableName === 'dim_colaboradores') {
            const ALLOWED = ['ID_Colaborador', 'NomeColaborador', 'email', 'Cargo', 'papel', 'ativo', 'avatar_url', 'auth_user_id'];
            Object.keys(rowData).forEach(key => {
                if (!ALLOWED.includes(key)) delete rowData[key];
            });
        }

        if (hasData) rows.push(rowData);
    });

    if (rows.length === 0) return { count: 0 };

    // 2. VINCULO INTELIGENTE DE TAREFAS (Lookup de IDs Novos)
    if (tableName === 'horas_trabalhadas') {
        process.stdout.write(`[Sync] Vinculando IDs novos para ${rows.length} registros de horas...\n`);
        const { data: tasks } = await supabaseAdmin.from('fato_tarefas').select('ID_Tarefa, id_tarefa_novo');
        const taskMap = tasks?.reduce((acc, t) => {
            if (t.ID_Tarefa) acc[t.ID_Tarefa.toString().toLowerCase()] = t.id_tarefa_novo;
            return acc;
        }, {}) || {};

        rows.forEach(r => {
            const oldId = r.ID_Tarefa?.toString().toLowerCase();
            if (oldId && taskMap[oldId]) {
                r.id_tarefa_novo = taskMap[oldId];
            }
        });
    }

    // 3. Deduplicação e Upsert
    const uniqueRows = onConflict ? Array.from(new Map(rows.reverse().map(r => [r[onConflict], r])).values()).reverse() : rows;
    const { error } = await supabaseAdmin.from(tableName).upsert(uniqueRows, { onConflict });
    if (error) throw error;

    return { count: uniqueRows.length };
}

router.post("/excel", requireAdmin, upload.single("file"), async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const mapping = {
            "dim_clientes": "ID_Cliente",
            "dim_colaboradores": "email",
            "dim_projetos": "ID_Projeto",
            "fato_tarefas": "ID_Tarefa",
            "horas_trabalhadas": "ID_Horas_Trabalhadas"
        };
        const results = {};

        // ORDEM IMPORTANTE: Primeiro sincronizamos Tarefas, depois Horas (para o vínculo funcionar)
        const sheets = workbook.worksheets.sort((a, b) => {
            if (normalizeKey(a.name).includes('tarefa')) return -1;
            return 1;
        });

        for (const sheet of sheets) {
            const normName = normalizeKey(sheet.name);
            const tableKey = Object.keys(mapping).find(m => normalizeKey(m) === normName);
            if (tableKey) {
                const res = await syncTable(sheet, tableKey, mapping[tableKey]);
                results[tableKey] = res.count;
            }
        }
        res.json({ message: "Sincronização concluída", details: results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
