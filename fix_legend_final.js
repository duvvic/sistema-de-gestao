const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

const newLegend = `<div className="flex flex-wrap items-center gap-4">
                                     <div className="flex items-center gap-1.5" title="Horas ocupadas com projetos ativos">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Ocupado</span>
                                     </div>
                                     <div className="flex items-center gap-1.5" title="Horas de reserva técnica ou suporte">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Reserva</span>
                                     </div>
                                     <div className="flex items-center gap-1.5" title="Dias de ausência">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Ausência</span>
                                     </div>
                                     <div className="flex items-center gap-1.5" title="Horas disponíveis">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Livre</span>
                                     </div>
                                  </div>`;

// STRATEGY: Look specifically for the legend items pattern
const searchPattern = /<div className="flex items-center gap-4">[\s\S]*?PROJETOS ATIVOS[\s\S]*?<\/div>\s*<\/div>/;
if (content.match(searchPattern)) {
    content = content.replace(searchPattern, newLegend + "\n                                  </div>");
} else {
    // Fallback if already partially modified by previous script
    const searchPattern2 = /<div className="flex items-center gap-4">[\s\S]*?Projetos Ativos[\s\S]*?<\/div>\s*<\/div>/;
    content = content.replace(searchPattern2, newLegend + "\n                                  </div>");
}

// TOOLTIP (Using multi-pass to be sure)
// Reset to known state then replace
content = content.replace(/<span className="text-blue-400">.*?<\/span>/g, '<span className="text-blue-400">OCUPADO:</span>');
content = content.replace(/<span className="text-amber-400">.*?<\/span>/g, '<span className="text-amber-400">RESERVA:</span>');
content = content.replace(/<span className="text-emerald-400">.*?<\/span>/g, '<span className="text-emerald-400">LIVRE:</span>');
content = content.replace(/<span>TOTAL:<\/span>/g, '<span>CARGA TOTAL:</span>');
content = content.replace(/<span>CARGA TOTAL:<\/span>/g, '<span>CARGA TOTAL:</span>');

content = content.replace(/'AUSENTE'/g, "'AUSÊNCIA'");
content = content.replace(/'AUS'/g, "'AUS'");

fs.writeFileSync(path, content, 'utf8');
console.log("TeamMemberDetail.tsx updated (Final Robust Version)");
