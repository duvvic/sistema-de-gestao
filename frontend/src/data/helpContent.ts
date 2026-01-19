
// data/helpContent.ts

interface HelpContent {
    title: string;
    description: string[];
}

interface RoleBasedHelp {
    admin?: HelpContent;
    developer?: HelpContent;
    default?: HelpContent; // Fallback
}

// Mapa de ajudas por rota (pode usar regex ou strings parciais na lógica de busca)
const HELP_DATA: Record<string, RoleBasedHelp> = {
    // === ROTAS DE DESENVOLVEDOR (Main Flow) ===
    '/developer/projects': {
        developer: {
            title: 'Meus Projetos',
            description: [
                'Esta é sua visão geral dos projetos onde você está alocado.',
                '📊 **Cards de Projeto:** Mostram o progresso e o total de tarefas pendentes.',
                '🎨 **Bordas Coloridas:** Indicam a saúde das tarefas (🟢 Verde: Tudo certo, 🔴 Vermelho: Atrasos, 🟠 Laranja: Em andamento).',
                '👆 **Ação:** Clique em qualquer cartão para entrar na visão detalhada e criar novas tarefas.'
            ]
        },
        admin: { // Admins também podem ver essa tela
            title: 'Visão de Projetos (Modo Dev)',
            description: [
                'Esta tela simula a visão que um desenvolvedor tem.',
                '👁️ **Auditoria:** Utilize para verificar exatamente como os colaboradores estão enxergando suas atribuições e prioridades.'
            ]
        }
    },
    '/developer/tasks': {
        developer: {
            title: 'Minhas Tarefas (Kanban)',
            description: [
                'Seu quadro de trabalho diário interativo.',
                '🖱️ **Arrastar e Soltar:** Mova os cards entre as colunas para atualizar (A Fazer ➡️ Em Progresso ➡️ Concluído).',
                '⏰ **Atenção:** Cards com borda vermelha espessa estão atrasados.',
                '⚡ **Acesso Rápido:** Use o botão "Apontar Hoje" direto no card para lançar horas sem abrir o formulário.',
                '🔍 **Filtros:** Use a barra superior para buscar tarefas específicas por nome.'
            ]
        }
    },
    '/developer/learning': {
        developer: {
            title: 'Central de Estudos',
            description: [
                'Recursos para aprimoramento profissional.',
                '📚 **SAP:** Acesso direto ao portal Descomplicando Linguagens.',
                '🎓 **Cursos:** Link rápido para a plataforma Udemy.',
                '🔗 **Links Externos:** Ao clicar nos cards, os sites abrirão em uma nova aba.'
            ]
        }
    },
    '/developer/projects/': { // Detalhes do projeto (match parcial)
        developer: {
            title: 'Detalhes do Projeto',
            description: [
                'Visão detalhada deste projeto específico.',
                '📋 **Lista de Tarefas:** Aqui você vê todas as tarefas onde você é o responsável ou colaborador.',
                '🔙 **Navegação:** Use o botão "Voltar" no canto superior esquerdo para retornar à lista.',
                '📈 **Progresso:** A barra no topo indica o avanço global do projeto.'
            ]
        }
    },

    // === ROTAS DE TIMESHEET ===
    '/timesheet': {
        default: {
            title: 'Controle de Horas',
            description: [
                'Calendário mensal de seus lançamentos.',
                '📅 **Dias Marcados:** Círculos coloridos indicam dias com horas já lançadas.',
                '🔢 **Totalizador:** O número pequeno no canto do dia mostra o total de horas apontadas naquela data.',
                '➕ **Novo Lançamento:** Clique em qualquer dia vazio para adicionar rapidamente um novo apontamento.',
                '⚠️ **Lembrete:** Mantenha seus apontamentos em dia para evitar pendências no fechamento do mês.'
            ]
        }
    },
    '/timesheet/new': {
        default: {
            title: 'Novo Apontamento',
            description: [
                'Formulário obrigatório para registrar trabalho.',
                '1️⃣ **Contexto:** Selecione primeiro o Cliente e o Projeto.',
                '2️⃣ **Tarefa:** Vincular uma Tarefa torna o apontamento mais preciso e rastreável.',
                '🍽️ **Almoço:** Marque "Almoço Deduzido" para subtrair automaticamente 1h do seu intervalo.',
                '📝 **Descrição:** Descreva brevemente o que foi realizado (ex: "Correção de bug no login").'
            ]
        }
    },

    // === ROTAS ADMIN ===
    '/admin/clients': {
        admin: {
            title: 'Gestão de Clientes',
            description: [
                'Painel principal para gerenciar sua carteira de clientes.',
                '🏢 **Cadastro:** Aqui você cria e edita as empresas atendidas.',
                '🚦 **Status:** A bolinha colorida mostra se o cliente tem projetos ativos.',
                '⚙️ **Opções:** Use o menu de 3 pontos em cada card para Editar ou Arquivar.',
                '📂 **Navegação:** Clique no card da empresa para ver apenas os projetos dela.'
            ]
        }
    },
    '/admin/projects': {
        admin: {
            title: 'Gestão Global de Projetos',
            description: [
                'Torre de controle de todos os projetos da empresa.',
                '🌍 **Visão Macro:** Diferente da visão do desenvolvedor, aqui você vê TUDO, de todos os times.',
                '🔎 **Filtros:** Utilize as opções no topo para encontrar projetos parados ou sem atividade recente.',
                '✨ **Criação:** Use o botão "+ Novo Projeto" para iniciar um novo trabalho.'
            ]
        }
    },
    '/admin/team': {
        admin: {
            title: 'Equipe e Colaboradores',
            description: [
                'Gestão de Usuários e Permissões.',
                '👤 **Novo Usuário:** Cadastre novos funcionários e defina suas senhas provisórias.',
                '🔑 **Permissões:** Defina o Papel (Admin vs Desenvolvedor) com cuidado para controlar o acesso a dados sensíveis.',
                '📊 **Carga:** A lista mostra quantos projetos e tarefas cada um tem sob sua responsabilidade agora.'
            ]
        }
    },
    '/admin/timesheet': {
        admin: {
            title: 'Gestão de Timesheet (Admin)',
            description: [
                'Painel de auditoria de horas da equipe.',
                '👥 **Carrossel:** Use as fotos no topo para filtrar o calendário por colaborador.',
                '✅ **Validação:** Verifique rapidamente quem trabalhou hoje (Presentes vs Ausentes).',
                '📅 **Buracos:** Identifique dias sem apontamento no calendário visual.',
                '🖱️ **Edição:** Clique em um lançamento de terceiro para corrigir ou validar.'
            ]
        }
    },
    '/admin/reports': {
        admin: {
            title: 'Relatórios Gerenciais',
            description: [
                'Área de inteligência e extração de dados.',
                '🎛️ **Filtros Avançados:** Combine Data, Cliente e Projeto para segmentar a análise.',
                '📥 **Exportação:** O botão "Exportar Excel" gera uma planilha detalhada com abas separadas (Resumo, Detalhes, Budget).',
                '💰 **Financeiro:** Use esses dados para fechar faturas mensais ou analisar a rentabilidade de contratos.'
            ]
        }
    }
};

/**
 * Busca o conteúdo de ajuda baseado na rota atual e no papel do usuário
 */
export const getHelpContent = (path: string, role: string = 'developer'): HelpContent | null => {
    // 1. Tenta match exato
    let match = HELP_DATA[path];

    // 2. Se não achar, tenta match parcial (útil para rotas com ID, ex: /projects/123)
    if (!match) {
        const keys = Object.keys(HELP_DATA);
        // Ordena por tamanho decrescente para pegar o match mais específico possível
        // Ex: /developer/projects/123 deve dar match em /developer/projects/ antes de /developer/
        const matchedKey = keys
            .sort((a, b) => b.length - a.length)
            .find(key => path.startsWith(key));

        if (matchedKey) {
            match = HELP_DATA[matchedKey];
        }
    }

    if (!match) return null;

    // 3. Resolve o conteúdo baseado na Role
    if (role === 'admin' && match.admin) return match.admin;
    if (role === 'developer' && match.developer) return match.developer;

    // 4. Fallback para default ou admin/dev se disponível (cross-role help)
    return match.default || match.developer || match.admin || null;
};
