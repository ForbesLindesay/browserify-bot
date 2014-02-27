'use strict';

var path = require('path');
var fs = require('fs');
var lsr = require('lsr');
var browserify = require('browserify');
var Promise = require('promise');
var throat = require('throat');
var mkdirp = Promise.denodeify(require('mkdirp'));
var writeFile = Promise.denodeify(fs.writeFile);

module.exports = build;
function build(pkg) {
  var name = pkg.name;
  var spec = pkg['dist-tags'].latest;
  var source = path.resolve(__dirname + '/../modules/'
                           + name + '/' + spec);
  var standaloneDest = path.resolve(__dirname + '/../standalone/'
                           + name + '/' + spec);
  var exposeDest = path.resolve(__dirname + '/../expose/'
                           + name + '/' + spec);
  return lsr(source, {filter: function (stat) { return stat.name != 'node_modules' }})
  .then(function (files) {
    return files.filter(function (file) {
      return file.isFile() && /\.js$/.test(file.name);
    });
  }).then(function (files) {
    return Promise.all(files.map(function (file) {
      return Promise.all(handleFile(file, name, standaloneDest),
                         handleFile(file, false, exposeDest));
    }));
  });
}
function handleFile(file, standalone, dest) {
  return compile(file.fullPath, standalone).then(null, function (err) {
    return ';throw new Error(' + JSON.stringify(err.message) + ');';
  }).then(function (res) {
    var output = path.resolve(dest, file.path);
    return mkdirp(path.dirname(output)).then(function () {
      return writeFile(output, res);
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
      debug: true,
      standalone: standalone
    }, function (err, res) {
      if (err) reject(err);
      else resolve(res);
    });
  });
});