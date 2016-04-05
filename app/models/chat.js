var mongoose = require('mongoose');

var eventSchema = new mongoose.Schema({
	nick: String, // nickname of sender
	msg: String,	// chat message
	room: String,	// hive name or socket-2-socket concat name
	hive: String,	// hive name
	socket: String, // unguessed socket.io id, used for pming purposses
	created: {type: Date, default: Date.now} //don't need to pass this in, ever
}, {collection: 'chat'}); //override default collection name)

module.exports = mongoose.model('Chat', eventSchema, 'chat');
