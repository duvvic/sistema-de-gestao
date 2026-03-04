const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Traduzir e Melhorar legenda do mapa
content = content.replace(
    /<div className="flex items-center gap-1\.5">\s*<div className="w-2 h-2 rounded-full bg-blue-500"><\/div>\s*<span className="text-\[8px\] font-black uppercase text-\[var\(--muted\)\]">Planejado<\/span>\s*<\/div>/g,
    `<div className="flex items-center gap-1.5" title="Horas dedicadas a projetos com prazos definidos">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Projetos Ativos</span>
                                     </div>`
);

content = content.replace(
    /<div className="flex items-center gap-1\.5">\s*<div className="w-2 h-2 rounded-full bg-amber-400"><\/div>\s*<span className="text-\[8px\] font-black uppercase text-\[var\(--muted\)\]">Reserva<\/span>\s*<\/div>/g,
    `<div className="flex items-center gap-1.5" title="Horas de suporte ou atividades contínuas">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Ativ. Contínuas</span>
                                     </div>`
);

content = content.replace(
    /<div className="flex items-center gap-1\.5">\s*<div className="w-2 h-2 rounded-full bg-emerald-400"><\/div>\s*<span className="text-\[8px\] font-black uppercase text-\[var\(--muted\)\]">Buffer<\/span>\s*<\/div>/g,
    `<div className="flex items-center gap-1.5" title="Horas disponíveis livre de alocações">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Horas Livres</span>
                                     </div>`
);

// 2. Traduzir Tooltip
content = content.replace(/<span className="text-blue-400">PLANEJADO:<\/span>/g, '<span className="text-blue-400">PROJETOS:</span>');
content = content.replace(/<span className="text-amber-400">RESERVA:<\/span>/g, '<span className="text-amber-400">CONTÍNUO:</span>');
content = content.replace(/<span className="text-emerald-400">BUFFER:<\/span>/g, '<span className="text-emerald-400">DISPONÍVEL:</span>');
content = content.replace(/<span>TOTAL:<\/span>/g, '<span>CARGA TOTAL:</span>');

fs.writeFileSync(path, content, 'utf8');
console.log("TeamMemberDetail.tsx updated successfully");
