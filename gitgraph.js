const { execSync } = require('child_process');
const out = execSync('git log --graph --oneline --all -n 50', { cwd: 'C:/Users/login/OneDrive/Área de Trabalho/Projetos/sistema-de-gest-o' }).toString();
console.log(out);
