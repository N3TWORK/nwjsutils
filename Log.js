////////////////////////////////////////////////////////////////////////////////
//
// Log.js
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

var Class = require("./Class");

var Log = {};

// Possible log levels.
Log.DEBUG = 1;
Log.WARN = 2;
Log.ERROR = 4;

// Set the mask to control which levels log.
Log.LogMask = 0;

/**
@function error - Log at the error log level and throw an exception.
@param {String} scope - The scope of the error. Used as a prefix tag on the
  logged message.
@param {String} msg - The message to log.
*/
Log.error = function(scope, msg)
{
	if(this.LogMask & this.ERROR)
	{
		console.log("Error: " + scope + " " + msg);
		console.trace();
		throw ""
	}
}

/**
@function warn - Log at the warning log level.
@param {String} scope - The scope of the error. Used as a prefix tag on the
  logged message.
@param {String} msg - The message to log.
*/
Log.warn = function(scope, msg)
{
	if(this.LogMask & this.WARN)
	{
		console.log("Warn: " + scope + " " + msg);
	}
}

/**
@function debug - Log at the debug log level.
@param {String} scope - The scope of the error. Used as a prefix tag on the
  logged message.
@param {String} msg - The message to log.
*/
Log.debug = function(scope, msg)
{
	if(this.LogMask & this.DEBUG)
	{
		console.log("Debug: " + scope + ": " + msg);
	}
}

/**
@function __getLineNumber - Obtains the current line number from where the 
  calling function was called.
@returns {Number} - The line number.
*/
function __getLineNumber()
{
	try
	{
		throw Error("");
	}
	catch(e)
	{
		try
		{
			return e.stack.split("\n")[4].split(":")[1]-2;
		}
		catch(e) // TODO Make this work in Safari.
		{
			return 0;
		}
	}
}


var Logger = Class.extend({
	/**
	@function init - Constructor. Initializes a new Logger. Defaults to log at all
	  levels. Set the LogMask property to change the active log levels.
	@param {String} scope - The scope of the logger. Used as a prefix tag on the
	  logged messages.
	*/
	init: function(scope)
	{
		this.scope = scope;
		this.LogMask = Log.LogMask;
	},

	/**
	@function debug - Log at the debug log level.
	@param {String} msg - The message to log.
	*/
	debug: function(msg)
	{
		if(this.LogMask & Log.DEBUG)
		{
			var fn =arguments.callee.caller.prototype.name?arguments.callee.caller.prototype.name:arguments.callee.caller.name;
			console.log("Debug: " + this.scope + ":"+ __getLineNumber() + " " + fn + ": " + msg);
		}
	},

	/**
	@function warn - Log at the warning log level.
	@param {String} msg - The message to log.
	*/
	warn: function(msg)
	{
		if(this.LogMask & Log.WARN)
		{
			var fn =arguments.callee.caller.prototype.name?arguments.callee.caller.prototype.name:arguments.callee.caller.name;
			console.log("Warn: " + this.scope + ":"+ __getLineNumber() + " " + fn + ": " + msg);
		}
	},

	/**
	@function error - Log at the error log level and throw an exception.
	@param {String} msg - The message to log.
	*/
	error: function(msg)
	{
		if(this.LogMask & Log.ERROR)
		{
			var fn =arguments.callee.caller.prototype.name?arguments.callee.caller.prototype.name:arguments.callee.caller.name;
			console.log("Error: " + this.scope + ":"+ __getLineNumber() + " " + fn + ": " + msg);
			console.trace();
			throw "";
		}
	}
});

Log.Logger = Logger;
module.exports = Log;
