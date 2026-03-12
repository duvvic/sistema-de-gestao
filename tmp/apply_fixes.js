const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\components\\TeamMemberDetail.tsx';
const content = fs.readFileSync(path, 'utf8');

// Use regEx to find and replace to avoid space/CRLF issues
let newContent = content;

// Fix Daily Meta Input
const dailyInputSearch = /<input type="text" value={formData\.dailyAvailableHours \|\| ''} onChange={\(e\) => handleNumberChange\('dailyAvailableHours', e\.target\.value\)} placeholder="0" className="w-full px-4 py-3 bg-\[var\(--surface-2\)\] border border-\[var\(--border\)\] rounded-xl text-sm text-\[var\(--text\)\] font-bold focus:ring-2 focus:ring-\[var\(--primary\)\]\/20 outline-none disabled:bg-transparent disabled:px-0 disabled:border-none" \/>/;
const dailyInputReplace = `<input 
                                           type="text" 
                                           value={formData.dailyAvailableHours || ''} 
                                           onChange={(e) => handleNumberChange('dailyAvailableHours', e.target.value)} 
                                           placeholder="0" 
                                           className={\`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold outline-none transition-all \${isEditing ? 'bg-[var(--surface-2)] focus:ring-2 focus:ring-[var(--primary)]/20 shadow-inner' : 'bg-transparent border-transparent px-0 disabled:text-[var(--text)]'}\`}
                                           disabled={!isEditing} 
                                        />`;

newContent = newContent.replace(dailyInputSearch, dailyInputReplace);

// Fix Monthly Meta Container
const monthlyContainerSearch = /className={\`w-full px-4 py-3 border border-\[var\(--border\)\] rounded-xl text-sm text-\[var\(--text\)\] font-black flex justify-between items-center transition-all \${isEditing \? 'bg-\[var\(--surface-2\)\] focus-within:ring-2 focus-within:ring-\[var\(--primary\)\]\/20' : 'bg-transparent border-transparent px-0'}\`}/;
const monthlyContainerReplace = `className={\`w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-black flex justify-between items-center transition-all \${isEditing ? 'bg-[var(--surface-2)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 shadow-inner' : 'bg-transparent border-transparent px-0'}\`}`;

newContent = newContent.replace(monthlyContainerSearch, monthlyContainerReplace);

// Fix Monthly Meta Input and RESTAM span
const monthlyInputSearch = /className="w-24 bg-transparent border-none outline-none font-black p-0 focus:ring-0 disabled:text-\[var\(--text\)\]"/;
const monthlyInputReplace = `className={\`w-24 bg-transparent border-none outline-none font-black p-0 focus:ring-0 \${monthlyHoursMode === 'auto' ? 'text-[var(--text)] opacity-40' : 'text-[var(--primary)]'}\`}`;

newContent = newContent.replace(monthlyInputSearch, monthlyInputReplace);

const restamSearch = /className="text-\[10px\] bg-purple-500\/10 text-purple-600 px-2 py-1 rounded-lg font-black uppercase tracking-tight"/;
const restamReplace = `className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded-lg font-black uppercase tracking-tight shadow-sm border border-purple-500/20"`;

newContent = newContent.replace(restamSearch, restamReplace);

fs.writeFileSync(path, newContent, 'utf8');
console.log('File successfully updated via Node script');
