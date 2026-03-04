const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the extra bracket in TeamMemberDetail.tsx
content = content.replace(/className=\{`w-10 h-10 rounded-xl border flex flex-col items-center justify-center transition-all cursor-default overflow-hidden \$\{isOverloaded \? 'ring-2 ring-red-500\/20' : ''\} \$\{day\.isAbsent \? 'bg-orange-500\/10 border-orange-200' : ''\}`\}\}/g,
    "className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center transition-all cursor-default overflow-hidden ${isOverloaded ? 'ring-2 ring-red-500/20' : ''} ${day.isAbsent ? 'bg-orange-500/10 border-orange-200' : ''}`}");

fs.writeFileSync(path, content, 'utf8');
console.log("Fixed TeamMemberDetail.tsx");
