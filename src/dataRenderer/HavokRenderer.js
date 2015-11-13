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

var DataRenderer = require('./DataRenderer');

/**
 *
 * A renderer that generates meshes describing the collisions of a map.
 * 
 * @class HavokRenderer
 * @constructor
 * @extends DataRenderer
 * @param  {LocalReader} localReader  The LocalReader instance to read data from.
 * @param  {Object} settings     Any settings used by this renderer.
 * *Must* specify "mapFile", a GW2File. If "visible" is specified and true, the generated meshes will be textured
 * with a MeshNormalMaterial, otherwise they will not be visible.
 * @param  {Object} context      Shared value object between renderers.
 * @param  {Logger} logger       The logging class to use for progress, warnings, errors et cetera.
 */
function HavokRenderer(localReader, settings, context, logger){
	DataRenderer.call(this, localReader, settings, context, logger);

	this.mapFile = this.settings.mapFile;

	this.lastP = -1;
	this.seed = 1;
	this.meshes = [];

	/**
	 * TODO
	 * @method renderModels
	 * @param  {Function} callback         [description]
	 * @async
	 */
	this.renderModels = function(models, title, callback){
		var mat;
		if(this.settings && this.settings.visible){
			mat = new THREE.MeshNormalMaterial( { side: THREE.DoubleSide } ); 
		}
		else{
			mat = new THREE.MeshBasicMaterial( { visible: false } );			
		}

		this.parseAllModels(models, mat, title, 200, 0, callback);
	}


	/**
	 * TODO
	 * @method  getCollisionsForAnimation
	 * @param  {[type]} animation  [description]
	 * @param  {[type]} collisions [description]
	 * @return {[type]}            [description]
	 */
	this.getCollisionsForAnimation = function(animation, collisions){
		var ret = [];
		
		for (var i = 0; i < animation.collisionIndices.length; i++) {
			var index = animation.collisionIndices[i];
			var collision = collisions[ index ];
			collision.index = index;
			ret.push( collision );
		}
		
		return ret;
	};

	/**
	 * TODO
	 * @method  parseAllModels description
	 * @param  {[type]} models       [description]
	 * @param  {[type]} mat       [description]
	 * @param  {[type]} title     [description]
	 * @param  {[type]} chunkSize [description]
	 * @param  {[type]} offset    [description]
	 * @return {[type]} callback          [description]
	 * @async
	 */
	this.parseAllModels = function(models, mat, title, chunkSize, offset, callback){
		var i = offset;		

		for(; i < offset+chunkSize && i < models.length; i++){
			
			var p = Math.round(i*100/ models.length );
			if( p != this.lastP){

				this.logger.log(
					T3D.Logger.TYPE_PROGRESS,
					"Loading Collision Models ("+title+")",
					p
				);
				this.lastP = p;
			}	
		
			/// Get animation object
			var animation =  this.animationFromGeomIndex(
				models[i].geometryIndex,
				this.geometries,
				this.animations
			);
			
			var collisions = this.getCollisionsForAnimation( animation, this.havokChunkData.collisions);
			
			for(var j=0; j< collisions.length; j++){
				var collision = collisions[j];			
		 		this.renderMesh( collision, models[i], mat );
			}
		}

		if(i<models.length){
			window.setTimeout(
				this.parseAllModels.bind(this, models, mat, title, chunkSize, offset+chunkSize, callback),
				10 /*time in ms to next call*/
			);
		}
		else{
			callback();
		}
	}

	/**
	 * TODO
	 * @method  animationFromGeomIndex
	 * @param  {[type]} propGeomIndex [description]
	 * @param  {[type]} geometries    [description]
	 * @param  {[type]} animations    [description]
	 * @return {[type]}               [description]
	 */
	this.animationFromGeomIndex = function(propGeomIndex, geometries, animations){
		
		// geometries is just list of all geometries.animations[end] for now
		var l = geometries[propGeomIndex].animations.length;
		
		return animations[ geometries[propGeomIndex].animations[l-1] ];
		//return animations[ geometries[propGeomIndex].animations[0] ];
	};

	/**
	 * TODO
	 * @method renderMesh
	 * @param  {[type]} collision [description]
	 * @param  {[type]} model     [description]
	 * @param  {[type]} mat       [description]
	 * @return {[type]}           [description]
	 */
	this.renderMesh = function( collision, model, mat ){
	    
	    var pos = model.translate;
	    var rot = model.rotate;
	    var scale = 32 * model.scale;    
	    
	    /// Generate mesh
	    var mesh = this.parseHavokMesh(collision, mat);
	    
	    /// Position mesh
	    /// "x","float32","z","float32","y","float32"
	    mesh.position.set(pos[0], -pos[2], -pos[1]);    
	    
	    /// Scale mesh
	    if(scale)
	    	mesh.scale.set( scale, scale, scale );

	    /// Rotate mesh
	    if(rot){
	    	mesh.rotation.order = "ZXY";

	    	// ["x","float32","z","float32","y","float32"], 
	    	mesh.rotation.set(rot[0], -rot[2], -rot[1]);
	    }
	    	
		/// Add mesh to scene and collisions
		this.getOutput().meshes.push(mesh);
	};


	/**
	 * TODO
	 * @method  seedRandom
	 * @return {[type]} [description]
	 */
	this.seedRandom = function(){
	    var x = Math.sin(this.seed++) * 10000;
	    return x - Math.floor(x);
	};

	/**
	 * TODO
	 * @method  parseHavokMesh
	 * @param  {[type]} collision [description]
	 * @param  {[type]} mat       [description]
	 * @return {[type]}           [description]
	 */
	this.parseHavokMesh = function(collision, mat){
		
		var index = collision.index;

		if(!this.meshes[index]){

			var geom = new THREE.Geometry();
			
			/// Pass vertices	    		
			for(var i=0; i<collision.vertices.length; i++){
				var v=collision.vertices[i];
				//"x","float32","z","float32","y","float32"]
				geom.vertices.push( new THREE.Vector3(v[0] , v[2] , -v[1] ) );
			}	    		
				
			/// Pass faces
			for(var i=0; i<collision.indices.length; i+=3){

				var f1=collision.indices[i];
				var f2=collision.indices[i+1];
				var f3=collision.indices[i+2];

				if( f1<=collision.vertices.length &&
					f2<=collision.vertices.length &&
					f3<=collision.vertices.length){
					geom.faces.push( new THREE.Face3( f1, f2, f3 ) );
				}
	   			else{
	   				this.logger.log(
	   					T3D.Logger.TYPE_ERROR,
	   					"Errorus index in havok model geometry."
   					);
	   			}
			}

			/// Prepare geometry and pass new mesh
			geom.computeFaceNormals();
			//geom.computeVertexNormals();
			
			this.meshes[index]= new THREE.Mesh( geom, mat ); 
			
			return this.meshes[index];
		}
		else{
			return this.meshes[index].clone();
		}
	};

};


/// DataRenderer inheritance:
HavokRenderer.prototype = Object.create(DataRenderer.prototype);
HavokRenderer.prototype.constructor = HavokRenderer;

/**
 * Output fileds generated:
 *
 * - *boundingBox* Array of values describing the bounding box of all collision.
 * - *meshes* An array of THREE.Mesh objects visualizing all collision in the map.
 * 
 * @method  renderAsync
 * @async
 * @param  {Function} callback Fires when renderer is finished, does not take arguments.
 */
HavokRenderer.prototype.renderAsync = function(callback){
	var self = this;

	// TODO:The design of this method pretty much requires one instance
	// of the class per parallel async render. Should probably fix this
	// at some point...
	
	/// Get required chunks
	this.havokChunkData = this.mapFile.getChunk("havk").data;

    /// Set static bounds to the bounds of the havk models
    this.getOutput().boundingBox = this.havokChunkData.boundsMax;
	
	/// Clear old meshes
	this.meshes = [];

	/// Set up output array
	this.getOutput().meshes = [];

	/// Grab model raw data from the chunk.
	/// Add missing scale value to obs models.
	var propModels = this.havokChunkData.propModels;
	var zoneModels = this.havokChunkData.zoneModels;
	var obsModels = this.havokChunkData.obsModels;
	obsModels.forEach(function(mdl){
		mdl.scale = 1;
	});

	/// Store geoms and animations from the file in hte instance so we don't
	/// have to pass them arround too much. (fix this later)
	this.geometries = this.havokChunkData.geometries;
	this.animations = this.havokChunkData.animations;		
	
	/// Render "prop", "zone" and "obs" models in that order.
	var renderPropModelsCB = function(){
		self.renderModels(zoneModels, "zone", renderZoneModelsCB);
	};
	var renderZoneModelsCB = function(){
		self.renderModels(obsModels, "obs", callback);
	};
	self.renderModels(propModels, "prop", renderPropModelsCB);

	
}

module.exports = HavokRenderer;