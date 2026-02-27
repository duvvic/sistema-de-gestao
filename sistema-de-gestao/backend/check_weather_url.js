import https from 'https';

const url = "https://fonts.gstatic.com/s/e/notoemoji/latest/2601_fe0f/512.gif";

https.get(url, (res) => {
    console.log(`URL: ${url}`);
    console.log(`Status Code: ${res.statusCode}`);
}).on('error', (e) => {
    console.error(e);
});
