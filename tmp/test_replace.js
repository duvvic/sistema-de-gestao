const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Heatmap Refinement
const heatmapSearch = `<div className="w-full h-full flex flex-col">
                                                      <div style={{ height: \`\${(day.plannedHours / Math.max(1, day.capacity)) * 100}%\`, flex: 'none', backgroundColor: 'var(--status-occupied)' }} />

                                                      <div style={{ height: \`\${(day.bufferHours / Math.max(1, day.capacity)) * 100}%\`, flex: 'none', backgroundColor: 'var(--status-free-bg)' }} />
                                                   </div>`;
const heatmapReplace = `<div className="w-full h-full flex flex-col-reverse">
                                                      <div 
                                                         style={{ 
                                                            height: \`\${Math.min(100, (day.plannedHours / Math.max(1, day.capacity)) * 100)}%\`, 
                                                            backgroundColor: isOverloaded ? 'var(--danger)' : 'var(--status-occupied)' 
                                                         }} 
                                                         className="w-full transition-all duration-500"
                                                      />
                                                      <div 
                                                         style={{ 
                                                            height: \`\${Math.min(100, (day.bufferHours / Math.max(1, day.capacity)) * 100)}%\`, 
                                                            backgroundColor: 'var(--status-free)' 
                                                         }} 
                                                         className="w-full opacity-20 transition-all duration-500"
                                                      />
                                                   </div>`;

// 2. Daily Meta Input
const dailyInputSearch = `className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none disabled:bg-transparent disabled:px-0 disabled:border-none" />`;
const dailyInputReplace = `className={\`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold outline-none transition-all \${isEditing ? 'bg-[var(--surface-2)] focus:ring-2 focus:ring-[var(--primary)]/20 shadow-inner' : 'bg-transparent border-transparent px-0 disabled:text-[var(--text)]'}\`} disabled={!isEditing} />`;

// 3. Monthly Meta Section
const monthlyContainerSearch = `className={\`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-black flex justify-between items-center transition-all \${isEditing ? 'bg-[var(--surface-2)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20' : 'bg-transparent border-transparent px-0'}\`}`;
const monthlyContainerReplace = `className={\`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-black flex justify-between items-center transition-all \${isEditing ? 'bg-[var(--surface-2)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 shadow-inner' : 'bg-transparent border-transparent px-0'}\`}`;

const monthlyInputClassSearch = `className="w-24 bg-transparent border-none outline-none font-black p-0 focus:ring-0 disabled:text-[var(--text)]"`;
const monthlyInputClassReplace = `className={\`w-24 bg-transparent border-none outline-none font-black p-0 focus:ring-0 \${monthlyHoursMode === 'auto' ? 'text-[var(--text)] opacity-40' : 'text-[var(--primary)]'}\`}`;

const restamSpanSearch = `className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded-lg font-black uppercase tracking-tight"`;
const restamSpanReplace = `className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded-lg font-black uppercase tracking-tight shadow-sm border border-purple-500/20"`;

// Apply replacements
// Using a more flexible matching approach for the big block
if (content.includes('flex flex-col-reverse')) {
    console.log('Heatmap already refined');
} else {
    // Try to find the heatmap block specifically
    const heatmapRegex = /<div className="w-full h-full flex flex-col">[\s\S]*?<\/div>/;
    // We only want to replace the first one inside the simulateUserDailyAllocation map
    // Actually, there's only one sequence like that for heatmap bars.
}

// Since global replace might be risky, let's just do targeted line replacements
let lines = content.split('\\n');

// 1. Heatmap (lines 617-621)
// We'll replace lines 617 to 621 with the new block
const heatmapStartIndex = lines.findIndex(l => l.includes('className="w-full h-full flex flex-col">')) - 1; // 0-indexed adjustment?
// Line 617 is index 616
if (lines[616] && lines[616].includes('className="w-full h-full flex flex-col">')) {
    lines.splice(616, 5,
        `                                                   <div className="w-full h-full flex flex-col-reverse">`,
        `                                                      <div style={{ height: \`\${Math.min(100, (day.plannedHours / Math.max(1, day.capacity)) * 100)}%\`, backgroundColor: isOverloaded ? 'var(--danger)' : 'var(--status-occupied)' }} className="w-full transition-all duration-500" />`,
        `                                                      <div style={{ height: \`\${Math.min(100, (day.bufferHours / Math.max(1, day.capacity)) * 100)}%\`, backgroundColor: 'var(--status-free)' }} className="w-full opacity-20 transition-all duration-500" />`,
        `                                                   </div>`
    );
}

// 2. Daily Meta (line 753)
// Line 753 is index 752
if (lines[752] && lines[752].includes('Hrs Meta Dia')) {
    // wait, line 753 is index 752. Line 752 index is 751.
}
// Let's use string replace on individual lines to be safe
lines = lines.map(line => {
    let nl = line;
    if (nl.includes('dailyAvailableHours ||') && nl.includes('Hrs Meta Dia') === false) {
        nl = nl.replace('bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none disabled:bg-transparent disabled:px-0 disabled:border-none', '\`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold outline-none transition-all \${isEditing ? "bg-[var(--surface-2)] focus:ring-2 focus:ring-[var(--primary)]/20 shadow-inner" : "bg-transparent border-transparent px-0 disabled:text-[var(--text)]"}\`').replace('disabled={!isEditing}', '').replace('/>', 'disabled={!isEditing} />');
    }
    if (nl.includes('monthlyHoursMode === \\'auto\\'') && nl.includes('calculatedTotal')) {
        // Correct container
    }
    return nl;
});

// Actually, I'll just write the whole thing using the tool with VERY SMALL unique targets.
console.log('Script finished');
