var express = require('express'),
	app = express(),
	logger = require('morgan'),
	server = require('http').createServer(app),
	mongoose = require('mongoose'),
	socket = require('./app/routes/socket').listen(server),
	port = process.env.PORT || 8080;
require('./app/routes/hive')(app);

// load db configs
var db = require('./config/database');

// db startup
mongoose.connect(db.url, function(err){
	if (err){
		console.error(err);
	} else {
		console.log('connected to mongodb');
	}
});

// public folder to share assets
app.use(express.static(__dirname + './public'));

// logging
app.use(logger("combined"));

// listen (start app with node server.js)
server.listen(port);
console.log('App listening on ' + port);

module.exports.closeServer = function(){
  server.close();
};

module.exports.s_server = server;
