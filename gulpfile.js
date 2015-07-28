var gulp = require('gulp');
var webpack = require('webpack-stream');
var gulpJasmineBrowser = require('gulp-jasmine-browser');

gulp.task('jasmine-ci', function() {
  var webpackOptions = {
    devtool: 'eval',
    output: {
      filename: 'spec.js'
    },
    watch: false
  };
  return gulp.src(['spec/javascripts/**/*_spec.js'])
  .pipe(webpack(webpackOptions))
  .pipe(gulpJasmineBrowser.specRunner({console: true}))
  .pipe(gulpJasmineBrowser.headless({driver: 'slimerjs'}));
});

gulp.task('jasmine', function() {
  var webpackOptions = {
    devtool: 'eval',
    output: {
      filename: 'spec.js'
    },
    watch: true
  };
  var plugin = new (require('gulp-jasmine-browser/webpack/jasmine-plugin'))();
  return gulp.src(['spec/javascripts/**/*_spec.js'])
    .pipe(webpack(webpackOptions))
    .pipe(gulpJasmineBrowser.specRunner())
    .pipe(gulpJasmineBrowser.server());
});
