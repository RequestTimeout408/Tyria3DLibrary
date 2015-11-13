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

/// Generic ArenaNet File with basic header functionality
var GW2File = require('../format/file/GW2File.js');

/// Definition of main dat file header
var defANDAT = require('../format/definition/ANDAT');

/// Definition of the MFT index
var defMFT = require('../format/definition/MFT');

/// Small collection of Math and Sort algorithms
var MathUtils = require('../util/MathUtils.js');

/// List of known GW2 maps used to make lookup faster
var MapFileList =  require('../MapFileList');


/**
 * A statefull class that handles reading and inflating data from a local GW2 dat file.
 * @class LocalReader
 * @constructor
 * @param {File}	datFile A core JS File instance, must refer to the GW2 .dat
 * @param {String}	version T3D version.
 * @param {Object} logger {{#crossLink "Logger"}}{{/crossLink}} object responsible for UI logging.
 */
var LocalReader = function(datFile, version, logger){

	/// Initiate list of file infaltion listeners
	this.fileListeners = [];

	/// Add reference to file object to DAT
	this.dat = datFile;
	this.version = version;

	if(logger)
		this.logger = logger;
	else
		this.logger = T3D.Logger;
};

/**
 * Parses the dat file main header and parses the MFT index
 * @method parseHeaderAsync 
 * @async
 * @param  {Function} callback Fires when mft indexing is complete. No arguments
 */
LocalReader.prototype.parseHeaderAsync = function(callback){

	this.onFullyLoaded = callback;

	///Read dat file header, 40 bytes should always be the length
	this.loadFilePart(this.dat, 0, 40, this.readANDatHeader);	
}

/**
 * Registers a pNaCl inflaton program from the DOM to this instance.
 * @method connectInflater
 * @param  {HTMLElement} inflater   The embed element for the pNaCl program
 * @param  {HTMLElement} inflaterWrapper The element wrapping the embed
 */
LocalReader.prototype.connectInflater = function(inflater, inflaterWrapper){
	var self = this;

	/// HTML pNaCl emed elements
	this.NaClInflater = inflater;	

    /// Set up a listener for any messages passed by the pNaCl component
    inflaterWrapper.addEventListener(
    	'message',
    	function(message_event){
    		self.NaClListener.call(self, message_event);
    	},
    	true
	);

}

/**
 * Listener for pNaCl inflater.
 * @method NaClListener
 * @param {Object} message_event data received from pNaCl program.
 */
LocalReader.prototype.NaClListener = function(message_event){
	if( typeof message_event.data === 'string' ) {
		
		this.logger.log(
			T3D.Logger.TYPE_WARNING,
			"NaCl threw an error",message_event.data
		);
		return;
	}

	
	//console.log("Got back a DS from NaCl RAW", message_event.data);
	//console.log("Got back a DS from NaCl Uint32Array", new Uint32Array(message_event.data));
	var handle = message_event.data[0];

	if(this.fileListeners[handle]){
		this.fileListeners[handle].forEach(function(callback){
			var data = message_event.data;
			/// Array buffer, dxtType, imageWidth, imageHeigh			
			callback(data[1], data[2], data[3], data[4]);	
		});

		// Remove triggered listeners
		this.fileListeners[handle] = null;
	}
	
}

/**
 * Reads the main header of this dat file and calls readMFTHeader
 * in order to parse the MFT index.
 * @method readANDatHeader
 * @param  {DataStream} ds DataStream instance holding header data
 */
LocalReader.prototype.readANDatHeader = function(ds){


	/// Read file header data struct
	this.fileHeader = ds.readStruct(defANDAT);

	this.logger.log(
		T3D.Logger.TYPE_DEBUG,
		"Loaded Main .dat header", this.fileHeader
	);

	/// Get pointer to MFT chunk header
	this.fileHeader.mftOffset =  MathUtils.arr32To64(this.fileHeader.mftOffset);

	/// Load MFT
	this.loadFilePart(
		this.dat,
		this.fileHeader.mftOffset,
		this.fileHeader.mftSize,
		this.readMFTHeader );

};

/**
 * Reads the MFT header and calls readMFTIndexFile
 * in order to parse the MFT index.
 * @method readMFTHeader
 * @param  {DataStream} ds DataStream instance holding header data
 */
LocalReader.prototype.readMFTHeader = function(ds){

	/// Read MFT header data struct
	/// Global variable mft
	this.mft = ds.readStruct(defMFT);

	var entryStartPtr = ds.position;
	var numEntires = this.mft.nbOfEntries;

	/// MFT has entries with offset, size and compression flag
	/// for all files in the .dat

	/// Read all entry offsets and sizes into uint32 arrays
	this.mft.entryDict = {
		offset_0:new Uint32Array(numEntires),
		offset_1:new Uint32Array(numEntires),
		offset:new Float64Array(numEntires),
		size:new Uint32Array(numEntires),
		compressed:new Uint16Array(numEntires),
	}


	/// Read offset, size and compressed flag of the entries.
	this.logger.log(
		T3D.Logger.TYPE_DEBUG,
		"reading MFT entries"
	);
	for(var i=0; i<numEntires-1; i++){
		
		/// Read first 14 bytes
		this.mft.entryDict.offset_0[i] = ds.readUint32();
		this.mft.entryDict.offset_1[i] = ds.readUint32();
		this.mft.entryDict.size[i] = ds.readUint32();
		this.mft.entryDict.compressed[i] = ds.readUint16();


		this.mft.entryDict.offset[i] =  MathUtils.arr32To64(
			[ this.mft.entryDict.offset_0[i],
			  this.mft.entryDict.offset_1[i] ]
		);

		/// Skip 10
		ds.seek(ds.position + 10);

	}

	/// Read data pointed to by 2nd mft entry
	/// This entry maps file ID to MFT index	
	var offset = MathUtils.arr32To64(
		[ this.mft.entryDict.offset_0[1],
		  this.mft.entryDict.offset_1[1] ]
	);
	var size = this.mft.entryDict.size[1];

	this.loadFilePart(this.dat, offset, size, this.readMFTIndexFile);

};

/**
 * Reads the main MFT index file and builds MFT indices used for acceccing
 * files refered to by MFT index, File ID or Base ID.
 * @method readMFTIndexFile
 * @param  {DataStream} ds DataStream instance holding header data
 * @param  {Number} size The size of the index file
 */
LocalReader.prototype.readMFTIndexFile = function(ds, size){
	
	var length = size / 8;

	/// fileIdTable
	var ids = new Uint32Array(length);
	var mftIndices = new Uint32Array(length);

	/// m_entryToId
	var m_entryToId_baseId = new Uint32Array(length);
	var m_entryToId_fileFileId = new Uint32Array(length);

	this.mft.baseToMft = new Uint32Array(2e6);
	this.mft.fileToMft = new Uint32Array(2e6);
	
	for(var i=0; i<length; i++){
		ids[i] = ds.readUint32();
		mftIndices[i] = ds.readUint32();
	}
	
	/// Raw map of "ID" to mft index
	this.mft.id2index = {
		ids:ids,
		mftIndices:mftIndices
	}

	/// m_entryToId has both base and filed id
	for(var i=0; i<length; i++){


		if (ids[i] == 0 && mftIndices[i] == 0) {
            continue;
        }
 		
 		var entryIndex = mftIndices[i];
        var entry     = {
        	fileId : m_entryToId_fileFileId[entryIndex],
        	baseId : m_entryToId_baseId[entryIndex]
        }

        if (entry.baseId == 0) {
            entry.baseId = ids[i];            
        } else if (entry.fileId == 0) {
            entry.fileId = ids[i];
        }

        if (entry.baseId > 0 && entry.fileId > 0) {
            if (entry.baseId > entry.fileId) {
            	//std::swap(entry.baseId, entry.fileId);
            	var temp = entry.baseId;
            	entry.baseId = entry.fileId;
            	entry.fileId = temp;                
            }
        }

        this.mft.baseToMft[entry.baseId] = entryIndex;
        this.mft.fileToMft[entry.fileId] = entryIndex;

        //Write back
        m_entryToId_fileFileId[entryIndex] = entry.fileId;
        m_entryToId_baseId[entryIndex] = entry.baseId;
	}

	/// Populate global VO with finished dicts
	this.mft.m_entryToId = {
		baseId:m_entryToId_baseId,
		fileId:m_entryToId_fileFileId
	}


	this.logger.log(
		T3D.Logger.TYPE_DEBUG,
		"Finished indexing MFT ", this.mft
	);

	if(this.onFullyLoaded)
		this.onFullyLoaded();
};

/**
 * Reads the cached list of files corresponding to the reader's .dat from the localStorage.
 * @method loadFileList
 * @return {Array} Grouped List of files
 */
LocalReader.prototype.loadFileList = function(){
	var datFile = this.dat;
	var datName = "fileList_" + this.version + "." + datFile.name + "_" + datFile.lastModified + "_" + datFile.size;
	var str = localStorage.getItem(datName);
	if(!str)
		return null;
	try{
		return JSON.parse(str);	
	}
	catch(e){		
	}
	return null;	
}

/**
 * Reads the cached list of maps corresponding to the reader's .dat from the localStorage.
 * @method loadMapList
 * @return {Array} Grouped List of maps
 */
LocalReader.prototype.loadMapList = function(){
	var datFile = this.dat;
	var mapName = "mapList_" + this.version + "." + datFile.name + "_" + datFile.lastModified + "_" + datFile.size;
	var str = localStorage.getItem(mapName);
	if(!str)
		return null;
	try{
		return JSON.parse(str);	
	}
	catch(e){
		
	}
	return null;	
}

/**
 * Stores a files list array in the browser's local storage.
 * @method storeFileList
 * @param  {File} datFile  The File instance used to build the file list.
 * @param  {Object} fileList The list to store.
 */
LocalReader.prototype.storeFileList = function(datFile, fileList){
	debugger;
	var stringrep = JSON.stringify(fileList);
	var datName = "fileList_" + this.version + "." + datFile.name + "_" + datFile.lastModified + "_" + datFile.size;
	localStorage.setItem(datName, stringrep);
}


/**
 * Stores a map list array in the browser's localStorage.
 * @method storeMapList
 * @param  {File} datFile  The File instance used to build the map list.
 * @param  {Object} mapList The list to store.
 */
LocalReader.prototype.storeMapList = function(datFile, mapList){
	var mapName = "mapList_" + this.version + "." + datFile.name + "_" + datFile.lastModified + "_" + datFile.size;
	localStorage.setItem(mapName, JSON.stringify(mapList) );
}


/**
 * Reads the file type of each file in the dat and stores the resulting list in 
 * the browser's local storage.
 * @method readFileListAsync
 * @async
 * @param  {Function} callback Fired when the list is generated and stores
 *
 * First argument is the a list of mft indices grouped by file type.
 */
LocalReader.prototype.readFileListAsync = function(callback){

	var self = this;

	/// Get a list of unique indices based on file addresses
	var mftIndices = this.mft.id2index.mftIndices;
	var uniqueIdxs = MathUtils.sort_unique(mftIndices, function(a, b) {
		return self.mft.entryDict.offset[a] - self.mft.entryDict.offset[b];
	});

	/// Set total ammount of files to list
	var maxLength = uniqueIdxs.length;
	//maxLength = 1e4;

	this.logger.log(
		T3D.Logger.TYPE_DEBUG,
		"Scanning ",maxLength, "files"
	);

	/// Number of parallel event chains for file lookup
	var N = 8;

	this.listFiles(uniqueIdxs, null, 0, maxLength, N, 
		function(result){

			/// Callback for listFiles
			/// should be an object grouped by header type

			/// Clear listeners used during indexing
			self.fileListeners = [];
			
			self.storeFileList(self.dat, result);

			/// Fire callback and pass the map list
			callback(result);
		}
	);
}

/**
 * Looks up mft indices for all mapc pack files in the dat. Either looks trough all files or
 * only the list defined in {{#crossLink "T3D/MapFileList:property"}}{{/crossLink}}.
 * @method readMapListAsync
 * @async
 * @param  {boolean}   searchAll if true forces re-indexing of entire dat.
 * If false only reads indices specified in {{#crossLink "T3D/MapFileList:property"}}{{/crossLink}}.
 * @param  {Function} callback Fired when the list is generated
 *
 * First argument is the a list of mft indices grouped by file type. For exmample:
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
 */
LocalReader.prototype.readMapListAsync = function(searchAll, callback){
	var self = this;
	var datFile = this.dat;
	var mftIndices = [];

	/// Number of threads for map lookup
	var N = 8; 

	/// Time spent looking up maps
	var t = new Date().getTime();

	this.logger.log(
		T3D.Logger.TYPE_PROGRESS,
		"Finding maps (first visit only)",
		"initializing"
	)

	/// Only look for known maps
	if(!searchAll){

		MapFileList.maps.forEach(function(mapCol){
			mapCol.maps.forEach(function(mapEntry){
				var entryBaseId = mapEntry.fileName.split(".")[0];
				var mftIndex = self.getFileIndex(entryBaseId)
				mftIndices.push(mftIndex);
			});
		});
	}

	/// Look for all maps
	else{
		mftIndices = this.mft.id2index.mftIndices;
	}

	/// Get a list of unique indices based on file addresses
	var uniqueIdxs = MathUtils.sort_unique(mftIndices, function(a, b) {
		return self.mft.entryDict.offset[a] - self.mft.entryDict.offset[b];
	});

	/// Callback for map lookup
	var cb = function(result){
		var dt = new Date().getTime() - t;

		self.logger.log(
			T3D.Logger.TYPE_DEBUG,
			"Time elapsed ", Math.round(0.001*dt)," seconds"
		);

		/// Clear listeners used during indexing
		self.fileListeners = [];

		var localMapList = {maps:[]};

		/// Arrange each found map into a grouped list
		if(result.mapc){

			result.mapc.forEach(function(mftIndex){

				/// Base Id is used by gw2browser and is therefore the de facto identifier
				/// in the community. Let's use it here too!
				var baseId = self.mft.m_entryToId.baseId[mftIndex+1];

				/// Hack to avoid releasing maps newer than VB
				/*if(baseId > 11542000){
					return;
				}*/

				var name = "";
				var group = "";

				MapFileList.maps.forEach(function(mapCol){
					mapCol.maps.forEach(function(mapEntry){
						if(name.length == 0 && mapEntry.fileName.indexOf(baseId+".")>=0){
							name = mapEntry.name;
							group = mapCol.name;
						}
					});
				});

				if(name.length == 0){
					name = "Unknown map "+baseId;
				}

				if(group.length == 0){
					group = "Unknown maps";
				}

				var localGroup = null;
				localMapList.maps.forEach(function(mapCol){
					if(mapCol.name == group){
						localGroup = mapCol;
					}
				});

				if(!localGroup){
					localGroup = {name:group,maps:[]};
					localMapList.maps.push(localGroup);
				}

				localGroup.maps.push({fileName:baseId, name:name});
				
			});

		} /// end if result.mapc
				
		/// Store map list into local storage.
		self.storeMapList(datFile, localMapList);

		/// Fire callback and pass the map list
		callback(localMapList);

	}/// End of map lookup callback.


	/// Start map lookup:
	var maxLength = uniqueIdxs.length;
	this.logger.log(
		T3D.Logger.TYPE_DEBUG,
		"Scanning ",maxLength, " files for maps..."
	);
	this.listFiles(uniqueIdxs, "mapc", 0, maxLength, N, cb);
}

/**
 * Lists all MFT indices grouped by file type. If a file type is specified only files of that type
 * is added to the list.
 * 
 * @method listFiles
 * @param  {Array}   uniqueIdxs File MFT indices to look in.
 * @param  {String}  type       Pack file type or file type to accept. If not set adds all files. 
 * @param  {[type]}   start     uniqueIdxs start ofset 
 * @param  {[type]}   length    number of entries to scan in uniqueIdxs
 * @param  {[type]}   N         Number of parallel event listeners to run while scanning. (Kinda like parallelism but not quite)
 * @param  {Function} callback  Fired when all files have been indexed. First argument is a list of 
 * MFT indices grouped by file type, for example
 * 	{
 *	  	"Unknown"	: [444, 555, 333],
 *	  	"MODL"		: [444, 555, 333],
 * 	  	"String"	: [666, 777, 888]
 * 	}
 */
LocalReader.prototype.listFiles = function(uniqueIdxs, type, start, length, N ,callback){
	var self = this;
	var maxlen = start+length;
	var lastPct = 0;
	var pctM = 100.0 / Math.min(length, uniqueIdxs.length - start);
	var threadsDone = 0;

	var result = {};

	/// Fires when file has beed inflated.
	/// Pushes matching file types into the result array
	var peekCallback=function(inflatedData, i, mftIndex){
		if(!inflatedData){
			self.logger.log(
				T3D.Logger.TYPE_WARNING,
				"No infalted data for entry"
			);
			readUniqueId(i+N);
			return;
		}

		var ds = new DataStream(inflatedData);

		/// Check if this is a pack file, a texture, a string file etc
		var first4 = ds.readCString(4);
		var fileType;

		///Texture
		if( first4 == "ATEX" || first4 == "ATEC" ||
			first4 == "ATEP" || first4 == "ATET" || 
			first4 == "ATEU" || first4 == "ATTX" ){
			fileType = "Texture";
		}

		///Pack file
		else if(first4.indexOf("PF") == 0){
			var file = new GW2File(ds, 0, true);/// true for "plz no load chunkz"
			fileType = file.header.type;
		}

		///Binary
		else if(first4.indexOf("MZ") == 0){
			fileType = "Binary";
		}

		/// Strings file
		else if(first4 == "strs"){
			fileType = "String";
		}

		///Unknown
		else{
			fileType = "Unknown";
		}
		
		/// Add file to result[type] array
		/// If a type was specified in the call only allow that type to be added
		if( !type || fileType == type){
			if(!result[fileType]){
				result[fileType] = [];
			}
			result[fileType].push(mftIndex);
		}

		readUniqueId(i+N);
	}

	
	var readUniqueId = function(i){

		if(i%N==0){
			var pct = Math.min(100, Math.floor( (i-start) * pctM) );
			if(lastPct != pct){
				self.logger.log(
					T3D.Logger.TYPE_PROGRESS,
					"Find type",
					pct
				);
				lastPct = pct;
			}
		}

		if( i>=uniqueIdxs.length || i>=maxlen ){
			self.logger.log(
					T3D.Logger.TYPE_DEBUG,
					"Thread ",i%N+" done"
			);
			threadsDone++;
			if(threadsDone == N){
				callback(result);
			}
			return;
		}

		var mftIndex = uniqueIdxs[i];

		var compressed = self.mft.entryDict.compressed[mftIndex];
		if(!compressed){
			/*self.logger.log(
					T3D.Logger.TYPE_WARNING,
					"File is NOT compressed, skipping."
			);*/
			readUniqueId(i+N);
			return;
		}

		var handle = mftIndex;
		var offset = self.mft.entryDict.offset[mftIndex];
		var size =  self.mft.entryDict.size[mftIndex];

		if(size<0x20){
			/*this.logger.log(
					T3D.Logger.TYPE_WARNING,
					"File is too small, skipping."
			);*/
			readUniqueId(i+N);
			return;
		}

		/// Read .dat file part
		self.loadFilePart(self.dat, offset, Math.min(size,2000),
			function(ds, _size){
				
				///Infalte
				self.inflate(
					ds,
					_size,
					handle,
					///Infaltion  callback
					function(inflatedData){
						peekCallback(inflatedData, i, mftIndex);
					}, 
					false, 0x20
				);


		});

	}

	/// Make N calls in serial, this will however result in N
	/// Parallell processes due to callbacks..
	for(var n=0; n<N; n++){
		readUniqueId(start + n);	
	}
};

/**
 * Gets MFT index by fileId or baseId
 * @method getFileIndex
 * @param  {Number} baseOrFileId A file Id or base Id
 * @return {Number}              MFT index
 */
LocalReader.prototype.getFileIndex = function(baseOrFileId){


	var index = -1;

	/// Get by base id
	
	/*for(var i = 0; i<this.mft.m_entryToId.baseId.length; i++){
		if( this.mft.m_entryToId.baseId[i+1] == baseOrFileId ){	
			
			index = i;

			this.logger.log(
				T3D.Logger.TYPE_DEBUG,
				"Found BASE ID", baseOrFileId, " at INDEX ", i
			);

			return index;
		}
	}*/
	baseOrFileId = parseInt(baseOrFileId);
	index = this.mft.m_entryToId.baseId.indexOf(baseOrFileId);
	if(index != -1){
		return index-1;
	}
	else{
		index = this.mft.m_entryToId.fileId.indexOf(baseOrFileId);
		if(index != -1){
			return index-1;
		}
	}

	/// Get by file id
	/*if(index==-1){
		for(var i = 0; i<this.mft.m_entryToId.fileId.length; i++){
			if( this.mft.m_entryToId.fileId[i+1] == baseOrFileId ){	
				
				index = i;

				this.logger.log(
					T3D.Logger.TYPE_DEBUG,
					"Found FILE ID", baseOrFileId, " at INDEX ", i
				);

				return index;
			}
		}	
	}*/

	return index;
}

/**
 * Reads a bitmap from a texture file in the dat.
 * @method loadTextureFile
 * @async
 * @param  {Number}   baseId   Base or File id of the texture to load
 * @param  {Function} callback Fires when the inflater has read the texture data.
 * 
 * The passed arguments are 
 * -ArrayBuffer Bitmap
 * -Number DXT Type
 * -Number image width
 * -Number image height
 *
 */
LocalReader.prototype.loadTextureFile = function(baseId, callback){
	this.loadFile(baseId, callback, true);
}

/**
 * Reads data from a file in the dat.
 * @method loadFile
 * @async
 * @param  {Number}   baseId   Base or File id of the texture to load
 * @param  {Function} callback Fires when the inflater has read the data.
 *
 * The passed arguments are 
 * -ArrayBuffer raw data
 * -Number DXT Type if applicable
 * -Number image width if applicable
 * -Number image height if applicable
 *
 * 
 * @param  {boolean}  isImage  
 * @param  {[type]}   raw      If true, any infation is skipped and raw data is returned.
 */
LocalReader.prototype.loadFile = function(baseId, callback, isImage, raw){
	
	var self = this;

	var index = this.getFileIndex(baseId);
	var mftIndex = index;

	//If the file doesn't exist still make sure to fire the callback
	if(mftIndex <= 0 ){
		self.logger.log(
			T3D.Logger.TYPE_WARNING,
			"Could not find file with baseId ",baseId
		);
		callback(null);
		return;
	}

	//console.log("fetchign  baseId ",baseId);
	
	var offset = MathUtils.arr32To64(
		[ this.mft.entryDict.offset_0[mftIndex],
		  this.mft.entryDict.offset_1[mftIndex] ]
	);

	var size = this.mft.entryDict.size[mftIndex];
	//console.log("File at found index is "+ size +" bytes");
	
	var compressed = this.mft.entryDict.compressed[mftIndex];
	if(!compressed){
		self.logger.log(
			T3D.Logger.TYPE_WARNING,
			"File is NOT compressed, skipping"
		);

		callback(null);
		return;
	}

	/// Read map and pass the ds to our pNaCL inflate function
	//TODO: will this work?? Shared base id's and all that...
	var handle = index;

	this.loadFilePart(this.dat, offset, size, function(ds, size){
		
		/// If the raw param was passed return the un-inflated data
		if(raw){
			callback(ds);
		}

		/// If raw parameter was not passed or false, inflate first
		else{
			self.inflate(ds, size, handle, callback, isImage);	
		}
		
	});
};


/**
 * Infaltes binary data using a pNaCl program. If the isImage flag is set the infalted data is
 * also decoded if it contains DXT image data.
 * @method inflate
 * @param  {DataStream} ds DataStream instance holding data to inflate
 * @param  {Number}   size      Number if bytes to read
 * @param  {Number   handle    Unique ID for this file
 * @param  {Function} callback  callback to register for this pNaCl task
 * @param  {Boolean}  isImage   Passed to the inflater in order to decode image data
 * @param  {[type]}   capLength Number of bytes to deflate.
 */
LocalReader.prototype.inflate = function(ds, size, handle, callback, isImage, capLength){
	
	var arrayBuffer = ds.buffer;	

	if(!capLength){
		//capLength = arrayBuffer.byteLength;
		capLength = 1;
	}
	//console.log("Uncompressing file size ",size, "handle", handle, "cap", capLength, "isImage", isImage);
	
	if(arrayBuffer.byteLength < 12){
		this.logger.log(
			T3D.Logger.TYPE_WARNING,
			"not inflating, length is too short ("+arrayBuffer.byteLength+")", handle
		);
		callback(null);
		return;
	}
	if(handle == 123350 || handle == 123409 || handle == 123408 ){
		callback(null);
		return;
	}

	/// Register listener for file load callback
	if(this.fileListeners[handle]){
		this.fileListeners[handle].push(callback);

		///No need to make another call, just wait for callback event to fire.
		return;
	}
	else{
		this.fileListeners[handle] = [callback];	
	}
	
    
    /// Call pNaCl component with the handle and arrayBuffer as an arguments

    //console.log("posting",[handle,arrayBuffer,isImage===true])
	this.NaClInflater.postMessage([handle,arrayBuffer,isImage===true, capLength]);
};

/**
 * Reads bytes from a big file. Uses offset and length (in bytes) in order to only load
 * parts of the file that are used.
 * @method loadFilePart
 * @async
 * @param  {File}   file     File object to read from
 * @param  {[type]}   offset   Offset in bytes to start reading
 * @param  {[type]}   length   Number of bytes to read
 * @param  {Function} callback Two arguments are passed. 
 *
 * The first is a DataStream object representation of the loaded data.
 *
 * The second is the length of the data.
 */
LocalReader.prototype.loadFilePart = function(file, offset, length, callback){
	var self = this;

	var reader = new FileReader();
		
	reader.onerror = function(fileEvent){
		debugger;
	}
	reader.onload  = function(fileEvent){

		var buffer = fileEvent.target.result;
		var ds = new DataStream(buffer);
	  	ds.endianness = DataStream.LITTLE_ENDIAN;

	  	/// Pass data stream and data length to callback function, keeping "this" scope
	  	callback.call(self, ds, length);
	}
	
  	var start = offset;
	var end = start + length;
	reader.readAsArrayBuffer(file.slice(start, end));
};

module.exports = LocalReader;