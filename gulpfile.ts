var gulp = require('gulp');
var concat = require('gulp-concat');
var ts = require('gulp-typescript');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();

var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");

gulp.task('default', ['build-fresh']);

gulp.task('html-copy', function() {
    return gulp.src('src/**/*.html')
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

gulp.task('assets-copy', function() {
    return gulp.src('src/assets/**/*.*')
        .pipe(gulp.dest('dist/assets'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

gulp.task('ts-copy', function() {
    return browserify({
        basedir: '.',
        debug: true,
        entries: ['src/index.ts'],
        cache: {},
        packageCache: {}
    })
    .plugin(tsify)
    .bundle()
    .on('error', function(err: any) {
        console.log('\nError: ', err.name);
        console.log(err.message);
    })
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('browserSync', function() {
    browserSync.init({
        notify: false,
        // server: {
            // baseDir: 'dist'
        // },
        proxy: "127.0.0.1:9000"
    });
});

gulp.task('clean', function (){
    return gulp.src('dist/*')
        .pipe(clean());
});

gulp.task('build-fresh', function () {
    runSequence('clean', 'html-copy', 'assets-copy', 'ts-copy', 'watch');
});

gulp.task('watch', ['browserSync', 'html-copy', 'assets-copy', 'ts-copy'], function() {
    gulp.watch('src/assets/**/*.*', ['assets-copy']);
    gulp.watch('src/**/*.html', ['html-copy', 'ts-copy']);
    gulp.watch('src/**/*.ts', ['html-copy', 'ts-copy']);
});
