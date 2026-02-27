import https from 'https';

const urls = [
    "https://fonts.gstatic.com/s/e/notoemoji/latest/2601/512.gif",
    "https://fonts.gstatic.com/s/e/notoemoji/latest/2601_fe0f/512.gif",
    "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u2601.png"
];

urls.forEach(url => {
    https.get(url, (res) => {
        console.log(`URL: ${url} -> Status: ${res.statusCode}`);
    }).on('error', (e) => {
        console.error(`Error ${url}: ${e.message}`);
    });
});
