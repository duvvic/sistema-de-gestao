const fs = require('fs');
const path = require('path');

const TEXT_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.txt', '.md'];
const output = [];

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
                            output.push(fullPath);
                        }
                    }
                }
            } catch (e) { }
        }
    } catch (e) { }
}

const root = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o';
searchInDir(root, '[Realtime]');
fs.writeFileSync(path.join(root, 'tmp\\search_results.txt'), output.join('\n'));
console.log(`Search finished. Found ${output.length} results.`);
