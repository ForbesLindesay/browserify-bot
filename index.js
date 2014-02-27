'use strict';

var barrage = require('barrage');
var npmUpdates = require('./lib/check-npm');
var fetchNpm = require('./lib/fetch-npm');
var build = require('./lib/build');

var next = npmUpdates();
function pull() {
  next().then(function (pkg) {
    console.log(pkg.name + '@' + pkg['dist-tags'].latest);
    if (true || !/^0/.test(pkg['dist-tags'].latest)) {
      //console.dir(pkg);
      return fetchNpm(pkg).then(function () {
        return build(pkg);
      });
    }
  }).done(function (res) {
    pull();
  });
}
pull();



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