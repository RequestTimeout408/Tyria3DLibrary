/**
 * Simple gulp file for compiling the Tyria 3D API using gulp and browserify.
 *
 * Usage
 *
 * ---- 1st time only ----
 *
 * npm install
 * gulp formats
 * 
 * ---- Always ----
 *
 * gulp
 *
 *
 * ---- Production ----
 *
 * gulp --production
 * gulp formats --production
 * 
 *
 */

/* Core functionality requires gulp and browserify */
var gulp = require('gulp');
var browserify = require('browserify');

/* Allows arguments to be passed from cmd */
var argv = require('yargs').argv;

/* Misc. functionality used for building and watching */
var args = require('yargs').argv;
var CombinedStream = require('combined-stream');
var source = require('vinyl-source-stream');
var watch = require('gulp-watch');

/* Used for minimizing */
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');

// Very simple error handler for the file stream.
var errorHandler = function (msg) {
    return function (error) {
        console.error(msg);
        console.error(error.stack);
    };
};

buildJS = function(settings) {

	/// Create file steam
	var bundleFileStream = CombinedStream.create()

	/// Bundle browsified scripts
	.append(
		browserify(settings.mainFile,{debug : true})
		.bundle(settings.bundleParams)
	)

	/// Error handler
	.on('error', errorHandler("T3D API build failed"))

	/// Complete handler
    .on('end', function () { console.log("T3D API finished"); })

	/// Write to file
	.pipe( source(settings.fileName) );

	/// Minify
	if(settings.isProduction){
		bundleFileStream.pipe(streamify(uglify()));
	}
	
	/// Move to build directory
	bundleFileStream.pipe(gulp.dest('build'));
}

/// gulp API 
/// compiles the source into a signle bundle.
gulp.task('API', buildJS);

gulp.task('formats', function(){

	var isProduction = (argv.production === undefined) ? false : true;	
	buildJS(
			{
				isProduction: isProduction,
				fileName: "T3D-1.0.3.Formats.min.js",
				mainFile:'./src/format/definition/AllFormats.js',
				bundleParams:{}
			}
	);

});


/// gulp watch
/// watch the srouce js files and build the bundle when any file changes.
gulp.task('watch', function() {
	
	/// Build Bundle API when source changes
	watch({
		glob : "./src/**/*.js"
	}, function(files) {
		var isProduction = (argv.production === undefined) ? false : true;	
		var fileNames = {
			dev : "T3D-1.0.3.js",
			production : "T3D-1.0.3.min.js"
		};


		return buildJS(
			{
				isProduction: isProduction,
				fileName: isProduction ? fileNames.production : fileNames.dev,
				mainFile:'./src/T3DLib.js',
				bundleParams:{standalone: 'T3D'}
			}
		);
	});

});

/// Register watch as the default task if none is spefified.
gulp.task('default', ['watch']);