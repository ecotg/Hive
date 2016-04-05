var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
	token: String,
	hive: String,
	created_on: {type: Date, default: Date.now}
}, {collection: 'token'});

module.exports = mongoose.model('Token', eventSchema, 'token');
