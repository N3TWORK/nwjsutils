////////////////////////////////////////////////////////////////////////////////
//
// require.js
//
// Copyright 2014 N3TWORK
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////////

/**
@function require - Loads one or more node.js modules. Implements synchronous
  Node.js behavior and additionally, asyncronous and multiple module loading 
  support.
@param {String|Array} pathOrArrayOfPaths - either a String containing the path
  to the module or an Array of Strings, each containing a path to a module.
@param {optional function(Object) or function(Object[])} cb - callback function 
  to be called when modules are successfully loaded. Can be omitted if a single
  string is passed to the function, in which case the function blocks until the 
  module is loaded. When provided, the callback function is passed a single
  module Object when a single path String was given to require(), or an Array of
  module Objects, guaranteed to be in the same order that they were requested in
  the call to require()
@returns {Object|void} - When called with a single string and without a callback, 
  the function returns the loaded module Object. When called with a callback,
  the function returns void.

  Example usage:
	// Synchronous, Node.js style.
    var module = require("./module");

	// Single, asynchronous usage.
	var module = null;
	require("./module", function(m){
      module = m;
    });

    // Multiple, asynchronous usage.
    var A = null;
    var B = null;
    var C = null;
    require(["./A", "./B", "./C"], function(modules){
      A = modules[0];
      B = modules[1];
      C = modules[2];
    });
*/
function require(pathOrArrayOfPaths, cb)
{
	switch(typeof(pathOrArrayOfPaths))
	{
	case "object":
		return __arrayRequire(pathOrArrayOfPaths, cb);
	default:
		return __require(pathOrArrayOfPaths, cb);
	}
}

////////////////////////////////////////////////////////////////////////////////
// Internal functions below
////////////////////////////////////////////////////////////////////////////////
var __requireModules = [];

/** 
@function __requireAddModule - Injects the given javascript as a module into the
  current document.
@param {String} path - The cannonical path used to obtain the module's javascript.
@param {String} javascript - The javascript of the module.
@returns {Object} - The module Object.
*/
function __requireAddModule(path, javascript)
{
//	console.log(path);
	var script = document.createElement("script");
	script.type = "text/javascript";

	var js = "\
var m = (new function(){\nmodule={};\n" + javascript + "\n\
    if('undefined' !== (typeof exports))\
    {\
        this.exports=exports;\
    }\
    if('undefined' !== (typeof module.exports))\
    {\
        this.exports=module.exports;\
    }\
    });\
__requireModules['" + path + "'] =m.exports;";

	var txt = document.createTextNode(js);
	script.appendChild(txt);
	document.body.appendChild(script);
	var ret = __requireModules[path];

	return ret;
}

/**
@function __relativeToAbsolute - Converts a relative path to an absolute path
 from a given base path.
@param {String} base - The base path to use for the returned absolute URL.
@param {String} path - The relative path to convert.
@returns {String} - The absolute path.
*/
function __relativeToAbsolute(base, path)
{
    var pathParts = path.split("/");
	var baseParts = base.split("/");
    baseParts.pop();

	var i;
    for(i=0; i<pathParts.length; ++i)
	{
        if("." === pathParts[i])
		{
			continue;
		}
		if(".." === pathParts[i])
		{
			baseParts.pop();
		}
        else
		{
            baseParts.push(pathParts[i]);
		}
    }
    return baseParts.join("/");
}

/**
@function __arrayRequre - Load all modules located at the paths contained in 
  arr.
@param {Array} arr - Array of Strings containing paths to modules.
@param {function(Array)} - Callback function that receives an Array of module
  Objects. The module Objects are guaranteed to be in the same order as listed
  in arr.
*/
function __arrayRequire(arr, cb)
{
	if(!cb)
	{
		console.log("Cannot require an array of modules without a callback method");
		return;
	}
	else
	{
		var ctx = {
			"paths":arr,
			"modules":{},
			"pending":arr.length,
			"cb":cb
		};

		for(var i=0; i<arr.length; ++i)
		{
			__require(arr[i], function(m, path) {
				this.modules[path] = m;
				--this.pending;
				// All requested modules are loaded. Sort and return result.
				if(!this.pending)
				{
					// Put the modules in the order they were requested.
					var ret = [];
					for(var i=0; i<this.paths.length; ++i)
					{
						ret.push(this.modules[this.paths[i]]);
					}

					this.cb(ret, arr);
				}
			}.bind(ctx));
		}
	}
}

/**
@function __require - Load the module located at path. Loading occurs 
  synchronously if cb is not provided. When cb is provided, this function
  returns immediately.
@param {String} path - Relative or absolute path to module to load.
@param {optional function(Object)} cb - Optional callback function that 
  recieves the module when it is loaded.
@returns {Object|void} - Returns void when cb is specified or the module Object
  when called synchronously.
*/
function __require(path, cb)
{
//	console.log(document.baseURI);
	var originalPath = path;
	// TODO: This will probably be broken in IE and some solution is required -SCD
	var href = document.baseURI;
	var q = href.indexOf("?");
	if(q !== -1)
	{
		href = href.substring(0,q);
	}
	var lastSlash = href.lastIndexOf("/");
	var url;
	if(-1 !== lastSlash)
	{
		url = href.substring(0,lastSlash) + "/";
	}
	else
	{
		url = href + "/";
	}
	
	if(-1 == path.lastIndexOf(".js"))
	{
		path+=".js";
	}
	url = __relativeToAbsolute(url, path);
	// Check cache to see if module is already loaded.
	if(url in __requireModules)
	{
		if(cb)
		{
			cb(__requireModules[url], originalPath);
			return;
		}
		else
		{
			return __requireModules[url];
		}
	}

	var xhr = new XMLHttpRequest();
	if(cb)
	{
		xhr.open("GET", url, true);
        xhr.setRequestHeader("Cache-Control", "no-cache"); // Disable broken browser caching of XHR
		xhr.onload = function(e)
		{
			if(4 === xhr.readyState)
			{
				if(200 === xhr.status)
				{
					var m = __requireAddModule(url, xhr.responseText);
					cb(m, originalPath);
				}
			}
		};
		xhr.send();
	}
	else
	{
		xhr.open("GET", url, false);
        xhr.setRequestHeader("Cache-Control", "no-cache"); // Disable broken browser caching of XHR
		xhr.send();
		if(200 === xhr.status)
		{
			return __requireAddModule(url, xhr.responseText);
		}
		else
		{
			return null;
		}
	}
}
