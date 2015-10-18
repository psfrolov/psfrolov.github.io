"use strict";

var gulp = require("gulp");
var shell = require("gulp-shell");
var del = require("del");


gulp.task("clean", del.bind(null, ["dist"]));

gulp.task("jekyll-build:dev", shell.task("bundle exec jekyll build"));
gulp.task("jekyll-build:prod", shell.task(
  "bundle exec jekyll build",
  { "env": { "JEKYLL_ENV": "production" } }));
gulp.task("jekyll-serve:dev", shell.task("bundle exec jekyll serve"));
gulp.task("jekyll-serve:prod", shell.task(
  "bundle exec jekyll serve",
  { "env": { "JEKYLL_ENV": "production" } }));

/*
gulp.task("optimize-html", "TODO"));
gulp.task("optimize-xml", "TODO"));
gulp.task("optimize-css", "TODO"));
gulp.task("optimize-js", "TODO"));
gulp.task("optimize-img", "TODO"));
gulp.task("optimize", "TODO"));

gulp.task("lint-html", "TODO"));
gulp.task("lint-xml", "TODO"));
gulp.task("lint-css", "TODO"));
gulp.task("lint-js", "TODO"));
gulp.task("lint", "TODO"));
*/

gulp.task("build:dev", ["jekyll-build:dev"]);
gulp.task("build:prod", ["jekyll-build:prod"]);

/*
//gulp.task("deploy", ["TODO"]);
*/

gulp.task("default", ["jekyll-serve:dev"]);
