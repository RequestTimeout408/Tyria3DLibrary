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
 * Provides the static Tyria 3D Library Class.
 * @module T3D
 */

/* INCLUDES */
LocalReader = require('./LocalReader/LocalReader.js');

/**
 * Tyria 3D Library main class.
 * 
 * Use this static class to access file parsers- and data renderer classes.
 * 
 * This class also works as a factory for creating
 * LocalReader instances that looks up and inflates files from the Guild Wars 2 .dat.
 *
 * @main T3D
 * @class T3D
 * @static 
 */
module.exports = T3D;
function T3D() {}

/* PRIVATE VARS */
var _version = "1.0.3";
var _settings = {
	inflaterURL : "modules/nacl/t3dgwtools.nmf"
};

/* PUBLIC PROPERTIES */

/**
 * The current library version. Used to make sure local storage caches are not
 * shared between different releases.
 *
 * @final
 * @property version
 * @type String
 */
T3D.version = _version;


/* FILES */

/**
 * A static reference to the GW2File class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property GW2File
 * @type Class
 */
T3D.GW2File =				require("./format/file/GW2File");

/**
 * A static reference to the GW2Chunk class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property GW2Chunk
 * @type Class
 */
T3D.GW2Chunk = 				require("./format/file/GW2Chunk");


/* RENDERERS */

/**
 * A static reference to the DataRenderer class, the preferred way of
 * accessing this class.
 * 
 * @final
 * @property DataRenderer
 * @type Class
 */
T3D.DataRenderer = 			require("./dataRenderer/DataRenderer");

/**
 * A static reference to the EnvironmentRenderer class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property EnvironmentRenderer
 * @type Class
 */
T3D.EnvironmentRenderer = 	require("./dataRenderer/EnvironmentRenderer");

/**
 * A static reference to the HavokRenderer class, the preferred way of
 * accessing this class.
 * 
 * @final
 * @property HavokRenderer
 * @type Class
 */
T3D.HavokRenderer = 		require("./dataRenderer/HavokRenderer");

/**
 * A static reference to the PropertiesRenderer class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property PropertiesRenderer
 * @type Class
 */
T3D.PropertiesRenderer = 	require("./dataRenderer/PropertiesRenderer");

/**
 * A static reference to the ModelRenderer class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property ModelRenderer
 * @type Class
 */
T3D.ModelRenderer = 		require("./dataRenderer/ModelRenderer");

/**
 * A static reference to the TerrainRenderer class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property TerrainRenderer
 * @type Class
 */
T3D.TerrainRenderer = 		require("./dataRenderer/TerrainRenderer");

/**
 * A static reference to the ZoneRenderer class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property ZoneRenderer
 * @type Class
 */
T3D.ZoneRenderer = 			require("./dataRenderer/ZoneRenderer");

/**
 * A static reference to the StringRenderer class, the preferred way of
 * accessing this class.
 *
 * @final
 * @property StringRenderer
 * @type Class
 */
T3D.StringRenderer = 		require("./dataRenderer/StringRenderer");




/* LOGGING */

/**
 * A static reference to the static Logger class, the preferred way of
 * accessing this class. A simple way of providing your own logging methods
 * is to simply overwrite any or all of the logging methods specified in 
 * {{#crossLink "Logger/logFunctions:property"}}{{/crossLink}}
 *
 * @property Logger
 * @type Class
 */
T3D.Logger = require("./Logger");


/* SETTINGS */

/**
 * Contains a list of known map fileID:s and their names. Used in order to quickly
 * look up what maps are in a .dat file. Note that this property is hard coded and
 * has high probablity of being outdated. Also note that the names are just guesses
 * by RequestTimeout.
 *
 * The format of this list objects is
 *
 * 
 * 	{ 
 *  	maps : [
 *	  		{
 *     			name:"World Area Name",
 *	       		maps:[
 *	         		{ fileName :"[numeric fileId].data", name:"Map Name One" },
 *	           		{ fileName :"[numeric fileId].data", name:"Map Name Two" },		
 *	             	{ fileName :"[numeric fileId].data", name:"Map Name Three" }
 *	              ]
 *           },
 *	         {
 *			    name:"Another World Area Name",
 *		 	   	maps:[
 *		 		   	{ fileName :"[numeric fileId].data", name:"Map Name 408" }
 *			    ]
 *		     }
 * 		]
 *   }
 *
 * @final
 * @property MapFileList
 * @type Object
 */
T3D.MapFileList = 	require("./MapFileList");

/* UTILS */

/**
 * A static reference to the MaterialUtils class.
 *
 * @final
 * @property MaterialUtils
 * @type Class
 */
T3D.MaterialUtils = require('./util/MaterialUtils.js');

/**
 * A static reference to the MathUtils class.
 *
 * @final
 * @property MathUtils
 * @type Class
 */
T3D.MathUtils = require('./util/MathUtils.js');

/**
 * A static reference to the ParserUtils class.
 *
 * @final
 * @property ParserUtils
 * @type Class
 */
T3D.ParserUtils = require('./util/ParserUtils.js');


/**
 * A static reference to the RenderUtils class.
 *
 * @final
 * @property RenderUtils
 * @type Class
 */
T3D.RenderUtils = require('./util/RenderUtils.js');


/* PRIVATE METHODS */

/**
 * Performs checks for required browser capabilities and required third party libraries.
 * Loggs any warnings or error messages.
 * 
 * @private
 * @method  checkRequirements
 * @return {Number} The ammount of errors and warnings generated.
 */
function checkRequirements(){
	var numErrors = 0;
	var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
	if(!is_chrome){
		T3D.Logger.log(
			T3D.Logger.TYPE_ERROR,
			"T3D inflation requires Google Chrome."
		);
		numErrors++;
	}

	if(typeof DataStream === "undefined"){
		T3D.Logger.log(
			T3D.Logger.TYPE_ERROR,
			"T3D core functionality requires DataStream library."
		);
		numErrors++;
	}

	if(typeof THREE === "undefined"){
		T3D.Logger.log(
			T3D.Logger.TYPE_WARNING,
			"T3D mesh generation requires three.js library."
		);
		numErrors++;
	}

	if(numErrors<1){
		T3D.Logger.log(
			T3D.Logger.TYPE_MESSAGE,
			"Tyria 3D API v"+T3D.version+" initialized."
		);
	}

	return numErrors;
}

/**
 * Performs a quick and dirty check to find what chunk name definitions 
 * appear multiple times in th formats array. Note that anything that
 * appears more than 2 times wil get a too hight value due to the 
 * algorithm being... incorrect.
 *
 * @private
 * @method findDuplicateChunkDefs
 * @return {Object} An object mapping duplicate chunk definition names.
 * to the number of apperances.
 */
function findDuplicateChunkDefs(){
	var dups = {};
	T3D.formats.forEach(
		function(f1){

			T3D.formats.forEach(
				function(f2){
					if(f2.name == f1.name && f2 !== f1){
						if(dups[f1.name]){
							dups[f1.name]++;
						}
						else{
							dups[f1.name]=1;
						}
					}
				}
			);
		}
	);
	return dups
}


/* PUBLIC METHODS */


/**
 * Creates a new instance of LocalReader with an pNaCl inflater connected to it.
 * 
 * @method getLocalReader
 * @async
 * @param  {File}   	file		Core JS File instance, must refer to a GW2 .dat file
 * @param  {Function}	callback	Callback function, fired when the file index is fully
 *                             		constructed. Takes no arguments.
 *                             		
 * @param  {String} 	inflaterURL URL to the inflater .mft file. If omitted
 *                               	_settings.inflaterURL will be used instead.
 * 
 * @return {LocalReader}			The contructed LocalReader, note that this object
 *                             		will not be fully initialized until the callback
 *                             		is fired.
 */
T3D.getLocalReader = function(file, callback, inflaterURL, logger){

	/// Create Inflater for this file reader.
	/// We use a wrapper to catch the events.
	/// We use the embed tag itself for posing messages.
	
	var pNaClWrapper = document.createElement("div"); 
	pNaClWrapper.setAttribute("id", "pNaClListener");
	
	var pNaClEmbed = document.createElement("embed");
	pNaClEmbed.setAttribute("type", "application/x-pnacl");

	pNaClEmbed.style.position ="absolute";
	pNaClEmbed.style.height = 0;
	pNaClEmbed.style.width = 0;
	pNaClEmbed.setAttribute("src", inflaterURL ? inflaterURL : _settings.inflaterURL);

	/// Add the objects to the DOM
	pNaClWrapper.appendChild(pNaClEmbed);
	document.body.appendChild(pNaClWrapper);

	/// Connect the provided file reference to a new LocalReader.
	var lrInstance = new LocalReader(file, _version, logger);

	/// Give the LocalReader access to the inflater.
	lrInstance.connectInflater(pNaClEmbed, pNaClWrapper);

	/// Parse the DAT file MFT header. This must be done oncein order to access
	/// any files in the DAT.
	lrInstance.parseHeaderAsync(callback);

	/// Return file reader object
	return lrInstance;	
}

/**
 * Utility method for acceccing a list containing information about all files
 * in the .dat connected to the provided LocalReader instance. This method first
 * tries to read a local indexing list from the client's localstorage and
 * fallbacks to generating the list by scanning the MFT indices of the .dat
 * and peeking each file in order to find out what filetype it has.
 *
 * Note that peeking the files is the time consuming task, so if you don't want
 * yout application to spend time indexing the .dat and have a priori knowledge
 * about the required file Id's you should not use this method.
 * 
 * @method  getFileListAsync
 * @async
 * @param  {LocalReader}	localReader A fully initialized LocalReader instance
 * @param  {Function}		callback    Fires when the index has been loaded
 *                                 		from the localstorage or after it has
 *                                 		been built and stored in localstorage.
 *                                 		Takes the generated object list of
 *                                 		files as an argument. This list groups
 *                                 		arrays of MFT indices per file type,
 *                                 		for exmample:
 *
 * 
 * 	{
 *	  	"Unknown"	: [444, 555, 333],
 *	  	"MODL"		: [444, 555, 333],
 * 	  	"String"	: [666, 777, 888]
 * 	}
 * 
 * For more details see
 * {{#crossLink "LocalReader/listFiles:method"}}{{/crossLink}}
 */
T3D.getFileListAsync = function(localReader, callback){

	/// Check local storage for an existing file list
	var fileList = localReader.loadFileList();

	/// If there is no cached list, look for pre-defined maps.
	if(!fileList){
		localReader.readFileListAsync(callback);
	}

	/// Otherwise, just fire the callback with the cached list
	else{
		callback(fileList);
	}
	
}

/**
 * Utility method for acceccing a list containing information about all map files
 * in the .dat connected to the provided LocalReader instance. This method first
 * tries to read a local indexing list from the client's localstorage and
 * fallbacks to generating the list by scanning the MFT indices of the .dat
 * and peeking each file in order to find out what filetype it has.
 *
 * If the searchAll flag is not set to true, this process will only scan files
 * from the {{#crossLink "T3D/MapFileList:property"}}{{/crossLink}}
 * 
 * @method getMapListAsync
 * @async
 * @param {LocalReader}	localReader	A fully initialized LocalReader instance
 * @param {Function}	callback	Fires when the index has been loaded
 *                                 	from the localstorage or after it has
 *                                 	been built and stored in localstorage.
 *                                 	Takes the generated object list of
 *                                 	files as an argument. This list groups
 *                                 	arrays of MFT indices per file type,
 *                                 	for exmample:
 * 
 * 		{	
 * 			maps:[
 * 				{
 * 					name: 'Heart of Maguuma',
 * 					maps: [
 * 						{fileName:1151420, name:'HoT BWE3 Raid'},
 * 						{fileName:969663, name:'Verdant Brink}
 * 					]
 * 				},
 * 				{
 * 					name: 'Unknown maps',
 * 					maps: [
 * 						{fileName:12345678, name:'Unknown map 12345678'}
 * 					]
 * 				}
 * 			]
 
 *	    };
 * @param {boolean} searchAll if true forces re-indexing of entire dat.
 */
T3D.getMapListAsync = function(localReader, callback, searchAll){

	/// If seachAll flag is true, force a deep search
	if(searchAll){
		localReader.readMapListAsync(true, callback);
		return;
	}

	/// Check local storage for an existing map list
	var mapList = localReader.loadMapList();

	/// If there is no cached list, look for pre-defined maps.
	if(!mapList){
		localReader.readMapListAsync(false, callback);
	}

	/// Otherwise, just fire the callback with the cached list
	else{
		callback(mapList);
	}
	
}

/**
 * Utility method used for rendering map files. Loads a map file and applies
 * the provided renderers to it.
 * 
 * @method renderMapContentsAsync
 * @async
 * @param  {LocalReader}	localReader A fully initialized LocalReader instance
 * @param  {Number}   		fileName	The File Id of a mapc file.
 * @param  {Array}   		renderers	An array of renderer classes. Each
 *                               		class should extend 
 *                               		{{#crossLink "DataRenderer"}}{{/crossLink}}
 * @param  {Function}		callback    Callback function, takes the shared
 *                                 		renderer context as an argument.
 * @param  {Class}			logger      A logger class of the same type as
 *                               		{{#crossLink "Logger"}}{{/crossLink}}
 */
T3D.renderMapContentsAsync = function(localReader, fileName, renderers, callback, logger){

	/// VO for storing result from renderers
    var context = {};

	/// Make sure we got an actuall ID number		
	if(parseInt(fileName)){

		/// File name is baseId, load using local reader.
		localReader.loadFile(
			fileName,
			function(arrayBuffer){

				/// Set up datastream
				var ds = new DataStream(arrayBuffer, 0, DataStream.LITTLE_ENDIAN);

				/// Initiate Map file object. Connect callback
				var mapFile = new T3D.GW2File(ds, 0);

				/// Populate VO by running the renderers
			    var runAllRenderers = function(i){
					
					/// Run each renderer
					if(i < renderers.length ){
						T3D.runRenderer(
							renderers[i].renderClass,
							localReader,
							Object.assign(renderers[i].settings,{mapFile:mapFile}),
							context,
							runAllRenderers.bind(this,i+1)
						);
					}

					/// Fire callback with VO when done
					else{
						callback(context);
					}
				};

				/// Starting point for running each renderer
				runAllRenderers(0);
			}
		);
	}

	/// Primitive error message...
	else{
		var outputLogger = logger ? logger : T3D.Logger;
		outputLogger.log(
			T3D.Logger.TYPE_ERROR,
			"Map id must be an integer!, was:",fileName
		);
	}	
}

/**
 * Utility method for applying a single renderer to a LocalReader insatnce.
 * 
 * @method runRenderer
 * @async
 * 
 * @param  {Class}		renderClass	A class extending 
 *                                	{{#crossLink "DataRenderer"}}{{/crossLink}}
 * @param  {LocalReader}localReader A fully initialized LocalReader instance
 * @param  {Object}		settings    Settings passed to the renderer. Often
 *                               	specifies thinks like what file ID should
 *                               	be loaded.
 * @param  {Object}		context     The shared renderer context value object.
 * @param  {Function} 	cb          Callback method passed to the renderAsync
 *                                 	method of the renderer.
 */
T3D.runRenderer = function(renderClass, localReader , settings, context, cb){
	var r = new renderClass(
		localReader,
		settings,
		context
	);

	r.renderAsync(cb);
}


/**
 * @method getContextValue
 * @param  {Object} context      	A shared renderer context value object.
 * @param  {Class} 	clazz        	A class extending
 *                                	{{#crossLink "DataRenderer"}}{{/crossLink}}.
 *                                	Specifies for renderer class you want to read 
 *                                	output.
 * @param  {String} propName     	The name of the property written by the
 *                                	renderer that should retrtieved.
 * @param  {any} 	defaultValue 	This value is passed back if no data could
 *                              	be found.
 * @return {any}    				The specified value from the conext if any,
 *                          		otherwise defaultValue.
 */
T3D.getContextValue = function(context, clazz , propName, defaultValue){
	var output = context[clazz.name];
	if(output){
		return output[propName] ? output[propName] : defaultValue;
	}
	return defaultValue;
}

/**
 * Check if the client web browser can render WebGL 3D content.
 * 
 * @private
 * @method hasWebGL
 * @param  {boolean} return_context flag making this method return the canvas object instead of true
 * @return {boolean} true if the client is WebGL enabled, false otherwise
 */
T3D.hasWebGL = function(return_context)
{
    if (!!window.WebGLRenderingContext) {
        var canvas = document.createElement("canvas"),
             names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"],
           context = false;
 
        for(var i=0;i<4;i++) {
            try {
                context = canvas.getContext(names[i]);
                if (context && typeof context.getParameter == "function") {
                    // WebGL is enabled
                    if (return_context) {
                        // return WebGL object if the function's argument is present
                        return {name:names[i], gl:context};
                    }
                    // else, return just true
                    return true;
                }
            } catch(e) {}
        }
 
        // WebGL is supported, but disabled
        return false;
    }
 
    // WebGL not supported
    return false;
}


/// Library checks requirements on startup
checkRequirements();