'use strict';

var Promise = require('promise');
var ms = require('ms');
var request = require('then-request');

function getPackages(registry, date) {
  return request(registry + '/-/all/since', {
    qs: {
      stale: 'update_after',
      startkey: date.getTime()
    }
  }).then(function (res) {
    var body = JSON.parse(res.getBody());
    return Object.keys(body).filter(function(key) {
      return key !== '_updated';
    }).map(function (key) {
      return body[key];
    });
  });
}

module.exports = npmUpdates;
function npmUpdates(options) {
  var updates = new Updates(options);
  return updates.getNext.bind(updates);
}


function Updates(options) {
  this.registry = (options || {}).registry || 'https://registry.npmjs.org';
  this.since = (options || {}).since || new Date(Date.now() - ms('5 minutes'));
  this.delay = (options || {}).delay || '1s';
  this.queue = [];
  this.returned = [];
}

Updates.prototype.getNext = function () {
  console.dir(this.queue.length);
  if (this.queue.length) {
    return Promise.from(this.queue.shift());
  }
  return this.getPackages().then(function (packages) {
    var ids = packages.map(function (pkg) {
      return pkg.name + '@' + pkg['dist-tags'].latest;
    });
    this.returned = this.returned.filter(function (id) {
      return ids.indexOf(id) !== -1;
    });
    packages.forEach(function (pkg) {
      var id = pkg.name + '@' + pkg['dist-tags'].latest;
      if (this.returned.indexOf(id) === -1) {
        this.queue.push(pkg);
        this.returned.push(id);
      }
    }.bind(this));
    if (this.queue.length === 0) {
      return delay(this.delay);
    }
  }.bind(this)).then(function () {
    return this.getNext();
  }.bind(this));
};

Updates.prototype.getPackages = function () {
  var start = new Date(Date.now() - ms('5 minutes'));
  return getPackages(this.registry, this.since).then(function (res) {
    this.since = start;
    return res.filter(function (pkg) {
      return pkg && typeof pkg === 'object' &&
        pkg.name && typeof pkg.name === 'string' &&
        pkg.name.indexOf('@') === -1 &&
        pkg['dist-tags'] && typeof pkg['dist-tags'] === 'object' &&
        pkg['dist-tags'].latest && typeof pkg['dist-tags'].latest === 'string' &&
        pkg['dist-tags'].latest.indexOf('@') === -1;
    });
  }.bind(this), function (err) {
    return this.getNext();
  }.bind(this));
};

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms(time + ''));
  });
}
