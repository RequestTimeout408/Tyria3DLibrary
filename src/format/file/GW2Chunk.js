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

var HEAD_STRUCT = [
	'type', 'cstring:4',
	'chunkDataSize', 'uint32',
	'chunkVersion', 'uint16',
	'chunkHeaderSize', 'uint16',
	'offsetTableOffset', 'uint32',
];


/**
 * Settings for resolving conflicting chunk names in different files.
 * @private 
 * @property DUPLICATE_SETTINGS
 * @type {Object}
 */
var DUPLICATE_SETTINGS = {
	'ANIM':['MODL','Unknown'],

	'GAME':['MODL','Unknown'],

	'Main':['cntc','mMet'],

	'SKEL':['MODL','Unknown'],

	'TOOL':['AMAT','MODL'],

	'main':['Unknown','Unknown','cmaC'],

	'nvms':['Unknown','Unknown']
};
/*
	ANIM, GAME, SKEL needs to know file name for scenefile...

	ANIM: 2
		ModelFileAnimationV25		MODL
		SceneFileAnimationV2		?

	GAME: 2
		ModelFileGame				MODL ???
		SceneFileGameV6				?

	Main: 2
		PackContent					cntc
		PackMapMetadata				mMet

	SKEL: 2
		ModelFileSkeletonV1			MODL
		SceneFileSkeletonV3			?

	TOOL: 2
		AmatToolParams				AMAT ???
		ModelFileToolV16			MODL ???

	main: 3
		CollideNavMesh
		CollideNavMeshChunk
		CollideModelManifest		cmaC

	nvms: 2
		PackMapNavMeshV2
		PackMapNavMeshChunkV2
*/

   



/**
 * Basic chunk parsing functionality for Guild Wars 2 file chunks
 * @class GW2Chunk
 * @constructor
 * @param {DataStream} ds A DataStream containing deflated chunk binary data.
 * @param {Number} addr Offset of chunk start within the DataStream
 */
var Chunk = function(ds, addr){

	/**
	 * @property {DataStream} ds The DataStream data source used by this chunk.
	 */
	this.ds = ds;

	/**
	 * @property {Number} addr The address to this Chunk within ds.
	 */
	this.addr = addr;

	/**
	 * @property {Object} data The typed data read from the body of this chunk.
	 */
	this.data = null;


	/**
	 * @property {Number} headerLength The length in bytes of the chunk header.
	 */
	this.headerLength  = NaN;

	/**
	 * @property {Object} header Chunk header data.
	 */
	this.loadHead();
};

/**
 * Parses the chunk header data, populating the header property.
 * @method loadHead
 */
Chunk.prototype.loadHead=function(){
	this.ds.seek(this.addr);	
	this.header = this.ds.readStruct(HEAD_STRUCT);

	this.headerLength = this.ds.position - this.addr;
};

/**
 * @method  getDefinition
 * @param  {String} fileType The main type of the pack file containing this chunk.
 * Used for resolving chunk naming conflicts between pack file types.
 * @return {Array}	DataStream formatted array describing the data
 * sctructures of this chunk
 */
Chunk.prototype.getDefinition=function(fileType){

	/// Normally we're looking for the 0th occurance
	/// But some chunk names occur multiple times and we're interrested
	/// in the N:th occurance of the definition.
	/// 
	/// I've no idea how this is automated, for now just use the 
	/// settings object I've put together from experience.
	var useNthIndex = 0;

	/// If this chunk has multiple definitions
	/// get to know what def to use...
	var fileTypes = DUPLICATE_SETTINGS[this.header.type];
	if(fileTypes){

		useNthIndex = -1;

		/// Check what file name entry matches this file name
		for(var i=0; i<fileTypes.length && useNthIndex == -1; i++){
			var ft = fileTypes[i];


			if(ft == fileType){
				useNthIndex = i;
			}
		}

		/// We didnt find this file name!
		/// TODO: if you get this error, please update the DUPLICATE_SETTINGS above
		if(useNthIndex == -1){
			debugger;
		}
	}

	var defsFound = 0;
	for(var i=0; i<T3D.formats.length; i++){
		var f = T3D.formats[i];
		
		/// Chunk name needs to match
		if(	f.name == this.header.type ){

			/// There needs to be a chunk def version matching the one specifiend 
			/// 
			/// AND If this is the Nth occurance of the chunk definition
			/// and we're looking for the Nth occurance, return it.
			/// 
			/// chunkVersion in the dat uses 0 indexing
			if( defsFound == useNthIndex && f.versions[this.header.chunkVersion] ){
				return ( new f.versions[this.header.chunkVersion]() ).__root;	
			}

			defsFound++;
		}
	}
	

};

/**
 * Parses the chunk main data, populating the data property.
 * @method loadData
 * @param  {String} fileType The main type of the pack file containing this chunk.
 * Used for resolving chunk naming conflicts between pack file types when
 * looking up the structure definition for this chunk.
 */
Chunk.prototype.loadData=function(fileType){

	var def = this.getDefinition(fileType);
	
	if(def){
		this.ds.seek(this.addr + this.headerLength);
		this.data =  this.ds.readStruct(def);
	}

	else{
		T3D.Logger.log(T3D.Logger.TYPE_WARNING,
			"Could not find a definition for chunk",
			this.header.type,
			"version", this.header.chunkVersion,
			"file name", fileType);
	}
	
};

/**
 * Retrieves the next chunk is the datastream. In practice this means the next chunk
 * within the same pack file.
 * @method next
 * @return {GW2Chunk} The next chunk if any, otherwise null.
 */
Chunk.prototype.next = function(){
	try{
		
		// Calculate actual data size, as mChunkDataSize
		// does not count the size of some header variables
		return new Chunk(this.ds,this.addr + 8 + this.header.chunkDataSize);
	}
	catch(e){
		/// Out of bounds probably		
	}
	return null;
};

module.exports = Chunk;