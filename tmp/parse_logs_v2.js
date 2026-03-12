const fs = require('fs');
try {
    const rawData = fs.readFileSync('C:\\Users\\login\\.gemini\\antigravity\\brain\\cb205bd9-e348-4fe1-8d18-ae0168e97f6f\\.system_generated\\steps\\6491\\output.txt', 'utf8');
    const data = JSON.parse(rawData);
    const logs = data.result.result;

    console.log(`Analyzing ${logs.length} log entries...`);

    logs.forEach((l, index) => {
        try {
            const msg = JSON.parse(l.event_message);
            // Search for status 400 OR any error in component api/auth
            if (msg.status == 400 || msg.level === 'error' || l.level === 'error' || (msg.msg && msg.msg.toLowerCase().includes('error'))) {
                console.log(`--- Error Found at Index ${index} ---`);
                console.log(JSON.stringify(msg, null, 2));
            }
        } catch (e) {
            // If event_message is not JSON, try string search
            if (l.event_message.includes('400') || l.event_message.toLowerCase().includes('error')) {
                console.log(`--- Potential Error (String) at Index ${index} ---`);
                console.log(l.event_message);
            }
        }
    });
} catch (err) {
    console.error('Failed to parse log file:', err.message);
}
