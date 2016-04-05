var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
	mode: String, // language
	owner: String, // nickname of
	hive: String,	// url id that the code/msg are on
	token: String, // used to invite friends
	created: {type: Date, default: Date.now}, //don't need to pass this in, ever
	// name: {'first': String, last:String}
	last_hive: {type: Date, default: Date.now}
}, {collection: 'hive'});

// export Chat model
module.exports = mongoose.model('Hive', eventSchema, 'hive');