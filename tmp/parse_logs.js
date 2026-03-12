const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\login\\.gemini\\antigravity\\brain\\cb205bd9-e348-4fe1-8d18-ae0168e97f6f\\.system_generated\\steps\\6491\\output.txt', 'utf8'));
const logs = data.result.result;

const errors = logs.filter(l => {
    const msg = JSON.parse(l.event_message);
    return msg.level === 'error' || l.level === 'error' || msg.status >= 400;
});

console.log('Total errors found:', errors.length);
errors.forEach(f => {
    console.log(f.event_message);
});
