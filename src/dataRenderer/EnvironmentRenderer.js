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
 * A renderer that generates some of the environment objects of a map.
 * 
 * @class EnvironmentRenderer
 * @constructor
 * @extends DataRenderer
 * @param  {LocalReader} localReader  The LocalReader instance to read data from.
 * @param  {Object} settings     Any settings used by this renderer.
 * *Must* specify "mapFile", a GW2File.
 * @param  {Object} context      Shared value object between renderers.
 * @param  {Logger} logger       The logging class to use for progress, warnings, errors et cetera.
 */
function EnvironmentRenderer(localReader, settings, context, logger){
	DataRenderer.call(this, localReader, settings, context, logger);

	this.mapFile = this.settings.mapFile;

	this.getMat = function(tex){
		return new THREE.MeshBasicMaterial({
			map: tex,
			side: THREE.BackSide,
			fog: false,
			depthWrite: false
		});
	};

	this.loadTextureWithFallback = function(targetMatIndices, materialArray, filename, fallbackFilename, hazeColorAsInt){
		var self = this;
		
		function writeMat(mat){
			targetMatIndices.forEach(function(i){
				materialArray[i] = mat; 
			});
		}

		function loadFallback(){
			var mat = self.getMat(
				THREE.ImageUtils.loadTexture(fallbackFilename)
			);

			writeMat(mat);
		}

		function errorCallback(){
			setTimeout(loadFallback, 1);
		}

		var mat = self.getMat(
			Utils.loadLocalTexture(
				localReader,
				filename,
				null, hazeColorAsInt,
				errorCallback )
		);

		writeMat(mat);			
	}

	this.getHazeColor = function(environmentChunkData){
		var hazes = environmentChunkData && environmentChunkData.dataGlobal.haze;

		if(!hazes || hazes.length<=0){
			return [190, 160, 60];
		}
		else{
			return hazes[0].farColor;
		}
	};

	this.parseLights = function(environmentChunkData){
		var self = this;

		/// Set up output array
		self.getOutput().lights = [];

		var lights = environmentChunkData ? environmentChunkData.dataGlobal.lighting : [{
			lights:[],
			backlightIntensity:1.0,
			backlightColor:[255,255,255]
		}];

		var ambientLight;

		//var light = lights[0];
		//
		var hasLight = false;
		lights.forEach(function(light, idx){

			if(hasLight)
				return;

			/// Directional lights
			var sumDirLightIntensity = 0;

			
			light.lights.forEach(function(dirLightData,idx){

				hasLight = true;
				
				var color = new THREE.Color(
					dirLightData.color[2]/255.0,
					dirLightData.color[1]/255.0,
					dirLightData.color[0]/255.0
				);

				var directionalLight = new THREE.DirectionalLight( color.getHex(), dirLightData.intensity );
				
				directionalLight.position.set(
					-dirLightData.direction[0],
					dirLightData.direction[2],
					dirLightData.direction[1]
				).normalize();
				
				sumDirLightIntensity += dirLightData.intensity;

				self.getOutput().lights.push(directionalLight);

			});// END for each directional light in light


			/// Add some random directional lighting if there was no, in order to se SOME depth on models
			if(!light.lights || light.lights.length==0){		

				var directions = [
					[0,1,0,.3],					
					[1,2,1,.3],
					[-1,-2,-1,.3]
				];

				directions.forEach(function(lightDir){

					var color = new THREE.Color(1,1,1);
					var intensity = lightDir[3];
					var directionalLight = new THREE.DirectionalLight( color.getHex(), intensity );
					
					directionalLight.position.set(lightDir[0],lightDir[1],lightDir[2]).normalize();
					
					sumDirLightIntensity += intensity;

					self.getOutput().lights.push(directionalLight);

				});
				
			}


			/// Ambient light
			//light.backlightIntensity /= sumDirLightIntensity +light.backlightIntensity; 
			light.backlightIntensity =  light.backlightIntensity; 
			var color = new THREE.Color(
				light.backlightIntensity * (255.0-light.backlightColor[2])/255.0,
				light.backlightIntensity * (255.0-light.backlightColor[1])/255.0,
				light.backlightIntensity * (255.0-light.backlightColor[0])/255.0
			);

			ambientLight = new THREE.AmbientLight(color);

		})// END for each light in lighting

		var ambientTotal = 0;
		if(ambientLight){
			ambientTotal = ambientLight.color.r + ambientLight.color.g + ambientLight.color.b;
			this.getOutput().lights.push(ambientLight);
		}

		/// Parsing done, set hasLight flag and return
		this.getOutput().hasLight = hasLight || ambientTotal>0;		
	};

	this.parseSkybox = function(environmentChunkData, parameterChunkData, hazeColorAsInt){

		/// set up output array
		this.getOutput().skyElements = [];
		
		/// Grab sky texture.
		/// index 0 and 1 day
		/// index 2 and 3 evening
		var skyModeTex = this.environmentChunkData && this.environmentChunkData.dataGlobal.skyModeTex[0];

		/// Fallback skyboxfrom dat.
		if(!skyModeTex){
			skyModeTex = {
				texPathNE:1930687,
				texPathSW:193069,
				texPathT:193071
			}
		}

		/// Calculate bounds
		var bounds = parameterChunkData.rect;
		var mapW = Math.abs( bounds.x1 -bounds.x2 );
		var mapD = Math.abs( bounds.y1 -bounds.y2 );
		var boundSide = Math.max( mapW, mapD );

		var materialArray = [];

		/// Load skybox textures, fallback to hosted png files.
		this.loadTextureWithFallback([1,4], materialArray, skyModeTex.texPathNE + 1, "img/193068.png", hazeColorAsInt);
		this.loadTextureWithFallback([0,5], materialArray, skyModeTex.texPathSW + 1, "img/193070.png", hazeColorAsInt);
		this.loadTextureWithFallback([2], materialArray, skyModeTex.texPathT + 1, "img/193072.png", hazeColorAsInt);
		materialArray[3] = new THREE.MeshBasicMaterial({visible:false});


		/// Create skybox geometry
		var boxSize = 1024;		
		var skyGeometry = new THREE.BoxGeometry( boxSize, boxSize/2 , boxSize ); //Width Height Depth

		/// Ugly way of fixing UV maps for the skybox (I think)
		skyGeometry.faceVertexUvs[0].forEach(function(vecs, idx){

			var face = Math.floor(idx/2);

			// PX NX
			// PY NY
			// PZ NZ

			/// PX - WEST 	NX - EAST
			if(face == 0 || face == 1){
				vecs.forEach(function(vec2){
					vec2.x = 1 - vec2.x;	
					vec2.y /= 2.0;	
					vec2.y += .5;	
				});
			}

			/// NZ - SOUTH 	PZ - NORTH
			else if(face == 5 || face == 4){
				vecs.forEach(function(vec2){
					vec2.y /= -2.0;	
					vec2.y += .5;	
				});
			}

			else{
				vecs.forEach(function(vec2){
					vec2.x = 1 - vec2.x;	
				});
			}

		});

		skyGeometry.uvsNeedUpdate = true;
		
		/// Generate final skybox
		var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
		var skyBox = new THREE.Mesh( skyGeometry, skyMaterial );

		/// Put horizon in camera center
		skyBox.translateY(boxSize/4);
		//skyBox.translateY( -environmentChunk.data.dataGlobal.sky.verticalOffset );
		
		/// Write to output
		this.getOutput().skyElements.push(skyBox);
	};
}


/// DataRenderer inheritance:
EnvironmentRenderer.prototype = Object.create(DataRenderer.prototype);
EnvironmentRenderer.prototype.constructor = EnvironmentRenderer;

/**
 * Output fileds generated:
 *
 * - *hazeColor* Array of RGBA values describing the global haze color of the map.
 * - *lights* An array of THREE.DirectionalLight and  THREE.AmbientLight objects.
 * - *hasLight* Boolean is false if no directional lights were added to "lights".
 * - *skyElements* A textured THREE.Mesh skybox.
 * 
 * 
 * @method  renderAsync
 * @async
 * @param  {Function} callback Fires when renderer is finished, does not take arguments.
 */
EnvironmentRenderer.prototype.renderAsync = function(callback){

	var environmentChunkData = this.mapFile.getChunk("env").data;
	var parameterChunkData = this.mapFile.getChunk("parm").data;

	/// Set renderer clear color from environment haze
	var hazeColor = this.getHazeColor(environmentChunkData);
	var hazeColorAsInt =  hazeColor[2]*256*256+hazeColor[1]*256+hazeColor[0];
	this.getOutput().hazeColor = hazeColor;

	/// Add directional lights to output. Also write hasLight flag
	this.parseLights(environmentChunkData);

	/// Generate skybox
	this.parseSkybox(environmentChunkData, parameterChunkData, hazeColorAsInt);

	/// All parsing is synchronous, just fire callback
	callback();
};
	

module.exports = EnvironmentRenderer;