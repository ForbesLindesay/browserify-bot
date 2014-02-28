'use strict';

var path = require('path');
var fs = require('fs');
var barrage = require('barrage');
var Promise = require('promise');
var rimraf = Promise.denodeify(require('rimraf'));
var npmUpdates = require('./lib/check-npm');
var fetchNpm = require('./lib/fetch-npm');
var build = require('./lib/build');
var stat = Promise.denodeify(fs.stat);

var next = npmUpdates();
function pull() {
  next().then(processPackage).done(function (res) {
    pull();
  });
}
pull();

function processPackage(pkg) {
  var name = pkg.name;
  var version = pkg['dist-tags'].latest;
  var downloadLocation = path.resolve(__dirname + '/modules/'
                                      + name + '/' + version);
  var destination = path.resolve(__dirname + '/standalone/'
                                 + name + '/' + version);
  console.log('fetch: ' + name + '@' + version);
  return fetchNpm(name, version, downloadLocation)
  .then(null, onFail('fetch-fail: ' + name + '@' + version))
  .then(function (pkg) {
    var downloads = pkg.downloads || [];
    var main = typeof pkg.browser === 'string' ? pkg.browser : (pkg.main || 'index.js');
    if (!downloads.some(function (d) { return d === main || d.file === main; })) {
      return stat(path.join(downloadLocation, main)).then(function (stat) {
        if (stat.isFile()) {
          downloads.push({
            file: main,
            name: name,
            description: 'The main code for ' + pkg.name
          });
        }
        return downloads;
      }, function (err) {
        console.dir(err.message);
        return downloads;
      });
    } else {
      return downloads;
    }
  }).then(function (downloads) {
    downloads = downloads.map(function (d) {
      if (typeof d === 'string') {
        return {file: d, name: name};
      } else {
        return d;
      }
    });
    downloads.forEach(function (d) {
      d.file = d.file.replace(/\\/g, '/').replace(/^\.?\//, '')
    });
    if (downloads.length) {
      console.log('build: ' + name + '@' + version);
      console.dir(downloads);
      return build(downloads, downloadLocation, destination)
      .then(null, onFail('build-fail: ' + name + '@' + version));
    }
  });
}
function onFail(message) {
  return function (err) {
    console.log(message);
    throw err;
  }
}



/**
 * - 'startTime': a Date object specifying when you would like the stream to start
 *                from, this would normally be at some point in the past although
 *                not too far back unless you want to be flooded with data.
 * - 'refreshRate': an integer specifying the length in milliseconds between each
 *                  refresh from the npm registry. This is the polling-frequency
 *                  and you can increase or decrease it from the default 30000 (30s).
 * - 'hostname': a string if you wish to specify a different registry other than
 *               the global npm registry.
 * - 'port': an integer if you wish to specify a different registry other than the
 *           global npm registry.
 */
/*
function publishes(options) {
  var stream = new NpmPublishStream(options);
  stream.on('data', console.dir.bind(console));
            /*
  return barrage().map(function (publish) {
    console.dir(publish);
  });
  *
}
publishes({
  startTime: new Date('2014-02-27'),
  refreshRate: 30000
})//.wait().done();
*/