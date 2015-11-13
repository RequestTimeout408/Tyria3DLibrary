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

var Utils = require("../util/RenderUtils");
var DataRenderer = require('./DataRenderer');

/**
 *
 * A renderer that generates zone models for a map.
 * 
 * @class ZoneRenderer
 * @constructor
 * @extends DataRenderer
 * @param  {LocalReader} localReader  The LocalReader instance to read data from.
 * @param  {Object} settings     Any settings used by this renderer.
 * *Must* specify "mapFile", a GW2File.
 * @param  {Object} context      Shared value object between renderers.
 * @param  {Logger} logger       The logging class to use for progress, warnings, errors et cetera.
 */
function ZoneRenderer(localReader, settings, context, logger){
	DataRenderer.call(this, localReader, settings, context, logger);
	this.mapFile = this.settings.mapFile;

	/**
	 * TODO
	 * @method  renderZone
	 * @param  {[type]} zone               [description]
	 * @param  {[type]} zoneDefs           [description]
	 * @param  {[type]} mapRect            [description]
	 * @param  {[type]} renderZoneCallback [description]
	 * @return {[type]}                    [description]
	 */
	this.renderZone = function(zone, zoneDefs, mapRect, renderZoneCallback){
		var self = this;

		/// Get Zone Definition
		var zoneDef = null;
		zoneDefs.forEach(function(zd){
			if(!zoneDef && zd.token == zone.defToken)
				zoneDef = zd;
		});

		/// Create array of all models to add:
		var models = [];
		var modelGroups = this.getModelGroups(zone, zoneDef, mapRect);

		/// Create empty mesh cache
		self.meshCache = {};
		self.textureCache = {};

		/*
		 * ---Keeping this out of the doc for now---
		 * Steps trough each model and renders it to the scene, allowing for efficient caching.
		 * @param  {Number} i - Current index within the models array
		 */
		//var lastPct = -1;
		var groupKeys = Object.keys(modelGroups);
		function stepModels(i){

			/*var pct = Math.round(100.0*i / groupKeys.length);
			if(lastPct!=pct){
				console.log("Rendering ZONE models "+pct);
				lastPct = pct;
			}*/

			if(i>=groupKeys.length){

				/// Empty mesh cache
				self.meshCache = {};
				self.textureCache = {};

				/// Tell caller this zone is done loading
				renderZoneCallback();
				return;
			}

			/// Read model at index
			/// var model = models[i];
			var key = groupKeys[i]; /// key is model filename
			var group = modelGroups[key];

			var meshGroups = [];
			
			/// Get model just once for this group
			var showUnmaterialed = false;
			Utils.getMeshesForFilename(key, null, self.localReader, self.meshCache, self.textureCache, showUnmaterialed,

				function(meshes, isCached){
					
					/// If there were meshes, add them to the scene with correct scaling rotation etc.
					if(meshes /* && meshes.length == 3*/){

						/// Add one copy per model instance
						/// TODO: add rotation!
						/// TODO: fine tune position?
						/// TODO: POTIMIZE!
						

						group.forEach(function(model, instanceIdx){

							var isCached = true;
							var scale = 1.0;

							/// For each Mesh in the model
							meshes.forEach(function(mesh, meshIdx){

								if(mesh.materialFlags == 525 /* || mesh.materialFlags == 520 || mesh.materialFlags == 521*/ ){
									//console.log("Skipping lod");
									return;
								}


								

								var move = {x:0,y:0,z:0};

							 	/// Add to big mesh
							 	if(!meshGroups[meshIdx]){
							 		var mg = mesh.geometry.clone();
							 		var mga = mg.attributes;
							 		meshGroups[meshIdx] = {
							 			readVerts : mga.position.array,
							 			verts: new Float32Array( group.length * mga.position.array.length ),

							 			readIndices : mga.index.array,
							 			indices: new Uint32Array( group.length * mga.index.array.length ),

							 			readUVs : mga.uv.array,
							 			uvs: new Float32Array( group.length * mga.uv.array.length ),

							 			readNormals : mga.normal.array,
							 			normals: new Float32Array( group.length * mga.normal.array.length ),

							 			material:mesh.material,
							 			//material:new THREE.MeshBasicMaterial( {color: 0xffcccc, wireframe:true} ),
							 			/*material : new THREE.PointCloudMaterial ({
									      color: 0xFF0000,
									      size: 20
									    }),*/
							 			position:{x:model.x, y:model.y, z:model.z}
							 		}
							 	}
							 	else{
							 		/// Translate
						 			move.x = model.x - meshGroups[meshIdx].position.x;
						 			move.y = model.z - meshGroups[meshIdx].position.z;
						 			move.z = model.y - meshGroups[meshIdx].position.y;
							 	}

							 	/// Add geom verts
							 	var readVerts = meshGroups[meshIdx].readVerts;
							 	var writeVerts = meshGroups[meshIdx].verts;
							 	var stride = readVerts.length;

							 	for ( var i = 0, j = instanceIdx * stride; i < stride; i +=3, j +=3 ) {
									writeVerts[ j + 0 ] = readVerts[ i + 0 ] + move.x;
									writeVerts[ j + 1 ] = readVerts[ i + 1 ] + move.y;
									writeVerts[ j + 2 ] = readVerts[ i + 2 ] + move.z;
								}

								var readIndices = meshGroups[meshIdx].readIndices;
							 	var writeIndices = meshGroups[meshIdx].indices;
							 	var strideIndices = readIndices.length;
							 	var shift = stride * instanceIdx  / 3;

								for ( var i = 0, j = instanceIdx * strideIndices; i < strideIndices; i ++, j ++ ) {
									writeIndices[ j ] = readIndices[ i ] + shift;
								}


								var readUVs = meshGroups[meshIdx].readUVs;
								var writeUvs = meshGroups[meshIdx].uvs;
								var uvStride = readUVs.length;
								for ( var i = 0, j = instanceIdx * uvStride; i < uvStride; i ++, j ++ ) {
									writeUvs[ j ] = readUVs[ i ];
								}

								var readNormals = meshGroups[meshIdx].readNormals;
								var writeNormals = meshGroups[meshIdx].normals;
								var normalStride = readNormals.length;
								for ( var i = 0, j = instanceIdx * normalStride; i < normalStride; i ++, j ++ ) {
									writeNormals[ j ] = readNormals[ i ];
								}
								

							});

						});// End for each model in group
						
					}/// End if meshes

					/// Add each cluster of merged meshes to scene
					meshGroups.forEach(function(meshGroup){

						var mergedGeom = new THREE.BufferGeometry();
						
						mergedGeom.addAttribute( 'position', new THREE.BufferAttribute( meshGroup.verts, 3 ) );
						mergedGeom.addAttribute( 'index', new THREE.BufferAttribute( meshGroup.indices, 1) );
						mergedGeom.addAttribute( 'normal', new THREE.BufferAttribute( meshGroup.normals, 3 ) );
						mergedGeom.addAttribute( 'uv', new THREE.BufferAttribute( meshGroup.uvs, 2) );

						mergedGeom.buffersNeedUpdate = true;

						mesh = new THREE.Mesh( mergedGeom, meshGroup.material );
						mesh.position.set(meshGroup.position.x, meshGroup.position.z, meshGroup.position.y);

						self.getOutput().meshes.push(mesh);

					});// End for each meshgroup


					/// Rendering is done, render next.
					stepModels(i+1);
				}

			);
			
			
			
			
		}/// End function stepModels

		/// Begin stepping trough the models, rendering them.
		stepModels(0);
	}


	/**
	 * TODO
	 * @method  getModelGroups
	 * @param  {[type]} zone    [description]
	 * @param  {[type]} zoneDef [description]
	 * @param  {[type]} mapRect [description]
	 * @return {[type]}         [description]
	 */
	this.getModelGroups = function(zone, zoneDef, mapRect){

		/// Calculate rect in global coordinates
		var zPos = zone.zPos;

		var mapX = mapRect[0];
		var mapY = mapRect[1];
		var c  = 32+16;

		// ["x1","uint32","y1","uint32","x2","uint32", "y2", "uint32"]
		var zoneRect = {
			x1:zone.vertRect[0]*c+mapX,
			x2:zone.vertRect[2]*c+mapX,
			y1:zone.vertRect[1]*-c-mapY,
			y2:zone.vertRect[3]*-c-mapY
		};	

		

		/// Zone width and depth in local corrdinates
		/*var zdx = zone.vertRect.x1-zone.vertRect.x2;
		var zdy = zone.vertRect.y1-zone.vertRect.y2;*/
		
		/// These zones seems to overflow :/
		if(zone.encodeData.length == 0){
			return {};
		}
		
		//console.log("Get mdl groups", zone);
		/// Testing: Render Zone Vert Rect
		//Utils.renderRect(zoneRect, -zPos);

		var zdx = zone.vertRect[0]-zone.vertRect[2];
		var zdy = zone.vertRect[1]-zone.vertRect[3];

		/// Zone Flags increases a linear position, used to step trough the Zone.
		var linearPos = 0;

		var modelGroups = {};

		var terrainTiles = this.getOutput(T3D.TerrainRenderer).terrainTiles;

		for(var i = 0; i< zone.flags.length; i+=2){

			/// Step forward
			linearPos += zone.flags[i];

			/// Check if a model should be placed
			var flag = zone.flags[i+1];
			if(flag!=0){
				
				/// Extract flag data
				/// Layer is written in the last 4 bytes
				var zoneDefLayer = flag >> 4;

				/// Get Zone Definition Layer
				var layer = zoneDef.layerDefArray[zoneDefLayer-1];

				/// TESTING Only show layers with height >= 3
				if(layer/* && layer.height >= 0*/){

					/// Get X and Y from linear position
					var modelX = (linearPos % zdx)*c + zoneRect.x1;
					var modelY = Math.floor(linearPos / zdx)*c + zoneRect.y1;

					/// Get Z from intersection with terrain
					var modelZ = null;

					var startZ = 100000;

					var raycaster = new THREE.Raycaster(
						new THREE.Vector3(modelX, startZ, modelY),
						new THREE.Vector3(0, -1, 0)
					);

					/// TODO: OPT?
					terrainTiles.forEach(function(chunk){
						if(modelZ === null){
							var intersections = raycaster.intersectObject(chunk);
							if(intersections.length>0){
								modelZ = startZ - intersections[0].distance;
							}
						}
					});

					/// Get model id
					/// TODO: check with modelIdx = flag & 0xf;
					var modelIdx = 0; 
					var model = layer.modelArray[modelIdx];
					var modelFilename = model.filename;
					var zOffsets = model.zOffsets;

					var layerFlags = layer.layerFlags; //NOrmaly 128, 128
					
					//TODO: flip z,y?
					var rotRangeX = layer.rotRangeX;//max min
					var rotRangeY = layer.rotRangeY;//max min
					var rotRangeZ = layer.rotRangeZ;//max min
					var scaleRange = layer.scaleRange;//max min
					var fadeRange = layer.fadeRange;//max min

					//Unused
					//tiling: 3
					//type: 1
					//width: 2
					//radiusGround: 2

					/// Create modelGroup (this zone only)
					if(!modelGroups[modelFilename]){
						modelGroups[modelFilename] = [];
					}

					/// Add entry to model group
					modelGroups[modelFilename].push({
						x:modelX,
						y:modelY,
						z:modelZ,
						rotRangeX:rotRangeX,
						rotRangeY:rotRangeY,
						rotRangeZ:rotRangeZ,
						scaleRange:scaleRange,
						fadeRange:fadeRange

					});
					

				}/// End if layer

				
			}/// End if flag != 0

		} /// End for each flag

		return modelGroups;
	}
}

/// NOT USED??
function addZoneMeshesToScene(meshes, isCached, position, scale, rotation){
	
	/// Called for each mesh in the zone
	/// TODO: Opt opt opt...

    meshes.forEach(function(mesh){

    	/// Create new mesh if we got back a cached original.
		if(isCached)
			mesh = new THREE.Mesh( mesh.geometry, mesh.material );

    	/// Scale, position and rotate.
    	mesh.scale.set( scale, scale, scale );
    	if(rotation){
	    	mesh.rotation.order = "ZXY";
	    	mesh.rotation.set(rotation.x, rotation.y, rotation.z);
	    }
    	mesh.position.set(position.x, position.y, position.z);

    	/// Add to export
    	this.getOutput().meshes.push(mesh);
	});

}


/// DataRenderer inheritance:
ZoneRenderer.prototype = Object.create(DataRenderer.prototype);
ZoneRenderer.prototype.constructor = ZoneRenderer;

/**
 * Renders all zone meshes in a GW2 map described by the map's "zon2" chunk.
 * Output fileds generated:
 *
 * - *meshes* An array of THREE.Mesh objects visualizing all zone models refered by this map.
 * 
 * @method  renderAsync
 * @async
 * @param  {Function} callback Fires when renderer is finished, does not take arguments.
 */
ZoneRenderer.prototype.renderAsync = function(callback){
	var self = this;

	/// Set up output array
	self.getOutput().meshes = [];
	
	var zoneChunkData = this.mapFile.getChunk("zon2").data;
	var parameterChunkData = this.mapFile.getChunk("parm").data;
	var terrainChunkData = this.mapFile.getChunk("trn").data;
	var mapRect = parameterChunkData.rect;
				
	/// Zone data
	var zones = zoneChunkData.zoneArray;
	var zoneDefs = zoneChunkData.zoneDefArray;

	/// Render each zone
	lastPct = -1;		

	/// Main render loop, render each zone
	function stepZone(i){

		var pct = Math.round(100.0*i / zones.length);
		if(lastPct!=pct){
			self.logger.log(
				T3D.Logger.TYPE_PROGRESS,
				"Loading 3D Models (Zone)", pct
			);
			lastPct = pct;
		}

		if(i >= zones.length){
			callback();
			return;
		}

		/// Main zone render function call
		self.renderZone(zones[i], zoneDefs, mapRect,
			stepZone.bind(self,i+1)
		);	

	}

	stepZone(0);
}

module.exports = ZoneRenderer;

//// Not used: zone defintion per chunk data "images" 32*32 points
/*
//Total map dx and dy
var d = terrainChunkHeader.data;
var pd = parameterChunkHeader.data;
var dx = (pd.rect.x2-pd.rect.x1);
var dy = (pd.rect.y2-pd.rect.y1);

//Each chunk dx and dy

var c =1;
var cdx = c*dx/d.dims.dim1;

var cdy = c*dy/d.dims.dim2;

var cdx = dx/(d.numChunksD_1*2);
var cdy =dy/(d.numChunksD_2*2);


for(var i=0; i<zoneDefs.length; i++){
	var zoneDef = zoneDefs[i];
	
	//TODO: opt!
	zoneDef.layerDefs.forEach(function(layer){

		layer.modelArray.forEach(function(model){
		
			
		});
		

	});

	var chunkMat = new THREE.MeshBasicMaterial(
		{
			color: 0x00ff00,
			wireframe:true,
		 	opacity: 1.0,
		}
	);

	//TODO: opt!
	
	if(
		zoneDef.token == 597  ||
		zoneDef.token == 1369  ||
		zoneDef.token == 903  
	){

		zoneDef.pageTable.pageArray.forEach(function(page){
			var flags = page.flags;
			var coord = page.chunkCoord;


			//Hightlight this coord
			var rect = {};

			
			//var globalOffsetX = pd.rect.x2 - cdx;
			var globalOffsetX = pd.rect.x1 + cdx/2;
			var chunkOffsetX = coord[0] * cdx;

			rect.x1  = globalOffsetX + chunkOffsetX;

			///Adjust for odd / even number of chunks
			if(d.numChunksD_2 % 2 == 0){
				
				var globalOffsetY = -pd.rect.y1;
				var chunkOffsetY = -coord[1] * cdy;

				rect.y1  =  chunkOffsetY + globalOffsetY;
			}
			else{

				var globalOffsetY =  -pd.rect.y1;
				var chunkOffsetY = -coord[1] * cdy;

				rect.y1 = globalOffsetY +  chunkOffsetY;	
			}

			rect.x2 = rect.x1+cdx;
			rect.y2 = rect.y1+cdy;


			

			Utils.renderRect(rect, 4000,chunkMat, 4000);

			//for(var j=0; j<flags.length; j++){
			//	if(flags[j]>0){
			//		console.log("Found flag",flags[j],"@ zoneDef",zoneDef.token,"coord",coord,"index",j);
			//	}
			//}
		});

	}

}*/