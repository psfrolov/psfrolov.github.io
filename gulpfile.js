'use strict';

// Gulp plugins.
var autoprefixer = require('gulp-autoprefixer'),
    base64 = require('gulp-base64'),
    browserSync = require('browser-sync').create(),
    changed = require('gulp-changed'),
    csso = require('gulp-csso'),
    del = require('del'),
    format = require('string-format'),
    gulp = require('gulp'),
    gulpif = require('gulp-if'),
    htmlmin = require('gulp-htmlmin'),
    lazypipe = require('lazypipe'),
    minifyCss = require('gulp-minify-css'),
    minifyHtml = require('gulp-minify-html'),
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
    
format.extend(String.prototype);

// Command line options.
var knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'development' }
};
var options = minimist(process.argv.slice(2), knownOptions);

// Directories.
var srcDir = path.join(__dirname, 'app');
var outDir = path.join(__dirname, 'dist', options.env);
var jekyllBuildDir = path.join(outDir, 'jekyll-build');
var intDir = path.join(outDir, 'intermediate');
var buildDir = path.join(outDir, 'build');
var certsDir = path.join(__dirname, 'test-certs');
var serveDir = path.join(outDir, 'server');
var siteUrl = 'https://arkfps.github.io';

// Resource patterns. 
var cssFiles = ['css/**/*.css'];
var htmlFiles = ['**/*.html'];
var xmlAndJsonFiles = ['*.{xml,json}'];
var otherFiles = ['!*.{html,xml,json}', '*', 'img/**/*'];

// Jekyll build.
gulp.task('jekyll-build', shell.task(
  'bundle exec jekyll build -I -d {}'.format(jekyllBuildDir),
  { 'env': { 'JEKYLL_ENV': options.env } }
));

// Jekyll doctor.
gulp.task('jekyll-doctor', shell.task(
  'bundle exec jekyll doctor', { 'env': { 'JEKYLL_ENV': options.env } }
));
   
// Process XML and JSON.
gulp.task('xmlAndJson', ['jekyll-build'], function() {
  return gulp.src(xmlAndJsonFiles, { cwd: jekyllBuildDir, cwdbase: true })
    .pipe(prettyData({ type: 'minify' }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'xmlAndJson' }));
});

// Process stylesheets.
gulp.task('styles', ['jekyll-build'], function() {
  return gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true })
    .pipe(changed(intDir))
    .pipe(uncss({ html: [path.join(jekyllBuildDir, '**/*.html')] }))
    .pipe(autoprefixer({ browsers: ['last 2 versions'] }))
    .pipe(base64({ maxImageSize: 10000, deleteAfterEncoding: true }))
    .pipe(gulp.dest(intDir))
    .pipe(size({ title: 'styles' }));
});

// Process HTML.
gulp.task('html', ['styles'], function() {
  return gulp.src(htmlFiles, { cwd: jekyllBuildDir, cwdbase: true })
    .pipe(useref({ searchPath: intDir }))
    //.pipe(gulpif('*.css', csso()))
    .pipe(gulpif('*.css', lazypipe().pipe(shorthand).pipe(minifyCss)()))
    .pipe(gulpif('*.html', minifyHtml()))
    //.pipe(gulpif('*.html', htmlmin({ collapseWhitespace: true })))
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
gulp.task('rev', ['xmlAndJson', 'html', 'copy'], function() {
  var rev = new revAll({ dontRenameFile: [ 
    '.html',
    'sitemap.xml',
    'atom.xml',
    'robots.txt',
    'humans.txt',
    '.nojekyll'
  ] });
  return gulp.src('**/*', { cwd: buildDir, cwdbase: true, dot: true })
    .pipe(rev.revision())
    .pipe(gulp.dest(serveDir))
    .pipe(size({ title: 'html' }));
});

// Optimization.
/*
gulp.task('lint-html', 'TODO'));
gulp.task('lint-xml', 'TODO'));
gulp.task('lint-css', 'TODO'));
gulp.task('lint-js', 'TODO'));
gulp.task('lint', 'TODO'));
*/

// Build.
gulp.task('clean', del.bind(null, [outDir]));
gulp.task('build', ['rev']);
gulp.task('rebuild', function(cb) { runSeq('clean', 'build', cb); });

// Serve site and watch for changes.
gulp.task('serve', ['build'], function() {
  browserSync.init({
    server: { baseDir: serveDir },
    https: {
      key: path.join(certsDir, 'srv-auth.key'),
      cert: path.join(certsDir, 'srv-auth.crt')
    },
    browser: ['chrome', 'opera', 'firefox', 'iexplore'] });
  gulp.watch(
    ['*/**'],
    { cwd: srcDir },
    ['jekyll-build']);  
  gulp.watch(
    ['*/**'],
    { cwd: jekyllBuildDir },
    ['build', browserSync.reload]);
});

// Deploy.
//gulp.task('deploy', ['TODO']);
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/automate-release-workflow.md

// Check source code.
gulp.task('lint', function(cb) { runSeq('jekyll-doctor', cb); });

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
