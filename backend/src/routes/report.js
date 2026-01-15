import express from 'express';
import ExcelJS from 'exceljs';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

function parseCsvIntArray(v) {
    if (!v) return null;
    if (Array.isArray(v)) v = v.join(',');
    const arr = String(v)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(n => Number(n))
        .filter(n => Number.isFinite(n));
    return arr.length ? arr : null;
}

function parseCsvStringArray(v) {
    if (!v) return null;
    if (Array.isArray(v)) v = v.join(',');
    const arr = String(v)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    return arr.length ? arr : null;
}

function dateOrDefault(v, fallbackIso) {
    const s = (v || '').toString().slice(0, 10);
    // espera YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return fallbackIso;
}

async function fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds, statuses }) {
    console.log('Calling RPC relatorio_horas_custos with:', {
        p_data_ini: startDate,
        p_data_fim: endDate,
        p_clientes: clientIds,
        p_projetos: projectIds,
        p_colaboradores: collaboratorIds,
        p_status: statuses
    });

    const { data, error } = await supabaseAdmin.rpc('relatorio_horas_custos', {
        p_data_ini: startDate,
        p_data_fim: endDate,
        p_clientes: clientIds,
        p_projetos: projectIds,
        p_colaboradores: collaboratorIds,
        p_status: statuses
    });

    if (error) {
        console.error('RPC Error:', error);
        throw error;
    }

    // Debug: mostrar estrutura de dados
    if (data && data.length > 0) {
        console.log('Sample row from RPC:', JSON.stringify(data[0], null, 2));
    }

    return data || [];
}

/**
 * Agrupa os dados por projeto para o painel de custos
 */
function calculateProjectTotals(rows) {
    const map = new Map();
    rows.forEach(r => {
        const id = r.id_projeto;
        if (!id) return;
        if (!map.has(id)) {
            map.set(id, {
                id_projeto: id,
                projeto: r.nome_projeto || r.projeto,
                cliente: r.nome_cliente || r.cliente,
                id_cliente: r.id_cliente,
                horas_projeto_total: r.horas_projeto_total || 0,
                valor_projeto: r.valor_projeto || 0,
                valor_hora_projeto: r.valor_hora_projeto || 0,
                valor_rateado_total: 0
            });
        }
        const pt = map.get(id);
        pt.valor_rateado_total += (r.valor_rateado || 0);
    });
    return Array.from(map.values());
}

/**
 * Calcula totais gerais do relatório
 */
function calculateTotals(rows) {
    let horas_total = 0;
    let valor_total_rateado = 0;
    rows.forEach(r => {
        horas_total += (r.horas || 0);
        valor_total_rateado += (r.valor_rateado || 0);
    });
    return {
        horas_total,
        valor_total_rateado
    };
}

// PREVIEW JSON (para “preview estilo Excel” no front)
router.get('/preview', requireAdmin, async (req, res) => {
    try {
        const today = new Date();
        const endIso = today.toISOString().slice(0, 10);
        const start30 = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);

        // Se não vier data no query, passamos null para o RPC (que interpreta como "sem limite")
        const startDate = req.query.startDate ? dateOrDefault(req.query.startDate, null) : null;
        const endDate = req.query.endDate ? dateOrDefault(req.query.endDate, null) : null;

        const clientIds = parseCsvIntArray(req.query.clientIds);
        const projectIds = parseCsvIntArray(req.query.projectIds);
        const collaboratorIds = parseCsvIntArray(req.query.collaboratorIds);
        const statuses = parseCsvStringArray(req.query.statuses);

        const rows = await fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds, statuses });

        const projectTotals = calculateProjectTotals(rows);
        const totals = calculateTotals(rows);

        res.json({
            generatedAt: new Date().toISOString(),
            filters: { startDate, endDate, clientIds, projectIds, collaboratorIds },
            count: rows.length,
            rows,
            projectTotals,
            totals
        });
    } catch (e) {
        console.error('[report/preview] error:', e);
        res.status(500).json({ error: e.message || 'Failed to generate preview' });
    }
});

// EXPORT POWER BI (por enquanto retorna o mesmo JSON “flat”)
router.get('/powerbi', requireAdmin, async (req, res) => {
    try {
        const today = new Date();
        const endIso = today.toISOString().slice(0, 10);
        const start30 = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);

        const startDate = req.query.startDate ? dateOrDefault(req.query.startDate, null) : null;
        const endDate = req.query.endDate ? dateOrDefault(req.query.endDate, null) : null;

        const clientIds = parseCsvIntArray(req.query.clientIds);
        const projectIds = parseCsvIntArray(req.query.projectIds);
        const collaboratorIds = parseCsvIntArray(req.query.collaboratorIds);
        const statuses = parseCsvStringArray(req.query.statuses);

        const rows = await fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds, statuses });

        res.json({
            dataset: 'relatorio_horas_custos',
            generatedAt: new Date().toISOString(),
            filters: { startDate, endDate, clientIds, projectIds, collaboratorIds },
            rows
        });
    } catch (e) {
        console.error('[report/powerbi] error:', e);
        res.status(500).json({ error: e.message || 'Failed to export powerbi json' });
    }
});

// EXPORT EXCEL (xlsx) - Estrutura para Power BI e Humano
router.get('/excel', requireAdmin, async (req, res) => {
    try {
        const startDate = req.query.startDate ? dateOrDefault(req.query.startDate, null) : null;
        const endDate = req.query.endDate ? dateOrDefault(req.query.endDate, null) : null;

        const clientIds = parseCsvIntArray(req.query.clientIds);
        const projectIds = parseCsvIntArray(req.query.projectIds);
        const collaboratorIds = parseCsvIntArray(req.query.collaboratorIds);
        const statuses = parseCsvStringArray(req.query.statuses);

        const rows = await fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds, statuses });

        // Ordenar por data decrescente
        const sortedRows = [...rows].sort((a, b) => {
            const dateA = a.data_registro || a.data || '';
            const dateB = b.data_registro || b.data || '';
            return dateB.localeCompare(dateA);
        });

        const wb = new ExcelJS.Workbook();

        // ========================================
        // 1. ABA DE DADOS (Limpa para Power BI)
        // ========================================
        const wsDados = wb.addWorksheet('Dados');

        const styles = {
            header: {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } },
                font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 },
                alignment: { vertical: 'middle', horizontal: 'center' },
                border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
            },
            summaryHeader: {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
                font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
            },
            projectHeader: {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }, // Emerald 600
                font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
            },
            zebraGray: {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } // Slate 100
            },
            zebraWhite: {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
            },
            border: {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, // Slate 300
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            }
        };

        const formats = {
            hours: '[h]:mm',
            date: 'DD/MM/YYYY'
        };

        wsDados.columns = [
            { header: 'DATA', key: 'data', width: 15 },
            { header: 'COLABORADOR', key: 'colaborador', width: 25 },
            { header: 'TAREFA', key: 'tarefa', width: 45 },
            { header: 'HORAS', key: 'horas', width: 12 },
            { header: 'PROJETOS', key: 'projeto', width: 30 }
        ];

        wsDados.getRow(1).eachCell(cell => {
            cell.fill = styles.header.fill;
            cell.font = styles.header.font;
            cell.alignment = styles.header.alignment;
            cell.border = styles.header.border;
        });

        // Mapas para a aba de resumo
        const collabMap = new Map();
        const taskMap = new Map();
        const clientProjectHierarchy = new Map(); // Client -> { total: 0, projects: Map<Project, Hours> }
        let totalHoursGlobal = 0;

        sortedRows.forEach(r => {
            const h = r.horas || 0;
            const projName = r.nome_projeto || r.projeto;
            const cliName = r.nome_cliente || r.cliente;
            const collName = r.colaborador;

            totalHoursGlobal += h;

            // Agregações Simples
            if (!collabMap.has(collName)) collabMap.set(collName, 0);
            collabMap.set(collName, collabMap.get(collName) + h);

            const taskName = r.tarefa || '-';
            if (!taskMap.has(taskName)) taskMap.set(taskName, 0);
            taskMap.set(taskName, taskMap.get(taskName) + h);

            // Hierarquia Cliente -> Projeto
            if (!clientProjectHierarchy.has(cliName)) {
                clientProjectHierarchy.set(cliName, { total: 0, projects: new Map() });
            }
            const cliData = clientProjectHierarchy.get(cliName);
            cliData.total += h;
            if (!cliData.projects.has(projName)) cliData.projects.set(projName, 0);
            cliData.projects.set(projName, cliData.projects.get(projName) + h);

            const row = wsDados.addRow({
                data: r.data_registro ? new Date(r.data_registro + 'T12:00:00') : null,
                colaborador: collName,
                tarefa: taskName,
                horas: h / 24,
                projeto: projName
            });

            row.getCell('data').numFmt = formats.date;
            row.getCell('horas').numFmt = formats.hours;
            row.eachCell(cell => cell.border = styles.border);
        });

        wsDados.views = [{ state: 'frozen', ySplit: 1 }];

        // ========================================
        // 2. ABA DE RESUMOS (Para Humanos)
        // ========================================
        const wsResumo = wb.addWorksheet('Resumos');
        wsResumo.columns = [
            { header: 'DESCRIÇÃO', key: 'desc', width: 40 },
            { header: 'TOTAL HORAS / VALOR FILTRO', key: 'horas', width: 60 }
        ];

        // --- SEÇÃO DE FILTROS NO TOPO ---
        const getFilterNames = (ids, fieldName, allLabel) => {
            if (!ids || ids.length === 0) return allLabel;
            const names = [...new Set(rows.map(r => r[fieldName]))].filter(Boolean);
            return names.length > 0 ? names.join(', ') : allLabel;
        };

        const f_period = (startDate && endDate) ? `${startDate} até ${endDate}` : "Todo o Período";
        const f_clients = getFilterNames(clientIds, 'cliente', 'Todos os Clientes');
        const f_projects = getFilterNames(projectIds, 'projeto', 'Todos os Projetos');
        const f_collabs = getFilterNames(collaboratorIds, 'colaborador', 'Todos os Colaboradores');

        const filterTitle = wsResumo.addRow({ desc: 'FILTROS APLICADOS NESTE RELATÓRIO' });
        filterTitle.eachCell(cell => {
            cell.fill = styles.header.fill;
            cell.font = styles.header.font;
        });

        const addFilterRow = (label, value) => {
            const r = wsResumo.addRow({ desc: label, horas: value });
            r.getCell('desc').font = { bold: true };
            r.eachCell(cell => cell.border = styles.border);
        };

        addFilterRow('Período de Análise:', f_period);
        addFilterRow('Clientes:', f_clients);
        addFilterRow('Projetos:', f_projects);
        addFilterRow('Colaboradores:', f_collabs);
        wsResumo.addRow({}); // Espaçador
        wsResumo.addRow({}); // Outro espaçador

        const addResumoSection = (ws, title, map, headerStyle) => {
            const header = ws.addRow({ desc: title.toUpperCase() });
            header.eachCell(cell => {
                cell.fill = headerStyle.fill;
                cell.font = headerStyle.font;
            });

            const sortedEntries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
            sortedEntries.forEach(([name, h], idx) => {
                const r = ws.addRow({ desc: name, horas: h / 24 });
                r.getCell('horas').numFmt = formats.hours;
                r.eachCell(cell => {
                    cell.border = styles.border;
                    cell.fill = idx % 2 === 0 ? styles.zebraWhite.fill : styles.zebraGray.fill;
                });
            });
            ws.addRow({}); // Espaçador
        };

        // --- SEÇÃO HIERÁRQUICA: CLIENTES E SEUS PROJETOS ---
        const sortedClients = Array.from(clientProjectHierarchy.entries()).sort((a, b) => b[1].total - a[1].total);

        sortedClients.forEach(([clientName, data]) => {
            // Header: RESUMO POR CLIENTE (Tarja Indigo)
            const clientHeaderTitle = wsResumo.addRow({ desc: 'RESUMO POR CLIENTE' });
            clientHeaderTitle.eachCell(cell => {
                cell.fill = styles.summaryHeader.fill;
                cell.font = styles.summaryHeader.font;
            });

            // Linha do Cliente: Nome e Total
            const clientDataRow = wsResumo.addRow({ desc: clientName, horas: data.total / 24 });
            clientDataRow.getCell('desc').font = { bold: true };
            clientDataRow.getCell('horas').numFmt = formats.hours;
            clientDataRow.eachCell(cell => {
                cell.border = styles.border;
                cell.fill = styles.zebraWhite.fill;
            });

            wsResumo.addRow({});

            // Header: RESUMO POR PROJETO (Tarja Emerald)
            const projectHeaderTitle = wsResumo.addRow({ desc: 'RESUMO POR PROJETO' });
            projectHeaderTitle.eachCell(cell => {
                cell.fill = styles.projectHeader.fill;
                cell.font = styles.projectHeader.font;
            });

            // Lista de Projetos do Cliente com Zebra
            const sortedProjects = Array.from(data.projects.entries()).sort((a, b) => b[1] - a[1]);
            sortedProjects.forEach(([projName, h], idx) => {
                const r = wsResumo.addRow({ desc: projName, horas: h / 24 });
                r.getCell('horas').numFmt = formats.hours;
                r.eachCell(cell => {
                    cell.border = styles.border;
                    cell.fill = idx % 2 === 0 ? styles.zebraWhite.fill : styles.zebraGray.fill;
                });
            });

            wsResumo.addRow({}); // Espaçador
        });

        addResumoSection(wsResumo, 'Resumo por Colaborador', collabMap, styles.summaryHeader);
        addResumoSection(wsResumo, 'Resumo por Tarefa', taskMap, styles.summaryHeader);

        const totalRow = wsResumo.addRow({ desc: 'TOTAL GERAL DE HORAS', horas: totalHoursGlobal / 24 });
        totalRow.eachCell(cell => {
            cell.fill = styles.header.fill;
            cell.font = styles.header.font;
            cell.numFmt = formats.hours;
        });

        const fileName = `Relatorio_BI_${new Date().getTime()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await wb.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('[report/excel] error:', e);
        res.status(500).json({ error: e.message || 'Failed to export Excel for BI' });
    }
});

// UPDATE BUDGETS (persistente no dim_projetos)
router.put('/project-budgets', requireAdmin, express.json(), async (req, res) => {
    try {
        const body = req.body || {};
        const items = Array.isArray(body.budgets) ? body.budgets : [];
        if (!items.length) return res.status(400).json({ error: 'Missing budgets[]' });

        // atualiza um a um (simples e seguro)
        const results = [];
        for (const it of items) {
            const id = Number(it.id_projeto);
            const budget = it.budget === null || it.budget === undefined ? null : Number(it.budget);
            if (!Number.isFinite(id)) continue;

            const { data, error } = await supabaseAdmin
                .from('dim_projetos')
                .update({ budget })
                .eq('ID_Projeto', id)
                .select('ID_Projeto, NomeProjeto, budget')
                .maybeSingle();

            if (error) throw error;
            results.push(data);
        }

        res.json({ updated: results.length, results });
    } catch (e) {
        console.error('[report/project-budgets] error:', e);
        res.status(500).json({ error: e.message || 'Failed to update budgets' });
    }
});

export default router;
