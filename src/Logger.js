/*
Copyright (C) 2015 RequestTimeout <https://github.com/RequestTimeout408>

This file is part of the Tyria 3D Library.

Tyria 3D Library is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Tyria 3D Library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with the Tyria 3D Library. If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * A Logger class for T3D
 *
 * This satic class defines severity levels of messages and provides
 * basic logging functionality. Replacing the reference to
 * @class Logger
 * @static 
 */
var Logger = {};

/**
 * @property {[Number]} TYPE_ERROR
 */
Logger.TYPE_ERROR = 4;

/**
 * @property {[Number]} TYPE_WARNING
 */
Logger.TYPE_WARNING = 3;

/**
 * @property {[Number]} TYPE_MESSAGE
 */
Logger.TYPE_MESSAGE = 2;

/**
 * @property {[Number]} TYPE_PROGRESS
 */
Logger.TYPE_PROGRESS = 1;

/**
 * @property {[Number]} TYPE_DEBUG
 */
Logger.TYPE_DEBUG = 0;



/**
 * The logging functions, indexed by severity/type.
 *
 * @property logFunctions
 * @type Function[]
 */
Logger.logFunctions = new Array(5);

/**
 * Main logging method. Takes 1 to N arguments. If there are more than 1 arguments
 * the first argument is interpreted as severity. If there is only one argument
 * severity defaults to
 * {{#crossLink "Logger/TYPE_MESSAGE:property"}}{{/crossLink}}.
 *  
 * The following arguments are passed to a logging function matching the
 * severity.
 * 
 
 * 
 * @method  log
 */
Logger.log = function(){

	/// Require at least 1 argument
	if(arguments.length == 0){
		return;
	}
	
	/// Parse arguments to an actual array
	var argArr = Logger.argsToArr(arguments);

	/// Default to message if just one argument was passed
	if(argArr.length == 1){
		argArr.unshift(Logger.TYPE_MESSAGE);
	}

	/// Otherwise 1st arg is severity, log/warn/error
	var severity = Math.max(0,Math.min(Logger.logFunctions.length, argArr.shift()));
	var logFunc  = Logger.logFunctions[severity];

	/// Ouput the rest of the arguments
	logFunc.apply(this, argArr);
}

Logger.argsToArr = function(args){
	var argArr = new Array(args.length);
    for(var i = 0; i < argArr.length; ++i) {
        argArr[i] = args[i];
    }
    return argArr;
}

Logger.logFunctions[Logger.TYPE_ERROR] = function(){
	console.error.apply(console,arguments);
}

Logger.logFunctions[Logger.TYPE_WARNING] = function(){
	console.warn.apply(console,arguments);
}

Logger.logFunctions[Logger.TYPE_MESSAGE] = function(){
	console.log.apply(console,arguments);
}

Logger.logFunctions[Logger.TYPE_PROGRESS] = function(){
	var argArr = Logger.argsToArr(arguments);
	argArr.unshift("Progress: ");
	console.log.apply(console,argArr);
}

Logger.logFunctions[Logger.TYPE_DEBUG] = function(){
	var argArr = Logger.argsToArr(arguments);
	console.debug.apply(console,argArr);
}


module.exports = Logger;