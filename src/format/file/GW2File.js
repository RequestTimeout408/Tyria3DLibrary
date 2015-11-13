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

var Chunk = require('./GW2Chunk');

var HEAD_STRUCT = [
	'identifier', 'cstring:2',
	'unknownField1', 'uint16',
	'unknownField2', 'uint16',
	'pkFileVersion', 'uint16',
	'type', 'cstring:4'
];


/**
 * Basic header and chunk parsing functionality for Guild Wars 2 pack files (PF)
 * @class GW2File
 * @constructor
 * @param {DataStream} ds A DataStream containing deflated file binary data.
 * @param {Number} addr Offset of file start within the DataStream
 * @param {boolean} noChunks If true, the file does not parse its
 * chunks on creation.
 */
var File = function(ds, addr, noChunks){

	/**
	 * @property {DataStream} ds The DataStream data source used by this file.
	 */
	this.ds = ds;

	/**
	 * @property {Number} addr The address to this File within ds.
	 */
	this.addr = addr;

	/// Not used anymore I think
	this.data = null;

	/**
	 * @property {Number} headerLength The length in bytes of the file header.
	 */
	this.headerLength  = NaN;

	/**
	 * All {{#crossLink "GW2Chunk"}}chunks{{/crossLink}} contained in the file.
	 *
	 * @property chunks
	 * @type GW2Chunk[]
	 */
	this.chunks = [];
	

	/**
	 * @property {Object} header Chunk header data.
	 */
	this.readHead();
	
	if(!noChunks){
		this.readChunks();
	}
};


/**
 * Parses the file header data, populating the header property.
 * @method readHead
 */
File.prototype.readHead = function(){
	this.ds.seek(this.addr);
	this.header = this.ds.readStruct(HEAD_STRUCT);
	this.headerLength = this.ds.position - this.addr;
};

/**
 * Parses the file headers and populates the chunks property.
 * @method readChunks
 */
File.prototype.readChunks = function(){

	/// Reset chunks
	this.chunks = [];

	//var structs = this.getChunkStructs && this.getChunkStructs();

	/// Load basic Chunk in order to read the chunk header.
	var ch = new Chunk(this.ds, this.headerLength + this.addr);	

    //while(structs && ch!=null && ch.header.type){
    while(ch!=null && ch.header.type){

    	/// Load data and pass file type if we need to determine what chunk entry to use
    	/// (Some chunks in different files share the same chunk name)
		ch.loadData(this.header.type);
	    this.chunks.push(ch);

    	/// Load next basic Chunk in order to read the chunk header.
    	ch = ch.next();
    }
};


/**
 * Get a GW2Chunk from this file
 * @method getChunk
 * @param  {String} type The name, or type of the desired chunk.
 * @return {GW2Chunk} The first GW2Chunk in this file matching the type name, or null if no matching GW2Chunk was found.
 */
File.prototype.getChunk = function (type){
	for(var i=0; i<this.chunks.length; i++){
		if( this.chunks[i].header.type.toLowerCase() == type.toLowerCase() )
			return this.chunks[i]; 
	}
	return null;
};

/**
 * Provides a list of known header types and their parsing structure. Should be defined by each file type individually.
 * @method getChunkStructs
 * @return {Object} An object mapping chunk identifiers to DataStream structure descriptors.
 */
File.prototype.getChunkStructs = function(){
	return {}
};

module.exports = File;