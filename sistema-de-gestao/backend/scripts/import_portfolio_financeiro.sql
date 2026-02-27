-- Script para importar dados financeiros do Portfólio de Projetos
-- Baseado na segunda planilha fornecida

-- ====================================
-- ATUALIZAÇÃO DE DADOS FINANCEIROS
-- ====================================

-- 1. Projeto OBYC - Fase 2 (HIDROVIAS + SPREAD)
UPDATE dim_projetos 
SET 
    valor_total_rs = 20000.00,
    StatusProjeto = 'Concluído',
    startDate = '2025-12-10',
    start_date_real = '2025-12-10',
    estimatedDelivery = '2025-12-30',
    end_date_real = '2025-12-30',
    partner_id = (SELECT ID_Cliente FROM dim_clientes WHERE NomeCliente = 'SPREAD' LIMIT 1)
WHERE NomeProjeto LIKE '%OBYC%Fase 2%' 
   OR NomeProjeto LIKE '%OBYC - Fase 2%';

-- 2. Carga de Contratos ME (HIDROVIAS + SPREAD)
UPDATE dim_projetos 
SET 
    valor_total_rs = 40000.00,
    StatusProjeto = 'Concluído',
    startDate = '2025-11-26',
    start_date_real = '2025-11-28',
    estimatedDelivery = '2025-12-02',
    end_date_real = '2025-12-02',
    partner_id = (SELECT ID_Cliente FROM dim_clientes WHERE NomeCliente = 'SPREAD' LIMIT 1)
WHERE NomeProjeto LIKE '%Carga de Contratos ME%' 
   OR NomeProjeto LIKE '%Carga%Contratos%';

-- 3. Maestro (PIRACANJUBA + TACHYONIX)
UPDATE dim_projetos 
SET 
    valor_total_rs = 60000.00,
    StatusProjeto = 'Em Teste',
    startDate = '2025-11-09',
    start_date_real = '2025-11-09',
    estimatedDelivery = '2026-03-10',
    partner_id = (SELECT ID_Cliente FROM dim_clientes WHERE NomeCliente = 'TACHYONIX' LIMIT 1)
WHERE NomeProjeto LIKE '%Maestro%';

-- 4. Conexão HTTP (FIOTEC + TACHYONIX)
UPDATE dim_projetos 
SET 
    valor_total_rs = 110000.00,
    StatusProjeto = 'Trabalhando',
    startDate = '2026-01-02',
    start_date_real = '2026-01-02',
    estimatedDelivery = '2026-01-29',
    partner_id = (SELECT ID_Cliente FROM dim_clientes WHERE NomeCliente = 'TACHYONIX' LIMIT 1)
WHERE NomeProjeto LIKE '%Conexão HTTP%' 
   OR NomeProjeto LIKE '%Conexao HTTP%';

-- 5. Layout CAT (LATAM + INTELIGENZA)
UPDATE dim_projetos 
SET 
    valor_total_rs = 78000.00,
    StatusProjeto = 'Em Andamento',
    startDate = '2026-01-20',
    start_date_real = '2026-01-21',
    estimatedDelivery = '2026-02-05',
    partner_id = (SELECT ID_Cliente FROM dim_clientes WHERE NomeCliente = 'INTELIGENZA' LIMIT 1)
WHERE NomeProjeto LIKE '%Layout CAT%';

-- ====================================
-- QUERY DE VERIFICAÇÃO
-- ====================================
-- Esta query replica o formato da planilha "PORTFÓLIO DE PROJETOS"

SELECT 
    -- Parceiro
    p_parceiro.NomeCliente as Parceiro,
    
    -- Cliente Final
    c.NomeCliente as "Cliente Final",
    
    -- Projeto
    p.NomeProjeto as Projeto,
    
    -- Status
    p.StatusProjeto as Status,
    
    -- Datas
    p.startDate as "Inicio Previsto",
    p.start_date_real as "Inicio Real",
    p.estimatedDelivery as "Fim Previsto",
    p.end_date_real as "Fim Real",
    
    -- Avanço % (calculado via tarefas)
    COALESCE(
        (SELECT ROUND(AVG(Porcentagem), 0)
         FROM fato_tarefas t
         WHERE t.ID_Projeto = p.ID_Projeto
        ), 0
    ) as "Avanço % (Hoje)",
    
    -- Vendido
    COALESCE(p.valor_total_rs, 0) as "Vendido",
    
    -- Custo (Hoje) - calculado via timesheets
    COALESCE(
        (SELECT SUM(h.horas * COALESCE(col.custo_hora, 150))
         FROM horas_trabalhadas h
         LEFT JOIN dim_colaboradores col ON h.ID_Colaborador = col.ID_Colaborador
         WHERE h.ID_Projeto = p.ID_Projeto
        ), 0
    ) as "Custo (Hoje)",
    
    -- Custo para Terminar (estimativa baseada em horas restantes)
    COALESCE(
        (SELECT SUM(
            (t.estimated_hours * (1 - COALESCE(t.Porcentagem, 0)/100)) * 150
         )
         FROM fato_tarefas t
         WHERE t.ID_Projeto = p.ID_Projeto
           AND t.StatusTarefa != 'Done'
        ), 0
    ) as "Custo par Terminar",
    
    -- Resultado
    COALESCE(p.valor_total_rs, 0) - (
        COALESCE(
            (SELECT SUM(h.horas * COALESCE(col.custo_hora, 150))
             FROM horas_trabalhadas h
             LEFT JOIN dim_colaboradores col ON h.ID_Colaborador = col.ID_Colaborador
             WHERE h.ID_Projeto = p.ID_Projeto
            ), 0
        ) +
        COALESCE(
            (SELECT SUM(
                (t.estimated_hours * (1 - COALESCE(t.Porcentagem, 0)/100)) * 150
             )
             FROM fato_tarefas t
             WHERE t.ID_Projeto = p.ID_Projeto
               AND t.StatusTarefa != 'Done'
            ), 0
        )
    ) as "Resultado",
    
    -- % Margem
    CASE 
        WHEN COALESCE(p.valor_total_rs, 0) > 0 THEN
            ROUND(
                ((COALESCE(p.valor_total_rs, 0) - (
                    COALESCE(
                        (SELECT SUM(h.horas * COALESCE(col.custo_hora, 150))
                         FROM horas_trabalhadas h
                         LEFT JOIN dim_colaboradores col ON h.ID_Colaborador = col.ID_Colaborador
                         WHERE h.ID_Projeto = p.ID_Projeto
                        ), 0
                    ) +
                    COALESCE(
                        (SELECT SUM(
                            (t.estimated_hours * (1 - COALESCE(t.Porcentagem, 0)/100)) * 150
                         )
                         FROM fato_tarefas t
                         WHERE t.ID_Projeto = p.ID_Projeto
                           AND t.StatusTarefa != 'Done'
                        ), 0
                    )
                )) / COALESCE(p.valor_total_rs, 1)) * 100
            , 2)
        ELSE 0
    END as "%"
    
FROM dim_projetos p
JOIN dim_clientes c ON p.ID_Cliente = c.ID_Cliente
LEFT JOIN dim_clientes p_parceiro ON p.partner_id = p_parceiro.ID_Cliente
WHERE p.ativo = true
  AND p.NomeProjeto IN (
      'Projeto OBYC - Fase 2',
      'Carga de Contratos ME',
      'Maestro',
      'Conexão HTTP',
      'Layout CAT'
  )
ORDER BY p.NomeProjeto;

-- ====================================
-- TOTAIS DO PORTFÓLIO
-- ====================================
SELECT 
    'TOTAL' as Projeto,
    SUM(COALESCE(p.valor_total_rs, 0)) as "Vendido Total",
    SUM(
        COALESCE(
            (SELECT SUM(h.horas * COALESCE(col.custo_hora, 150))
             FROM horas_trabalhadas h
             LEFT JOIN dim_colaboradores col ON h.ID_Colaborador = col.ID_Colaborador
             WHERE h.ID_Projeto = p.ID_Projeto
            ), 0
        )
    ) as "Custo Total Atual",
    SUM(
        COALESCE(
            (SELECT SUM(
                (t.estimated_hours * (1 - COALESCE(t.Porcentagem, 0)/100)) * 150
             )
             FROM fato_tarefas t
             WHERE t.ID_Projeto = p.ID_Projeto
               AND t.StatusTarefa != 'Done'
            ), 0
        )
    ) as "Custo para Terminar",
    SUM(COALESCE(p.valor_total_rs, 0)) - SUM(
        COALESCE(
            (SELECT SUM(h.horas * COALESCE(col.custo_hora, 150))
             FROM horas_trabalhadas h
             LEFT JOIN dim_colaboradores col ON h.ID_Colaborador = col.ID_Colaborador
             WHERE h.ID_Projeto = p.ID_Projeto
            ), 0
        ) +
        COALESCE(
            (SELECT SUM(
                (t.estimated_hours * (1 - COALESCE(t.Porcentagem, 0)/100)) * 150
             )
             FROM fato_tarefas t
             WHERE t.ID_Projeto = p.ID_Projeto
               AND t.StatusTarefa != 'Done'
            ), 0
        )
    ) as "Resultado Total",
    ROUND(
        (SUM(COALESCE(p.valor_total_rs, 0)) - SUM(
            COALESCE(
                (SELECT SUM(h.horas * COALESCE(col.custo_hora, 150))
                 FROM horas_trabalhadas h
                 LEFT JOIN dim_colaboradores col ON h.ID_Colaborador = col.ID_Colaborador
                 WHERE h.ID_Projeto = p.ID_Projeto
                ), 0
            ) +
            COALESCE(
                (SELECT SUM(
                    (t.estimated_hours * (1 - COALESCE(t.Porcentagem, 0)/100)) * 150
                 )
                 FROM fato_tarefas t
                 WHERE t.ID_Projeto = p.ID_Projeto
                   AND t.StatusTarefa != 'Done'
                ), 0
            )
        )) / NULLIF(SUM(COALESCE(p.valor_total_rs, 0)), 0) * 100
    , 2) as "% Margem"
FROM dim_projetos p
WHERE p.ativo = true
  AND p.NomeProjeto IN (
      'Projeto OBYC - Fase 2',
      'Carga de Contratos ME',
      'Maestro',
      'Conexão HTTP',
      'Layout CAT'
  );
