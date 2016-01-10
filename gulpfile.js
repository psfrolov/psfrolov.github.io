'use strict';

// Gulp plugins.
const accessibility = require('gulp-accessibility'),
      atImport = require('postcss-import'),
      autoprefixer = require('autoprefixer'),
      browserSync = require('browser-sync'),
      cached = require('gulp-cached'),
      cssPropSort = require('css-property-sorter'),
      del = require('del'),
      doiuse = require('doiuse'),
      extReplace = require('gulp-ext-replace'),
      ghPages = require('gulp-gh-pages'),
      gulp = require('gulp'),
      gutil = require('gulp-util'),
      htmlhint = require('gulp-htmlhint'),
      htmlmin = require('gulp-htmlmin'),
      imageInliner = require('postcss-image-inliner'),
      imagemin = require('gulp-imagemin'),
      imgsizefix = require('gulp-imgsizefix'),
      jsonlint = require('gulp-jsonlint'),
      minifyCss = require('gulp-minify-css'),
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
      uglify = require('gulp-uglify'),
      uncss = require('gulp-uncss'),
      url = require('url'),
      w3cjs = require('gulp-w3cjs'),
      zopfli = require('gulp-zopfli');

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
const publishDir = path.join(outDir, 'publish');

// Resource patterns.
const jsonFiles = ['*.json'];
const xmlFiles = ['*.{xml,svg}'];
const cssFiles = ['css/app*.css'];
const jsFiles = ['js/**/*.js'];
const svgFiles = ['svg/**/*.svg'];
const htmlFiles = ['**/*.html'];
const otherFiles = [
  '!*.{html,json,xml,svg}',
  '*',
  'img/**/*',
  'fnt/**/*'
];

// Jekyll build.
gulp.task('jekyll-build', shell.task(
  `bundle exec jekyll build -d ${jekyllBuildDir}`,
  { env: { JEKYLL_ENV: options.env } }
));

// Process XML and JSON.
gulp.task('xml&json', ['jekyll-build'], () =>
  gulp.src(jsonFiles.concat(xmlFiles),
           { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(newer(buildDir))
    .pipe(prettyData({ type: 'minify' }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'xml&json' }))
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
    .pipe(uglify())
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'js' }))
);

// Process SVG.
gulp.task('svg', ['jekyll-build'], () =>
  gulp.src(svgFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(newer({ dest: buildDir, ext: '.svgz' }))
    .pipe(imagemin({
      multipass: true,
      svgoPlugins: [
        { removeTitle: true },
        { cleanupIDs: false },
        { sortAttrs: true }
      ]
    }))
    .pipe(zopfli({ append: false }))
    .pipe(extReplace('.svgz'))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'svg' }))
);

// Process HTML.
gulp.task('html', ['jekyll-build'], () =>
  gulp.src(htmlFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(newer(buildDir))
    .pipe(imgsizefix({ paths: { [jekyllBuildDir]: ['/'] }, force: true }))
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
gulp.task('revision', ['xml&json', 'css', 'js', 'svg', 'html', 'copy'], () => {
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
gulp.task('rebuild', cb => runSeq('clean', 'build', cb));

// Serve local site and watch for changes.
gulp.task('_browsersync', () => {
  const bs = browserSync.create();
  bs.init({
    server: {
      baseDir: serveDir,
      middleware: (req, res, next) => {
        // Correctly serve SVGZ assets.
        if (url.parse(req.url).pathname.match(/\.svgz$/))
          res.setHeader('Content-Encoding', 'gzip');
        next();
      }
    },
    https: {
      key: path.join(certsDir, 'srv-auth.key'),
      cert: path.join(certsDir, 'srv-auth.crt')
    },
    online: false,
    browser: ['chrome', 'opera', 'firefox', 'iexplore'],
    reloadOnRestart: true
  });
  gulp.watch(['*/**'], { cwd: srcDir }, ['build', bs.reload]);
});
gulp.task('serve', cb => runSeq('build', '_browsersync', cb));
gulp.task('serve-clean', cb => runSeq('rebuild', '_browsersync', cb));

// Check source code.
gulp.task('jekyll-hyde', shell.task(
  'bundle exec jekyll hyde', { env: { JEKYLL_ENV: options.env } }
));
gulp.task('jsonlint', () =>
  gulp.src(jsonFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(cached('jsonlint'))
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failAfterError())
);
gulp.task('stylelint', () =>
  gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(cached('stylelint'))
    .pipe(postcss([
      stylelint,
      doiuse({
        browsers: ['last 2 versions'],
        ignore: ['css-resize', 'font-feature', 'rem', 'word-break']
      }),
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
gulp.task('w3c', () =>
  gulp.src(htmlFiles, { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(cached('w3c'))
    .pipe(w3cjs())
    .pipe(w3cjs.reporter())
);
gulp.task('a11y', () =>
  gulp.src(htmlFiles, { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(accessibility({ accessibilityLevel: 'WCAG2AAA' }))
);
gulp.task('lint',
  ['jekyll-hyde', 'jsonlint', 'stylelint', 'htmlhint', 'w3c', 'a11y']
);

// Deploy.
gulp.task('_publish', () => {
  if (options.env !== 'production') {
    const msg = 'only "production" build can be published';
    throw new gutil.PluginError({ plugin: '<none>', message: msg });
  }
  return gulp.src(['**/*'], { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(ghPages({
      cacheDir: publishDir,
      remoteUrl: 'https://github.com/arkfps/arkfps.github.io.git',
      branch: 'master',
      push: false
    }));
});
gulp.task('deploy', cb => runSeq('clean', 'build', 'lint', '_publish', cb));

// Default task.
gulp.task('default', ['serve']);
