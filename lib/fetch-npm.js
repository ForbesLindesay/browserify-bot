'use strict';

var fs = require('fs');
var Promise = require('promise');
var npm = require('npm-fetch');
var unpack = require('tar-pack').unpack;
var readFile = Promise.denodeify(fs.readFile);

module.exports = downloadModule;

function downloadModule(name, spec, dest) {
  return new Promise(function (resolve, reject) {
    npm(name, spec)
      .on('error', reject)
      .pipe(unpack(dest, function (err) {
        if (err) reject(err);
        else resolve(dest);
      }))
  }).then(function () {
    return readFile(dest + '/package.json');
  }).then(function (pkg) {
    pkg = JSON.parse(pkg);
    if (!pkg.dependencies) return pkg;
    return Promise.all(Object.keys(pkg.dependencies).map(function (name) {
      return downloadModule(name, pkg.dependencies[name], dest + '/node_modules/' + name);
    })).then(function () {
      return pkg;
    });
  });
}