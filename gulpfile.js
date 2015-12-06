'use strict';

// Gulp plugins.
let autoprefixer = require('gulp-autoprefixer'),
    base64 = require('gulp-base64'),
    browserSync = require('browser-sync').create(),
    changed = require('gulp-changed'),
    combine = require('stream-combiner2'),
    csscomb = require('gulp-csscomb'),
    csso = require('gulp-csso'),
    del = require('del'),
    gulp = require('gulp'),
    gulpif = require('gulp-if'),
    htmlhint = require('gulp-htmlhint'),
    htmlmin = require('gulp-htmlmin'),
    imgsizefix = require('gulp-imgsizefix'),
    minifyCss = require('gulp-minify-css'),
    minifyHtml = require('gulp-minify-html'),
    minifyInline = require('gulp-minify-inline'),
    minimist = require('minimist'),
    path = require('path'),
    prettyData = require('gulp-pretty-data'),
    psi = require('psi'),
    revAll = require('gulp-rev-all'),
    runSeq = require('run-sequence'),
    shell = require('gulp-shell'),
    shorthand = require('gulp-shorthand'),
    size = require('gulp-size'),
    uncss = require('gulp-uncss'),
    useref = require('gulp-useref');
    
process.on('uncaughtException', function(e) {
  console.error(e);
  process.exit(1);
});

// Command line options.
const knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'development' }
};
const options = minimist(process.argv.slice(2), knownOptions);

// Directories.
const srcDir = path.join(__dirname, 'app');
const outDir = path.join(__dirname, 'dist', options.env);
const jekyllBuildDir = path.join(outDir, 'jekyll-build');
const intDir = path.join(outDir, 'intermediate');
const buildDir = path.join(outDir, 'build');
const certsDir = path.join(__dirname, 'test-certs');
const serveDir = path.join(outDir, 'serve');
const siteUrl = 'https://arkfps.github.io';

// Resource patterns. 
const cssFiles = ['css/**/*.css'];
const htmlFiles = ['**/*.html'];
const xmlAndJsonFiles = ['*.{xml,json}'];
const otherFiles = ['!*.{html,xml,json}', '*', 'img/**/*'];

// Jekyll build.
gulp.task('jekyll-build', shell.task(
  `bundle exec jekyll build -I -d ${jekyllBuildDir}`,
  { 'env': { 'JEKYLL_ENV': options.env } }
));
   
// Process XML and JSON.
gulp.task('xmlAndJson', ['jekyll-build'], function() {
  return gulp.src(xmlAndJsonFiles, { cwd: jekyllBuildDir, cwdbase: true })
    .pipe(changed(buildDir))
    .pipe(prettyData({ type: 'minify' }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'xmlAndJson' }));
});

// Process style-sheets.
gulp.task('styles', ['jekyll-build'], function() {
  return gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true })
    .pipe(changed(intDir))
    .pipe(uncss({ html: [path.join(jekyllBuildDir, '**/*.html')] }))
    .pipe(autoprefixer({ browsers: ['last 2 versions'] }))
    .pipe(base64({ maxImageSize: 10240, deleteAfterEncoding: true }))
    .pipe(gulp.dest(intDir))
    .pipe(size({ title: 'styles' }));
});

// Process HTML.
gulp.task('html', ['styles'], function() {
  return gulp.src(htmlFiles, { cwd: jekyllBuildDir, cwdbase: true })
    .pipe(useref({ searchPath: intDir }))
    .pipe(gulpif('*.css', combine.obj([
      shorthand(),
      csscomb(),
      minifyCss()
    ])))
    .pipe(gulpif('*.html', combine.obj([
      imgsizefix({ paths: { [jekyllBuildDir]: ['/'] }, force: true }),
      minifyInline({
        jsSelector: 'script[type!="application/ld+json"]',
        js: { warnings: true } }),
      minifyHtml()
    ])))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'html' }));
});

// Copy files.
gulp.task('copy', ['styles'], function() {
  return gulp.src(otherFiles,
                  { cwd: jekyllBuildDir, cwdbase: true, dot: true })
      .pipe(changed(buildDir))
      .pipe(gulp.dest(buildDir))
      .pipe(size({ title: 'copy' }));
}); 

// Revision assets (cache busting).
gulp.task('revision', ['xmlAndJson', 'html', 'copy'], function() {
  let revisor = new revAll({
    dontGlobal: [/^\/\./g, /^\/favicon.ico$/g, /\/img\/pages/g],
    dontRenameFile: [/\.(html|txt)$/g, /^\/(atom|sitemap)\.xml$/g]
  });
  return gulp.src('**/*', { cwd: buildDir, cwdbase: true, dot: true })
    .pipe(revisor.revision())
    .pipe(gulp.dest(serveDir))
    .pipe(size({ title: 'revision' }));
});

// Build.
gulp.task('clean', del.bind(null, [outDir]));
gulp.task('build', ['revision']);
gulp.task('rebuild', function(cb) { runSeq('clean', 'build', cb); });

// Serve local site and watch for changes.
gulp.task('_browsersync', function() {
  browserSync.init({
    server: { baseDir: serveDir },
    https: {
      key: path.join(certsDir, 'srv-auth.key'),
      cert: path.join(certsDir, 'srv-auth.crt')
    },
    browser: ['chrome', 'opera', 'firefox', 'iexplore'] });
    gulp.watch(['*/**'], { cwd: srcDir }, ['build', browserSync.reload]);
});
gulp.task('serve', function(cb) {
  runSeq('build', '_browsersync', cb);
});
gulp.task('serve-clean', function(cb) {
  runSeq('rebuild', '_browsersync', cb);
});

// Check source code.
gulp.task('jekyll-hyde', shell.task(
  'bundle exec jekyll hyde', { 'env': { 'JEKYLL_ENV': options.env } }
));
gulp.task('htmlhint', function() {
  return gulp.src(htmlFiles, { cwd: serveDir, cwdbase: true })
    .pipe(htmlhint({ htmlhintrc: path.join(__dirname, '.htmlhintrc') }))
    .pipe(htmlhint.failReporter())
});
gulp.task('lint', ['jekyll-hyde', 'htmlhint']);

// Deploy.
//gulp.task('deploy', ['lint']);
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/automate-release-workflow.md

// Test performance.
gulp.task('psi-desktop', function() {
  return psi.output(siteUrl, { nokey: 'true', strategy: 'desktop' });
});
gulp.task('psi-mobile', function() {
  return psi.output(siteUrl, { nokey: 'true', strategy: 'mobile' });
});
gulp.task('psi', function(cb) { runSeq('psi-desktop', 'psi-mobile', cb); });

// Default task.
gulp.task('default', ['serve']);
