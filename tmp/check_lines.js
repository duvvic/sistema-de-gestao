const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx', 'utf8');
const lines = content.split('\n');
console.log('Line 781 (1-indexed):', JSON.stringify(lines[780]));
console.log('Line 782 (1-indexed):', JSON.stringify(lines[781]));
console.log('Line 783 (1-indexed):', JSON.stringify(lines[782]));
