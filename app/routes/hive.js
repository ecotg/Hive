// hold all routes in a single file. If route becomes too code heavy
// load into controller and call it here
var Chat = require('../models/chat');
var Hive = require('../models/hive');
var Token = require('../models/token');

var root = process.cwd();

// expose routes to app
module.exports = function(app){

	// create hive
	app.get('/', function(req, res) {
		// create and use a createHive function
		res.sendFile('/public/html/index.html', {'root':root});  // this is a view file
	});

	app.get('/hive/public/*', function(req, res){
		var _file = req.params['0'];
		res.sendFile('./public/' + _file, {root: root});
	});

	app.get('/public/*', function(req, res){
		console.log(req.params);
		var _file = req.params['0'];
		res.sendFile('/public/' + _file, {root: root});
	});

	//everything else
	app.get("*", function(req, res){
		res.end("404"); // or res.redirect
	});
};