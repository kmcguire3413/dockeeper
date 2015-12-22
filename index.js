var http = require('http');

http.createServer(function (req, res) {
	switch (req.url) {
		case 'ping':
			res.writeHead(200, { type: 'text/json' });
			res.end(JSON.stringify({ success: true }));
			break;
		case 'docpush':
			res.writehead(200, { type: 'text/json' });
			res.end(JSON.stringify({ success: true }));
			break;
		default:
			res.writeHead(404, { type: 'text/plain' });
			res.end('That looks great!');
			break;
	}
}).listen(8080);