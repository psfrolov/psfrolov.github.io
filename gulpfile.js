'use strict';

// Gulp plugins.
const accessibility = require('gulp-accessibility'),
      atImport = require('postcss-import'),
      autoprefixer = require('autoprefixer'),
      browserSync = require('browser-sync'),
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
      PluginError = require('plugin-error'),
      postcss = require('gulp-postcss'),
      postcssClean = require('postcss-clean'),
      postcssReporter = require('postcss-reporter'),
      prettyData = require('gulp-pretty-data'),
      revAll = require('gulp-rev-all'),
      runSeq = require('run-sequence'),
      shell = require('gulp-shell'),
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

// Jekyll build.
gulp.task('jekyll-build', shell.task(
  `bundle exec jekyll build --destination ${jekyllBuildDir} --trace`,
  { env: { JEKYLL_ENV: options.env } }
));

// Jekyll serve.
gulp.task('jekyll-serve', shell.task(
  `bundle exec jekyll serve --destination ${jekyllBuildDir} \
    --ssl-key ${path.join(certsDir, 'srv-auth.key')} \
    --ssl-cert ${path.join(certsDir, 'srv-auth.crt')} \
    --port 3000 --open-url --livereload --trace`,
  { env: { JEKYLL_ENV: options.env } }
));

// Process XML and JSON.
gulp.task('xml&json', ['jekyll-build'], () =>
  gulp.src(jsonFiles.concat(xmlFiles),
           { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(prettyData({ type: 'minify' }))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'xml&json' }))
);

// Process CSS.
gulp.task('css', ['jekyll-build'], () =>
  gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(postcss([
      atImport,
      autoprefixer,
      mqpacker({ sort: true }),
      uncss.postcssPlugin({
        html: [path.join(jekyllBuildDir, '**/*.html')],
        htmlroot: jekyllBuildDir
      }),
      postcssClean,
      cssDeclSort,
      postcssReporter({ throwError: true })
    ]))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'css' }))
);

// Process JavaScript.
gulp.task('js', ['jekyll-build'], () =>
  gulp.src(jsFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(uglify())
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'js' }))
);

// Process SVG.
gulp.task('svg', ['jekyll-build'], () =>
  gulp.src(svgFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(imagemin([
      imagemin.svgo({
        multipass: true,
        plugins: [ { cleanupIDs: false }, { sortAttrs: true } ]
      })
    ]))
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'svg' }))
);

// Process HTML.
gulp.task('html', ['jekyll-build'], () =>
  gulp.src(htmlFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
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
    .pipe(size({ title: 'html' }))
);

// Copy miscellaneous files.
gulp.task('copy', ['jekyll-build'], () =>
  gulp.src(otherFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(gulp.dest(buildDir))
    .pipe(size({ title: 'copy' }))
);

// Revise assets (cache busting).
gulp.task('revision', ['xml&json', 'css', 'js', 'svg', 'html', 'copy'], () =>
  gulp.src('**/*', { cwd: buildDir, cwdbase: true, dot: true })
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
    .pipe(size({ title: 'revision' }))
);

// Build.
gulp.task('clean', () => del([outDir]));
gulp.task('build', ['revision']);
gulp.task('rebuild', cb => runSeq('clean', 'build', cb));

// Serve local site and watch for changes.
gulp.task('_browsersync', () => {
  const port = 3000;
  const bs = browserSync.create();
  bs.init({
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
      'opera',
      'firefox',
      'iexplore',
      `microsoft-edge:https://localhost:${port}`
    ],
    reloadOnRestart: true
  });
  gulp.watch(['**/*'], { cwd: srcDir }, ['build', bs.reload]);
});
gulp.task('serve', cb => runSeq('build', '_browsersync', cb));
gulp.task('serve-clean', cb => runSeq('rebuild', '_browsersync', cb));

// Check source code.
gulp.task('jekyll-hyde', shell.task(
  'bundle exec jekyll hyde', { env: { JEKYLL_ENV: options.env } }
));
gulp.task('jsonlint', ['jekyll-build'], () =>
  gulp.src(jsonFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failAfterError())
);
gulp.task('stylelint', ['jekyll-build'], () =>
  gulp.src(cssFiles, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(stylelint({ reporters: [ { formatter: 'string', console: true } ] }))
    .pipe(postcss([
      doiuse({ browsers: ['defaults'] }),
      postcssReporter({ throwError: true })
    ]))
);
gulp.task('htmlhint', ['jekyll-build'], () =>
  gulp.src(htmlFilesForLint, { cwd: jekyllBuildDir, cwdbase: true, dot: true })
    .pipe(htmlhint({ htmlhintrc: path.join(__dirname, '.htmlhintrc') }))
    .pipe(htmlhint.reporter())
    .pipe(htmlhint.failAfterError({ suppress: true }))
);
gulp.task('w3c', ['build'], () =>
  gulp.src(htmlFilesForLint, { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(w3cjs())
    .pipe(w3cjs.reporter())
);
gulp.task('a11y', ['build'], () =>
  gulp.src(htmlFilesForLint, { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(accessibility({
      accessibilityLevel: 'WCAG2AAA',
      reportLevels: { notice: false, warning: false, error: true },
      force: true
    }))
);
gulp.task('lint',
          ['jekyll-hyde', 'jsonlint', 'stylelint', 'htmlhint', 'w3c', 'a11y']
);

// Deploy.
gulp.task('_publish', () => {
  if (options.env !== 'production') {
    const msg = 'Only "production" build can be published.';
    throw new PluginError({ plugin: '<none>', message: msg });
  }
  return gulp.src(['**/*'], { cwd: serveDir, cwdbase: true, dot: true })
    .pipe(ghPages({
      cacheDir: publishDir,
      remoteUrl: 'https://github.com/arkfps/arkfps.github.io.git',
      branch: 'master'
    }));
});
gulp.task('deploy', cb => runSeq('clean', 'build', '_publish', cb));

// Default task.
gulp.task('default', ['serve']);
