import * as del from 'del';

import * as gulp from 'gulp';
import * as concat from 'gulp-concat';
import * as ts from 'gulp-typescript';
import * as uglify from 'gulp-uglify';

import * as runSequence from 'run-sequence';
import * as browserify from 'browserify';
import * as buffer from 'vinyl-buffer';
import * as source from 'vinyl-source-stream';

const browserSync = require('browser-sync').create();
const tsify = require('tsify');


gulp.task('default', ['build-fresh']);

/**
 * Task for html copy
 */
gulp.task('html-copy', () => {
    return gulp.src('src/**/*.html')
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

/**
 * Task for assets copy
 */
gulp.task('assets-copy', () => {
    return gulp.src('src/assets/**/*.*')
        .pipe(gulp.dest('dist/assets'))
        .pipe(browserSync.reload({
            stream: true
        }))
});

/**
 * Task for ts compiling and compressing
 */
gulp.task('ts-copy', () => {
    return browserify({
        basedir: __dirname,
        debug: true,
        entries: [
            'src/app.ts',
            'src/objects/index.ts',
        ],
        cache: {},
        packageCache: {}
    })
    .plugin(tsify)
    .bundle()
    .on('error', (err: Error) => {
        console.log('\nError: ', err.name);
        console.log(err.message);
    })
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

/**
 * Task for browser live reload
 */
gulp.task('browserSync', () => {
    browserSync.init({
        ui: false,
        notify: false,
        open: true,
        proxy: "127.0.0.1:9000"
    });
});

/**
 * Task for clean dist/
 */
gulp.task('clean', () => {
    return del(['dist/*']);
});

gulp.task('build-fresh', () => {
    runSequence('clean', 'html-copy', 'assets-copy', 'ts-copy', 'watch');
});

gulp.task('watch', ['browserSync', 'html-copy', 'assets-copy', 'ts-copy'], () => {
    gulp.watch('src/assets/**/*.*', ['assets-copy']);
    gulp.watch('src/**/*.html', ['html-copy', 'ts-copy']);
    gulp.watch('src/**/*.ts', ['html-copy', 'ts-copy']);
});
