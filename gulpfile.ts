import * as config from "./config";

import * as del from 'del';

import * as gulp from 'gulp';
import * as concat from 'gulp-concat';
import * as ts from 'gulp-typescript';
import * as gulpif from 'gulp-if';
import * as uglify from 'gulp-uglify';

import * as runSequence from 'run-sequence';
import * as browserify from 'browserify';
import * as buffer from 'vinyl-buffer';
import * as source from 'vinyl-source-stream';
import * as bs from 'browser-sync';

const tsify = require('tsify');

const browserSync: bs.BrowserSyncInstance = bs.create();
const env: string = process.env.NODE_ENV || "development";
const isProduction: boolean = (env === "production") ? true : false;

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
            'src/client.ts',
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
    .pipe(gulpif(isProduction, uglify()))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.reload({
        stream: true
    }));
});

/**
 * Task for browser live reload
 */
gulp.task('browserSync', () => {
    browserSync.init({
        port: config[env].GULP_PORT,
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

gulp.task('default', ['build-fresh']);

gulp.task('build-fresh', () => {
    runSequence('clean', 'html-copy', 'assets-copy', 'ts-copy', 'watch');
});

gulp.task('watch', ['browserSync', 'html-copy', 'assets-copy', 'ts-copy'], () => {
    gulp.watch('src/assets/**/*.*', ['assets-copy']);
    gulp.watch('templates/**/*.html', ['html-copy', 'ts-copy']);
    gulp.watch('src/**/*.ts', ['html-copy', 'ts-copy']);
    gulp.watch('config/**/*.ts', ['ts-copy']);
});
