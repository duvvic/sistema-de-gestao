#!/usr/bin/env node

/**
 * Script para padronizar botões de navegação em todos os componentes
 * 
 * Substitui:
 * - navigate(-1) por goBackSmart()
 * - Botões <ArrowLeft> inline pelo componente BackButton
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

const COMPONENTS_TO_UPDATE = [
    'ProjectForm.tsx',
    'UserForm.tsx',
    'TaskDetail.tsx',
    'ProjectDetailView.tsx',
    'TeamMemberDetail.tsx',
    'TimesheetForm.tsx',
    'UserProfile.tsx',
    'KanbanBoard.tsx'
];

function updateComponent(filePath) {
    console.log(`\n📝 Processando: ${path.basename(filePath)}`);

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Adicionar import do BackButton se não existir
    if (!content.includes('import BackButton')) {
        const importMatch = content.match(/(import.*from.*lucide-react.*)/);
        if (importMatch) {
            content = content.replace(
                importMatch[0],
                `${importMatch[0]}\nimport BackButton from './shared/BackButton';`
            );
            modified = true;
            console.log('  ✅ Adicionado import BackButton');
        }
    }

    // 2. Remover ArrowLeft do import de lucide-react
    if (content.includes('ArrowLeft')) {
        content = content.replace(/,?\s*ArrowLeft,?\s*/g, ', ');
        content = content.replace(/,\s*,/g, ','); // limpar vírgulas duplas
        modified = true;
        console.log('  ✅ Removido ArrowLeft dos imports');
    }

    // 3. Substituir botões inline pelo BackButton
    const inlineButtonPatterns = [
        /<button[^>]*onClick=\{?\(\)\s*=>\s*navigate\(-1\)\}?[^>]*>\s*<ArrowLeft[^>]*\/>\s*<\/button>/g,
        /<button[^>]*onClick=\{?\(\)\s*=>\s*navigate\(-1\)\}?[^>]*>\s*<ArrowLeft[^>]*>\s*<\/ArrowLeft>\s*<\/button>/g,
    ];

    inlineButtonPatterns.forEach(pattern => {
        if (pattern.test(content)) {
            content = content.replace(pattern, '<BackButton />');
            modified = true;
            console.log('  ✅ Substituído botão inline por BackButton');
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('  💾 Arquivo atualizado!');
    } else {
        console.log('  ⏭️  Nenhuma alteração necessária');
    }
}

function main() {
    console.log('🚀 Iniciando padronização de navegação...\n');

    COMPONENTS_TO_UPDATE.forEach(componentName => {
        const filePath = path.join(COMPONENTS_DIR, componentName);
        if (fs.existsSync(filePath)) {
            updateComponent(filePath);
        } else {
            console.log(`⚠️  Arquivo não encontrado: ${componentName}`);
        }
    });

    console.log('\n✨ Processo concluído!\n');
}

main();
