'use strict';

var uglify = require('uglify-js');
var path = require('path');
var fs = require('fs');
var lsr = require('lsr');
var browserify = require('browserify');
var Promise = require('promise');
var throat = require('throat');
var mkdirp = Promise.denodeify(require('mkdirp'));
var writeFile = Promise.denodeify(fs.writeFile);

module.exports = build;
function build(downloads, source, dest) {
  return Promise.all(downloads.map(function (download) {
    return handleFile(download, source, dest);
  }));
}
function handleFile(download, source, dest) {
  return compile(path.join(source, download.file), download.name).then(null, function (err) {
    return ';throw new Error(' + JSON.stringify(err.message) + ');';
  }).then(function (res) {
    var output = path.resolve(dest, download.file);
    return mkdirp(path.dirname(output)).then(function () {
      var minres = uglify.minify(res, {fromString: true}).code;
      return Promise.all([
        writeFile(output, res),
        writeFile(output.replace(/\.js$/, '.min.js'), minres).done()
      ]);
    });
  });
}
var compile = throat(1, function (filename, standalone) {
  return new Promise(function (resolve, reject) {
    var b = browserify();
    if (standalone)
      b.add(filename);
    else
      b.require(filename);
    b.bundle({
      debug: false,
      standalone: standalone,
      ignoreMissing: true
    }, function (err, res) {
      if (err) reject(err);
      else resolve(res);
    });
  });
});