var gulp = require('gulp');
var tsify = require('tsify');
var browserify = require('browserify');
var source = require('vinyl-source-stream');

gulp.task("html-copy", function(){
    return gulp.src(['src/*.html'])
        .pipe(gulp.dest("dist"));
});

gulp.task('default', ['html-copy'], function() {
    return browserify({
        basedir: '.',
        debug: true,
        // entries: ['src/main.ts']
    })
    .plugin(tsify)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest("dist"));
});
