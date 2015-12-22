var http = require('http');
var fs = require('fs');
var uuid = require('node-uuid');
var cryptutil = require('./cryptutil.js');

var rsa_key_pub_pem = '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDwfTqGSrzW7I1ilVX13x8Mt2g6\n9UVms6tBO6nkUHmJ7ceDGuW8BQ4W2j/ks/sPhZ6tMLPzfKsRA6qnxpD14El4lqm3\nlFtOaF9tsV390fX/4SZNlCcC/SG8thObC6CST24/CMyN3WeF1zr0FbmUq/uKob1K\nR8gCWteI6CKBIHeipwIDAQAB\n-----END PUBLIC KEY-----';

var rsa_key_pub = cryptutil.publicKeyFromPem(rsa_key_pub_pem);

function docpush(data) {
	try {
		fs.mkdirSync('./documents');
	} catch (error) {
	}

	var uid = uuid.v4();

	fs.writeFileSync('./documents/' + uid, data);

	return uid;
}

function docpull(uid, cb) {
	// Only keep character that are alpha-numeric. This
	// prevents the exploitation of the document pull
	// mechanism.
	uid = uid.replace(new RegExp('[^0-9,a-z,A-Z,\-]', 'g'), '');

	fs.readFile('./documents/' + uid, function (error, data) {
		if (error) {
			cb(null);
			return;
		}
		data = data.toString('binary');
		data = cryptutil.rsa_aes_crypt(rsa_key_pub, data);
		data = data.bytes();
		cb(data);
	});
}

function docenum(cb) {
	fs.readdir('./documents', function (error, files) {
		var out = [];
		for (var x = 0; x < files.length; ++x) {
			var ctime = fs.statSync('./documents/' + files[x]).ctime;
			out.push([files[x], ctime]);
		}
		cb(out);
	});
}

function reqhandler(req, res, data) {
	console.log('req.url', req.url);
	switch (req.url) {
		case '/ping':
			res.writeHead(200, { 
				type: 'text/json',
				'Access-Control-Allow-Origin':    '*',
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',				
			});
			res.end(JSON.stringify({ success: true }));
			console.log('pong');
			break;
		case '/docpush':
			console.log('got doc push', data.length);
			if (data.length < 1) {
				res.writeHead(404, { 
					type: 'text/json',
					'Access-Control-Allow-Origin':    '*',
					'Access-Control-Allow-Credentials': true,
					'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				});
				res.end(JSON.stringify({ success: false }));
				console.log('docpush', 'success');
				return;
			}
			data = new Buffer(data, 'binary');
			var txid = docpush(data);
			res.writeHead(200, { 
				type: 'text/json',
				'Access-Control-Allow-Origin':    '*',
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',				
			});
			res.end(JSON.stringify({ success: true, txid: txid }));
			break;
		case '/docenum':
			docenum(function (files) {
				res.writeHead(200, { 
					type: 'text/json',
					'Access-Control-Allow-Origin':    '*',
					'Access-Control-Allow-Credentials': true,
					'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',							
				});
				res.end(JSON.stringify(files));
				console.log('docenum');
			});
			break;
		case '/docpull':
			docpull(data, function (data) {
				if (!data) {
					res.writeHead(404, { 
						type: 'binary/document',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Credentials': true,
						'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',							
					});
					res.end(data);	
					return;				
				}
				res.writeHead(200, { 
					type: 'binary/document',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Credentials': true,
					'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',							
				});
				res.end(data);
				console.log('docpull', 'success');
			});
			break;
		default:
			res.writeHead(404, { type: 'text/plain' });
			res.end('That looks great!');
			break;
	}
}

http.createServer(function (req, res) {
    var method = req.method;
    if (method == 'POST') { 
        var data = []; 
        var datatotalsize = 0;
        req.on('data', function (chunk) {
            datatotalsize += chunk.length;
            if (datatotalsize > 1024 * 1024 * 32) {
                // Disable this potential DOS attack by limiting
                // the POST data to 32Mbytes.
                res.writeHead(403);
                res.end();
                return;
            }
            data.push(chunk);
        });

        req.on('end', function () {
        	reqhandler(req, res, data.join(''));
        });
        return;
    }
    reqhandler(req, res, null);		
}).listen(8080);