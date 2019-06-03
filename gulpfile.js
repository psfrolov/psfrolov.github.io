'use strict';

// Gulp plugins.
const accessibility = require('gulp-accessibility'),
      atImport = require('postcss-import'),
      autoprefixer = require('autoprefixer'),
      browserSync = require('browser-sync'),
      childProcess = require('child_process'),
      cleanUrls = require('clean-urls'),
      cssDeclSort = require('css-declaration-sorter'),
      del = require('del'),
      doiuse = require('doiuse'),
      ghPages = require('gulp-gh-pages'),
      gulp = require('gulp'),
      htmlhint = require('gulp-htmlhint'),
      htmlmin = require('gulp-htmlmin'),
      imagemin = require('gulp-imagemin'),
      imgsizefix = require('gulp-imgsizefix'),
      jsonlint = require('gulp-jsonlint'),
      minimist = require('minimist'),
      mqpacker = require('css-mqpacker'),
      path = require('path'),
      postcss = require('gulp-postcss'),
      postcssClean = require('postcss-clean'),
      postcssReporter = require('postcss-reporter'),
      prettyData = require('gulp-pretty-data'),
      revAll = require('gulp-rev-all'),
      size = require('gulp-size'),
      stylelint = require('gulp-stylelint'),
      uglify = require('gulp-uglify'),
      uncss = require('uncss'),
      url = require('url'),
      w3cjs = require('gulp-w3cjs');

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
const publishDir = path.join(outDir, 'publish');

// Resource patterns.
const jsonFiles = ['*.json'];
const xmlFiles = ['*.{xml,svg}'];
const cssFiles = ['css/app*.css'];
const jsFiles = ['js/**/*.js'];
const svgFiles = ['svg/**/*.svg'];
const htmlFiles = ['**/*.html'];
const htmlFilesForLint = htmlFiles.concat(['!{google,yandex_}*.html']);
const otherFiles = [
  '!*.{html,json,xml,svg}',
  '*',
  'img/**/*',
  'fnt/**/*'
];

let webServer = null;

// Jekyll build.
function jekyllBuild() {
  return childProcess.spawn(
    `bundle exec jekyll build --destination ${jekyllBuildDir} --trace`,
    { stdio: 'inherit', shell: true, env: { JEKYLL_ENV: options.env } });
}
exports['jekyll-build'] = jekyllBuild;

// Jekyll serve.
exports['jekyll-serve'] = () => childProcess.spawn(
  `bundle exec jekyll serve --destination ${jekyllBuildDir} \
    --ssl-key ${path.join(certsDir, 'srv-auth.key')} \
    --ssl-cert ${path.join(certsDir, 'srv-auth.crt')} \
    --port 3000 --open-url --livereload --trace`,
  { stdio: 'inherit', shell: true, env: { JEKYLL_ENV: options.env } }
);

// Process XML and JSON.
function xmlAndJson() {
  return gulp.src(jsonFiles.concat(xmlFiles),
                  { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(prettyData({ type: 'minify' }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'xml&json' }));
}

// Process CSS.
function css() {
  return gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(postcss([
      atImport,
      autoprefixer,
      mqpacker({ sort: true }),
      uncss.postcssPlugin({
        html: [path.join(jekyllBuildDir, '**', '*.html')],
        htmlroot: jekyllBuildDir
      }),
      postcssClean,
      cssDeclSort,
      postcssReporter({ throwError: true })
    ]))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'css' }));
}

// Process JavaScript.
function js() {
  return gulp.src(jsFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(uglify())
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'js' }));
}

// Process SVG.
function svg() {
  return gulp.src(svgFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(imagemin([
      imagemin.svgo({
        multipass: true,
        plugins: [ { cleanupIDs: false }, { sortAttrs: true } ]
      })
    ]))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'svg' }));
}

// Process HTML.
function html() {
  return gulp.src(htmlFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(imgsizefix({ paths: { [jekyllBuildDir]: ['/'] }, force: true }))
    .pipe(htmlmin({
      collapseBooleanAttributes: true,
      collapseInlineTagWhitespace: true,
      collapseWhitespace: true,
      conservativeCollapse: true,
      minifyCSS: true,
      // eslint-disable-next-line camelcase
      minifyJS: { output: { quote_style: 3 } },
      preventAttributesEscaping: true,
      processScripts: ['application/ld+json'],
      removeAttributeQuotes: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      sortAttributes: true,
      sortClassName: true
    }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'html' }));
}

// Copy miscellaneous files.
function copy() {
  return gulp.src(otherFiles,
                  { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'copy' }));
}

// Revise assets (cache busting).
function revision() {
  return gulp.src('**/*', { cwd: buildDir, cwdbase: true, dot: true })
    .pipe(revAll.revision({
      dontGlobal: [
        /^\/\./gu,  // dot-files
        /^\/favicon/gu,  // favicons
        /^\/apple-touch-icon/gu,  // iOS favicons
        /\/img\/pages/gu,  // images for social sharing and rich snippets
        /^\/BingSiteAuth\.xml$/gu,  // Bing Webmaster Tools verification file
        /^\/CNAME$/gu  // GitHub Pages custom domain support
      ],
      dontRenameFile: [
        /\.(html|txt)$/gu,
        /^\/(atom|sitemap|feed\.xslt)\.xml$/gu,
        /^\/browserconfig\.xml$/gu
      ],
      dontUpdateReference: [
        /\.(html|txt)$/gu,
        /\/(atom|sitemap|feed\.xslt)\.xml$/gu
      ]
    }))
    .pipe(gulp.dest(serveDir))
    .pipe(size({ title: 'revision' }));
}

// Build.
function clean() {
  return del([outDir]);
}
exports.clean = clean;

const build = gulp.series(jekyllBuild,
                          gulp.parallel(xmlAndJson, css, js, svg, html, copy),
                          revision);
exports.build = build;

const rebuild = gulp.series(clean, build);
exports.rebuild = rebuild;

// Serve local site.
function serve(cb) {
  const port = 3000;
  webServer = browserSync.create();
  webServer.init({
    server: { baseDir: serveDir },
    port,
    middleware: [
      cleanUrls(true, { root: serveDir }),
      (req, res, next) => {
        // Correctly serve SVGZ assets.
        if (url.parse(req.url).pathname.match(/\.svgz$/u))
          res.setHeader('Content-Encoding', 'gzip');
        next();
      }
    ],
    https: {
      key: path.join(certsDir, 'srv-auth.key'),
      cert: path.join(certsDir, 'srv-auth.crt')
    },
    online: false,
    browser: [
      'chrome',
      '%LOCALAPPDATA%\\Programs\\Opera\\launcher.exe',
      'firefox',
      'iexplore',
      `microsoft-edge:https://localhost:${port}`
    ],
    reloadOnRestart: true
  });
  cb();
}

function reloadServer(cb) {
  webServer.reload();
  cb();
}

function watch() {
  return gulp.watch('**/*', { cwd: srcDir }, gulp.series(build, reloadServer));
}

exports.serve = gulp.series(build, serve, watch);
exports['serve-clean'] = gulp.series(rebuild, serve);

// Check source code.
function jekyllHyde() {
  return childProcess.spawn(
    'bundle exec jekyll hyde',
    { stdio: 'inherit', shell: true, env: { JEKYLL_ENV: options.env } });
}
exports['jekyll-hyde'] = jekyllHyde;

function jsonLint() {
  return gulp.src(jsonFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failAfterError());
}
exports.jsonlint = jsonLint;

function styleLint() {
  return gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(stylelint({ reporters: [ { formatter: 'string', console: true } ] }))
    .pipe(postcss([
      doiuse({ browsers: ['defaults'] }),
      postcssReporter({ throwError: true })
    ]));
}
exports.stylelint = styleLint;

function htmlHint() {
  return gulp.src(htmlFilesForLint,
                  { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(htmlhint({ htmlhintrc: path.join(__dirname, '.htmlhintrc') }))
    .pipe(htmlhint.reporter())
    .pipe(htmlhint.failAfterError({ suppress: true }));
}
exports.htmlhint = htmlHint;

function w3c() {
  return gulp.src(htmlFilesForLint,
                  { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(w3cjs())
    .pipe(w3cjs.reporter());
}
exports.w3c = w3c;

function a11y() {
  return gulp.src(htmlFilesForLint,
                  { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(accessibility({
      accessibilityLevel: 'WCAG2AAA',
      reportLevels: { notice: false, warning: false, error: true },
      force: true
    }));
}
exports.a11y = a11y;

exports.lint =
  gulp.series(build, jekyllHyde, jsonLint, styleLint, htmlHint, w3c, a11y);

// Deploy.
function publish(cb) {
  if (options.env !== 'production')
    return cb(new Error('Only "production" build can be published.'));

  return gulp.src(['**/*'], { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(ghPages({
      cacheDir: publishDir,
      remoteUrl: 'https://github.com/psfrolov/psfrolov.github.io.git',
      branch: 'master'
    }));
}
exports.deploy = gulp.series(clean, build, publish);

// Default task.
exports.default = serve;
