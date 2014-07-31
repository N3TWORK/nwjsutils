#!/usr/bin/env node
// -*- js -*-

// npm install minify-js

fs = require('fs');

if(process.argv.length < 3)
{
	console.log("Usage: " + process.argv[1] + " filename.html")
	return;
}

function getFileExtension(path)
{
	return path.split(".").pop();
}

function indexRequires(path, accum)
{
	if(typeof(accum) == "undefined")
	{
		accum = {modules:[]};
	}
	
	console.log("expandRequires " + path);
	var data = fs.readFileSync(path, "utf8");
	if(data)
	{
//		console.log("  read " + path);
		// Create and retain the module entry.
		var ext = getFileExtension(path);
		var module = {"path":path, "data":data, "ext":ext, "references":[]};
		
		var s = 0;
		while(true)
		{
			// Find the next require statement.
			var startToken = "require(\"";
			s = data.indexOf(startToken, s);
			if(s==-1)
			{
//				console.log("    no more start tokens");
				break;
			}
			s+=startToken.length;
		
			var endToken = "\")";
			var e = data.indexOf(endToken, s);
			if(e==-1)
			{
//				console.log("    no more end tokens");
				break;
			}
			// Add file extension if needed.
			var path = data.substring(s,e);
			if(path.indexOf(".js") == -1)
			{
				path+=".js";
			}
			console.log("    found " + path);
			
			// Store reference data.
			s = s-startToken.length;
			e = e+endToken.length;
			var reference = {"path":path, "s":s, "len":(e-s)};
			module["references"].push(reference);
			s=e;
			
			// Recurse into the required file to get depth first.
			var res = indexRequires(path, accum);
			accum.modules.concat(res.paths);
		}

		var exists = false;
		for(var i=0; i<accum.modules.length; ++i)
		{
			var m = accum.modules[i];
			if(m.path == module.path)
			{
				console.log("    already exists " + module.path);
				exists = true;
			}
		}
		if(!exists)
		{
			console.log("    adding " + module.path)
			accum.modules.push(module);
		}
	}
	
	return accum;
}



function bake(data)
{
	var moduleVarsByPath = {};
	var jsoutput = "";
	var output = "";
	for(var i=0; i<data.modules.length; ++i)
	{
		var m = data.modules[i];
		var moduleVar = "__req__"+String.fromCharCode(i+65)+"__";
		moduleVarsByPath[m.path] = moduleVar;
		
		console.log(moduleVar + ": " + m.path);
		
		var offset=0;
		for(var j=0; j<m.references.length; ++j)
		{
			var ref = m.references[j];
			var v = moduleVarsByPath[ref.path];
			var req = m.data.substr(ref.s+offset, ref.len);
			
			// Update the offset to account for length differences between the require statement
			// and the replaced variable name.
			offset-= (ref.len-v.length);
			
			m.data = m.data.replace(req, v);
		}

		if(m.ext == "js")
		{
			var js = "\
var m = (new function(){\n\
	module={};\n" + m.data + "\n\
	if('undefined' !== (typeof exports))\n\
	{\n\
		this.exports=exports;\n\
	}\n\
	if('undefined' !== (typeof module.exports))\n\
	{\n\
    	this.exports=module.exports;\n\
	}\n\
});\n\
var "+ moduleVar + " = m.exports;\n\n";
			jsoutput+=js;
		}
		else if(m.ext == "html")
		{
			// Now place the baked js in place of the require.js script tag
			var s = m.data.indexOf("require-data");
			if(s == -1)
			{
				console.log("ERROR: No script tag found marked with require-data property");
				return null;
			}
			
			var startToken = "<script"
			var scriptStart = m.data.lastIndexOf(startToken, s);
			if(scriptStart == -1)
			{
				console.log("ERROR: No <script start tag found");
				return null;
			}

			var endToken = "</script>";
			var scriptEnd = m.data.indexOf(endToken, s);
			if(scriptEnd == -1)
			{
				console.log("ERROR: No </script> end tag found");
				return null;
			}
			
			scriptEnd+=endToken.length;
			
			//console.log("scriptStart: "+ scriptStart + " scriptEnd: "+ scriptEnd);
			var requireData = m.data.substring(scriptStart, scriptEnd);
			
			//console.log("requireData: " + requireData);
			
			m.data = m.data.replace(requireData, "<script>\n" + jsoutput + "\n</script>\n");
			
			output+=m.data;
		}
		else
		{
			console.log("ERROR: unknown content type to bake: " + m.ext);
		}
	}

	return output;
}


function logData(data)
{
	for(var i=0; i<data.modules.length; ++i)
	{
		var m = data.modules[i];
		console.log(m.path + ": " + m.data.substr(0,0));
//		console.log("  ext: " + m.ext);
		for(var j=0; j<m.references.length; ++j)
		{
			var ref = m.references[j];
//			console.log("  " + ref.path + " s: "+ ref.s + " len: " + ref.len );
//			console.log("    " + m.data.substr(ref.s, ref.len));
		}
	}
}



function run()
{
	var data = indexRequires(process.argv[2]);
	logData(data);
	var output = bake(data);
	//console.log(output);
	var outfilename = "baked_" + process.argv[2];
	fs.writeFileSync(outfilename, output, "utf8");
	console.log("written to " + outfilename);
	console.log("done")
	
}

run();