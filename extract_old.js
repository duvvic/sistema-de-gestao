
const { execSync } = require('child_process');
const fs = require('fs');

try {
    const content = execSync('git show HEAD~10:frontend/src/utils/normalizers.ts').toString();
    fs.writeFileSync('old_normalizers.ts', content);
    console.log('Done');
} catch (e) {
    console.error(e);
}
