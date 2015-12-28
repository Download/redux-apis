var
gulp = require('gulp'),
sourcemaps = require('gulp-sourcemaps'),
babel = require('gulp-babel'),
path = require('path'),
fs = require('fs'),
pkg = JSON.parse(fs.readFileSync('package.json')),
src = path.join(__dirname, 'src'),
production = process.env.NODE_ENV === 'production';

gulp.task('default', function(){
	return gulp.src(pkg.entry)
		.pipe(sourcemaps.init())
		.pipe(babel(pkg.babel))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('lib'));
});