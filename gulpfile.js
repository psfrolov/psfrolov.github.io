'use strict';

// Gulp plugins.
const atImport = require('postcss-import'),
      autoprefixer = require('autoprefixer'),
      browserSync = require('browser-sync'),
      cached = require('gulp-cached'),
      cssPropSort = require('css-property-sorter'),
      del = require('del'),
      gulp = require('gulp'),
      htmlhint = require('gulp-htmlhint'),
      htmlmin = require('gulp-htmlmin'),
      imageInliner = require('postcss-image-inliner'),
      imgsizefix = require('gulp-imgsizefix'),
      minifyCss = require('gulp-minify-css'),
      minifyHtml = require('gulp-minify-html'),
      minimist = require('minimist'),
      mqpacker = require('css-mqpacker'),
      newer = require('gulp-newer'),
      path = require('path'),
      postcss = require('gulp-postcss'),
      postcssReporter = require('postcss-reporter'),
      prettyData = require('gulp-pretty-data'),
      RevAll = require('gulp-rev-all'),
      runSeq = require('run-sequence'),
      shell = require('gulp-shell'),
      size = require('gulp-size'),
      stylelint = require('stylelint'),
      uncss = require('gulp-uncss');

process.on('uncaughtException', er => { console.error(er); process.exit(1); });

// Command line options.
const knownOptions = { string: 'env', default: { env: 'development' } };
const options = minimist(process.argv.slice(2), knownOptions);

// Directories.
const srcDir = path.join(__dirname, 'app');
const outDir = path.join(__dirname, 'dist', options.env);
const jekyllBuildDir = path.join(outDir, 'jekyll-build');
const buildDir = path.join(outDir, 'build');
const certsDir = path.join(__dirname, 'test-certs');
const serveDir = path.join(outDir, 'serve');

// Resource patterns.
const xmlAndJsonFiles = ['*.{xml,json}'];
const cssFiles = ['css/app*.css'];
const jsFiles = ['js/**/*.js'];
const htmlFiles = ['**/*.html'];
const otherFiles = ['!*.{html,xml,json}', '*', 'img/**/*'];

// Jekyll build.
gulp.task('jekyll-build', shell.task(
  `bundle exec jekyll build -I -d ${jekyllBuildDir}`,
  { env: { JEKYLL_ENV: options.env } }
));

// Process XML and JSON.
gulp.task('xmljson', ['jekyll-build'], () =>
  gulp.src(xmlAndJsonFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(newer(buildDir))
    .pipe(prettyData({ type: 'minify' }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'xmljson' }))
);

// Process CSS.
gulp.task('css', ['jekyll-build'], () =>
  gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(postcss([
      atImport({ path: jekyllBuildDir }),
      autoprefixer({ browsers: ['last 2 versions'] }),
      mqpacker,
      cssPropSort,
      imageInliner({ assetPaths: [jekyllBuildDir] }),
      postcssReporter({ clearMessages: true, throwError: true })
    ]))
    .pipe(uncss({ html: [path.join(jekyllBuildDir, '**/*.html')] }))
    .pipe(minifyCss())
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'css' }))
);

// Process JavaScript.
gulp.task('js', ['jekyll-build'], () =>
  gulp.src(jsFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(newer(buildDir))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'js' }))
);

// Process HTML.
gulp.task('html', ['jekyll-build'], () =>
  gulp.src(htmlFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(newer(buildDir))
    .pipe(imgsizefix({ paths: { [jekyllBuildDir]: ['/'] }, force: true }))
    .pipe(minifyHtml({
      empty: true,
      loose: true
    }))
    .pipe(htmlmin({
      removeComments: true,
      collapseWhitespace: true,
      conservativeCollapse: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeRedundantAttributes: true,
      preventAttributesEscaping: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyJS: true,
      minifyCSS: true,
      processScripts: ['application/ld+json']
    }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'html' }))
);

// Copy miscellaneous files.
gulp.task('copy', ['jekyll-build'], () =>
  gulp.src(otherFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(newer(buildDir))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'copy' }))
);

// Revision assets (cache busting).
gulp.task('revision', ['xmljson', 'css', 'js', 'html', 'copy'], () => {
  const revisor = new RevAll({
    dontGlobal: [/^\/\./g, /^\/favicon.ico$/g, /\/img\/pages/g],
    dontRenameFile: [/\.(html|txt)$/g, /^\/(atom|sitemap)\.xml$/g],
    dontUpdateReference: [/\.(html|txt)$/g, /\/(atom|sitemap)\.xml$/g]
  });
  return gulp.src('**/*', { cwd: buildDir, cwdbase: true, dot: true })
    .pipe(revisor.revision())
    .pipe(gulp.dest(serveDir))
    .pipe(size({ title: 'revision' }));
});

// Build.
gulp.task('clean', del.bind(null, [outDir]));
gulp.task('build', ['revision']);
gulp.task('rebuild', cb => { runSeq('clean', 'build', cb); });

// Serve local site and watch for changes.
gulp.task('_browsersync', () => {
  const bs = browserSync.create();
  bs.init({
    server: { baseDir: serveDir },
    https: {
      key: path.join(certsDir, 'srv-auth.key'),
      cert: path.join(certsDir, 'srv-auth.crt')
    },
    browser: ['chrome', 'opera', 'firefox', 'iexplore'],
    reloadOnRestart: true
  });
  gulp.watch(['*/**'], { cwd: srcDir }, ['build', bs.reload]);
});
gulp.task('serve', cb => { runSeq('build', '_browsersync', cb); });
gulp.task('serve-clean', cb => { runSeq('rebuild', '_browsersync', cb); });

// Check source code.
gulp.task('jekyll-hyde', shell.task(
  'bundle exec jekyll hyde', { env: { JEKYLL_ENV: options.env } }
));
gulp.task('stylelint', () =>
  gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(cached('stylelint'))
    .pipe(postcss([
      stylelint,
      postcssReporter({ clearMessages: true, throwError: true })
    ]))
);
gulp.task('htmlhint', () =>
  gulp.src(htmlFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(cached('htmlhint'))
    .pipe(htmlhint({ htmlhintrc: path.join(__dirname, '.htmlhintrc') }))
    .pipe(htmlhint.reporter())
    .pipe(htmlhint.failReporter({ suppress: true }))
);
gulp.task('lint', ['jekyll-hyde', 'stylelint', 'htmlhint']);

// Deploy.
// gulp.task('deploy', ['lint']);
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/automate-release-workflow.md

// Default task.
gulp.task('default', ['serve']);
