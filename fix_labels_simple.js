const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// Legend Replacements
content = content.replace(/"Projetos Ativos"/g, '"Ocupado"');
content = content.replace(/>Projetos Ativos<\/span>/g, '>Ocupado</span>');
content = content.replace(/"Ativ. Contínuas"/g, '"Reserva"');
content = content.replace(/>Ativ. Contínuas<\/span>/g, '>Reserva</span>');
content = content.replace(/"Horas Livres"/g, '"Livre"');
content = content.replace(/>Horas Livres<\/span>/g, '>Livre</span>');

// Add Absence to legend if not there
if (!content.includes('>Ausência</span>')) {
    const searchDiv = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"></div>';
    const insertTerm = `                                      </div>
                                     <div className="flex items-center gap-1.5" title="Dias de ausência">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Ausência</span>`;

    // This is a bit risky but let's try to find the end of the Livre part
    content = content.replace(/<span className="text-\[9px\] font-black uppercase text-\[var\(--muted\)\]">Livre<\/span>\s*<\/div>/g,
        `<span className="text-[9px] font-black uppercase text-[var(--muted)]">Livre</span>
                                     </div>
                                     <div className="flex items-center gap-1.5" title="Dias de ausência">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]"></div>
                                        <span className="text-[9px] font-black uppercase text-[var(--muted)]">Ausência</span>
                                     </div>`);
}

// Tooltip and others
content = content.replace(/>PLANEJADO:<\/span>/g, '>OCUPADO:</span>');
content = content.replace(/>RESERVA:<\/span>/g, '>RESERVA:</span>');
content = content.replace(/>BUFFER:<\/span>/g, '>LIVRE:</span>');
content = content.replace(/>TOTAL:<\/span>/g, '>CARGA TOTAL:</span>');
content = content.replace(/'OFF'/g, "'AUS'");
content = content.replace(/'AUSENTE'/g, "'AUSÊNCIA'");

fs.writeFileSync(path, content, 'utf8');
console.log("TeamMemberDetail.tsx updated successfully (Simple string match)");
