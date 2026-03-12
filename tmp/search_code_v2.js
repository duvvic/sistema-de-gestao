const fs = require('fs');
const path = require('path');

const TEXT_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.txt', '.md'];

function searchInDir(dir, pattern) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.next') {
                        searchInDir(fullPath, pattern);
                    }
                } else if (stat.isFile()) {
                    if (TEXT_EXTS.includes(path.extname(file))) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        if (content.includes(pattern)) {
                            console.log(`Found "${pattern}" in: ${fullPath}`);
                        }
                    }
                }
            } catch (e) {
                // Ignore small errors
            }
        }
    } catch (e) {
        // Ignore small errors
    }
}

const root = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o';
console.log(`Searching for "Ouvindo canal"...`);
searchInDir(root, 'Ouvindo canal');
console.log('Search finished.');
