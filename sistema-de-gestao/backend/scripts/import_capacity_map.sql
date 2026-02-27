-- Script para importar dados do Mapa de Capacidade
-- Baseado na planilha fornecida pelo usuário

-- Dados da planilha:
-- COLABORADOR | PARCEIRO | CLIENTE FINAL | PROJETO | STATUS | INICIO PREVISTO | FIM PREVISTO | HORAS ALOCADAS | HORAS APONTADAS | SALDO

-- Exemplo de como atualizar as horas alocadas nas tarefas existentes
-- Você precisará ajustar os IDs conforme seu banco de dados

-- JOÃO - Projeto OBYC - Fase 2 (HIDROVIAS + SPREAD)
UPDATE fato_tarefas 
SET allocated_hours = 220
WHERE ID_Projeto = (SELECT ID_Projeto FROM dim_projetos WHERE NomeProjeto LIKE '%OBYC%Fase 2%')
  AND ID_Colaborador = (SELECT ID_Colaborador FROM dim_colaboradores WHERE NomeColaborador = 'JOÃO');

-- PEDRO - Carga de Contratos ME (HIDROVIAS + SPREAD)
UPDATE fato_tarefas 
SET allocated_hours = 195
WHERE ID_Projeto = (SELECT ID_Projeto FROM dim_projetos WHERE NomeProjeto LIKE '%Carga de Contratos ME%')
  AND ID_Colaborador = (SELECT ID_Colaborador FROM dim_colaboradores WHERE NomeColaborador = 'PEDRO');

-- MARIA - Maestro (DIAGBRASIL + LAZAPONIX)
UPDATE fato_tarefas 
SET allocated_hours = 140
WHERE ID_Projeto = (SELECT ID_Projeto FROM dim_projetos WHERE NomeProjeto LIKE '%Maestro%')
  AND ID_Colaborador = (SELECT ID_Colaborador FROM dim_colaboradores WHERE NomeColaborador = 'MARIA');

-- JOÃO - Conexão HTTP (FIOTEC + TACHYONIX)
UPDATE fato_tarefas 
SET allocated_hours = 360
WHERE ID_Projeto = (SELECT ID_Projeto FROM dim_projetos WHERE NomeProjeto LIKE '%Conexão HTTP%' OR NomeProjeto LIKE '%Conexao HTTP%')
  AND ID_Colaborador = (SELECT ID_Colaborador FROM dim_colaboradores WHERE NomeColaborador = 'JOÃO');

-- PEDRO - Layout CAT (LATAM + INTELIGENZA)
UPDATE fato_tarefas 
SET allocated_hours = 125
WHERE ID_Projeto = (SELECT ID_Projeto FROM dim_projetos WHERE NomeProjeto LIKE '%Layout CAT%')
  AND ID_Colaborador = (SELECT ID_Colaborador FROM dim_colaboradores WHERE NomeColaborador = 'PEDRO');

-- Verificar os dados importados
SELECT 
    c.NomeColaborador as Colaborador,
    cl.NomeCliente as Cliente,
    p.NomeProjeto as Projeto,
    p.StatusProjeto as Status,
    p.startDate as InicioPrevis to,
    p.estimatedDelivery as FimPrevisto,
    SUM(t.allocated_hours) as HorasAlocadas,
    COALESCE(
        (SELECT SUM(h.horas) 
         FROM horas_trabalhadas h 
         WHERE h.ID_Projeto = p.ID_Projeto 
           AND h.ID_Colaborador = c.ID_Colaborador
        ), 0
    ) as HorasApontadas,
    SUM(t.allocated_hours) - COALESCE(
        (SELECT SUM(h.horas) 
         FROM horas_trabalhadas h 
         WHERE h.ID_Projeto = p.ID_Projeto 
           AND h.ID_Colaborador = c.ID_Colaborador
        ), 0
    ) as Saldo
FROM fato_tarefas t
JOIN dim_colaboradores c ON t.ID_Colaborador = c.ID_Colaborador
JOIN dim_projetos p ON t.ID_Projeto = p.ID_Projeto
JOIN dim_clientes cl ON p.ID_Cliente = cl.ID_Cliente
WHERE t.allocated_hours > 0
GROUP BY c.NomeColaborador, cl.NomeCliente, p.NomeProjeto, p.StatusProjeto, p.startDate, p.estimatedDelivery, p.ID_Projeto, c.ID_Colaborador
ORDER BY c.NomeColaborador, p.NomeProjeto;
