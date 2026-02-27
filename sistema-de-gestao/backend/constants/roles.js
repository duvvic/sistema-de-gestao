// backend/constants/roles.js
// Definição dos roles do sistema RBAC

const USER_ROLES = {
    SYSTEM_ADMIN: 'system_admin',
    EXECUTIVE: 'executive',
    PMO: 'pmo',
    FINANCIAL: 'financial',
    TECH_LEAD: 'tech_lead',
    RESOURCE: 'resource'
};

const ROLE_HIERARCHY = {
    system_admin: 6,
    executive: 5,
    pmo: 4,
    financial: 4,
    tech_lead: 3,
    resource: 1
};

const ROLE_DISPLAY_NAMES = {
    system_admin: 'Administrador do Sistema',
    executive: 'Direção / Gestão Executiva',
    pmo: 'Gerente de Projetos / PMO',
    financial: 'Financeiro / Controladoria',
    tech_lead: 'Líder Técnico / Torre',
    resource: 'Recurso / Consultor'
};

module.exports = {
    USER_ROLES,
    ROLE_HIERARCHY,
    ROLE_DISPLAY_NAMES
};
