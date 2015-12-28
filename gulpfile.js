var
gulp = require('gulp'),
gutil = require('gulp-util'),
gulpif = require('gulp-if'),
streamify = require('gulp-streamify'),
source = require('vinyl-source-stream'),
babelify = require('babelify'),
browserify = require('browserify'),
watchify = require('watchify'),
uglify = require('gulp-uglify'),
path = require('path'),
fs = require('fs'),
pkg = JSON.parse(fs.readFileSync('package.json')),
src = path.join(__dirname, 'src'),
production = process.env.NODE_ENV === 'production';

/*
 |--------------------------------------------------------------------------
 | Compile only project files, excluding all third-party dependencies.
 |--------------------------------------------------------------------------
 */
gulp.task('browserify', [], function() {
	gutil.log('Browserify sources in folder ' + src + ' with extensions: ' + pkg.extensions);
	return browserify({
		basedir: src,
		entries: pkg.entries,
		extensions: pkg.extensions,
	})
	.external(Object.keys(pkg.dependencies))
	.transform(babelify, pkg.babel)
	.bundle()
	.pipe(source(pkg.name + '.js'))
	.pipe(gulpif(production, streamify(uglify({ mangle: false }))))
	.pipe(gulp.dest('lib'));
});

/*
 |--------------------------------------------------------------------------
 | Same as browserify task, but will also watch for changes and re-compile.
 |--------------------------------------------------------------------------
 */
gulp.task('browserify-watch', [], function() {
	var bundler = watchify(browserify(browserify({
		basedir: src,
		entries: pkg.entries,
		extensions: pkg.extensions,
	}), watchify.args));
	bundler.external(Object.keys(pkg.dependencies));
	bundler.transform(babelify, pkg.babel)
	bundler.on('update', rebundle);
	return rebundle();

	function rebundle() {
		gutil.log('Rebundling...');
		var start = Date.now();
		return bundler.bundle()
			.on('error', function(err) {
				gutil.log(gutil.colors.red(err.toString()));
			})
			.on('end', function() {
				gutil.log(gutil.colors.green('Finished rebundling in', (Date.now() - start) + 'ms.'));
			})
			.pipe(source(pkg.name + '.js'))
			.pipe(gulp.dest('lib'));
	}
});

gulp.task('default', ['browserify-watch', 'watch']);
gulp.task('build', ['browserify']);
