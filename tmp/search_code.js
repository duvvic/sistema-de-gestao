const fs = require('fs');
const path = require('path');

function searchInDir(dir, pattern) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                searchInDir(fullPath, pattern);
            }
        } else if (stat.isFile()) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(pattern)) {
                console.log(`Found "${pattern}" in: ${fullPath}`);
            }
        }
    }
}

const root = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o';
console.log('Searching for "Ouvindo canal"...');
searchInDir(root, 'Ouvindo canal');
console.log('Search finished.');
