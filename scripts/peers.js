var mongoose = require('mongoose')
  , lib = require('../lib/explorer')
  , db = require('../lib/database')
  , settings = require('../lib/settings')
  , request = require('request');

var COUNT = 5000; //number of blocks to index

function exit() {
  mongoose.disconnect();
  process.exit(0);
}

var dbString = 'mongodb://' + settings.dbsettings.user;
dbString = dbString + ':' + settings.dbsettings.password;
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + '/' + settings.dbsettings.database;

mongoose.connect(dbString, function(err) {
  if (err) {
    console.log('Unable to connect to database: %s', dbString);
    console.log('Aborting');
    exit();
  } else {
  
 
    db.delete_peers();

    var k=0;

    request({uri: 'http://127.0.0.1:' + settings.port + '/api/getpeerinfo', json: true}, function (error, response, body) {
      lib.syncLoop(body.length, function (loop) {
        var i = loop.iteration();
        var address = body[i].addr.split(':')[0];

	if (address == "127.0.0.1" || body[i].inbound == true) {
          // local peer or inbound peer, ignored
          loop.next();
        } else {
	  request({uri: 'http://freegeoip.net/json/' + address, json: true}, function (error, response, geo) {
            db.create_peer({
                address: address,
                protocol: body[i].version,
                version: body[i].subver.replace('/', '').replace('/', ''),
                country: geo.country_name
            }, function(){
              k++;
              loop.next();
            });
          });
        }
      }, function() {
        if (k > 1) {
          console.log('peers update complete (%s', k, ' peers)');
        } else {
          console.log('peers update complete (%s', k, ' peer)');
        }
        exit();
      });
    });
  }
});
