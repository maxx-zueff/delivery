const http = require('http');
const main = require('./flowwow.js');

const server = http.createServer(async (req, res) => {

    if(req.url === '/main') { // check if the URL is '/main'
        let result = await main(); // call the main function
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(JSON.stringify(result));
    } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello World\n');
    }
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
