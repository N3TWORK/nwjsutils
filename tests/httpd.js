var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
    port = process.argv[2] || 8888;


function getContentType(filename)
{
	var contentType;
	var ext = path.extname(filename);
	switch(ext)
	{
	case ".html":
		contentType = "text/html";
		break;
	case ".js":
		contentType = "application/javascript";
		break;
	default:
		contentType = "text/plain";
	}
	return contentType;
}

function serveFile(filename, request, response)
{
	if(fs.statSync(filename).isDirectory())
	{
		filename += '/index.html';	
	}
	fs.readFile(filename, "binary", function(err, file)
	{
		if(err)
		{
			response.writeHead(500, {"Content-Type": "text/plain"});
			response.write(err + "\n");
			response.end();
			return;
		}
		
		if(request.method == "GET")
		{
			var contentType=getContentType(filename);
			response.writeHead(200, {"Content-Type": contentType});
			response.write(file, "binary");
			response.end();
		}
		else if(request.method == "OPTIONS")
		{
			var contentType=getContentType(filename);
			response.writeHead(200, {	"Access-Control-Allow-Origin": "*",
										"Access-Control-Allow-Methods": "GET, OPTIONS",
										"Content-Type":contentType
									});
			response.end();
		}
	});
}

http.createServer(function(request, response) 
{
	var uri = url.parse(request.url).pathname;
    var filename = path.join(process.cwd(), uri);
	fs.exists(filename, function(exists) 
	{
		if(exists)
		{
			serveFile(filename, request, response);
		}
		// Special case to serve from one level up for tests...
		else
		{
		    filename = path.join(process.cwd(), "../" + uri);
			console.log(filename);
			fs.exists(filename, function(exists)
			{
				if(exists)
				{
					serveFile(filename, request, response);
				}
				else
				{
					response.writeHead(404, {"Content-Type": "text/plain"});
					response.write("404 Not Found\n");
					response.end();
					return;
				}
			});
		}
	});
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
