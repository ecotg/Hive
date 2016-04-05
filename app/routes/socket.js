var socket_io = require('socket.io');
var uuid = require('node-uuid');
var Hive = require('../models/hive'); // how to do this properly
var Token = require('../models/token');
var Chat = require('../models/chat');

module.exports.joinHive = joinHive;
module.exports.sendNewMessage = sendNewMessage;
module.exports.createNewHive = createNewHive;

//FIXME: Use logging as well as console.log

var trimThenLower = function(data){
	//FIXME: make me handle dicts and just plain strings
	return data.trim().toLowerCase();
}

var getOldChats = function(data){
	console.log('about to query for old chats for ' + data.hive);
	var query = Chat.find({room: data.hive});
	query.nor([{msg: 'welcome'}, {msg: 'first chat'}]);
	query.limit(50).select('nick msg created').lean();
	query.exec(data.cb);
}

var hiveExists = function(data){
	console.log('about to query active hives for token >> ' + data.token);
	var query = Token.findOne({token: data.token}).lean();
	query.exec(data.cb);
}

// FIXME: remove this, re-use uniqueNick
var usrExists = function(data){
	console.log('querying for user: ' + data.nick)
	var nick = trimThenLower(data.nick);
	var hive = trimThenLower(data.hive);
	var query = Chat.findOne({nick: nick, hive: hive}).lean();
	query.exec(data.cb);
}

var uniqueNick = function(data){
	// call after ensuring hiveExists, need the hive name
	console.log('querying for unique nick: ' + data.nick)
	var nick = trimThenLower(data.nick);
	var hive = trimThenLower(data.hive);
	var query = Chat.findOne({nick: nick, hive: hive}).lean();
	query.exec(data.cb);
}

var uniqueHive = function(data){
	var hive = trimThenLower(data.hive);
	var query = Hive.findOne({hive: hive}).lean();
	query.exec(data.cb);
}

var whisper = function(data){
	var socket = data.socket;
	var msg = data.msg;

	var receiver = msg.replace('\\w ', '').split(" ")[0];
	var _msg_ = msg.replace('\\w ', '').replace(receiver, '');

	console.log('\nsecret message to ' + receiver);

	var sendWhisper = function(err, usr){
		if (err){
			console.log('Error in whispering');
			console.log(err);
			return;
		}

		if (usr !== null){
			// get socket id to send 1-2-1 message
			var socket_id = usr.socket;

			// params: nick, msg, room, hive
			var pm = new Chat({
				nick: socket.nickname,
				msg: _msg_,
				hive: socket.hive,
				room: socket.id +  ' -to- ' +  socket_id
			})

			// FIXME: Create a bi-directional record
			pm.save(function(err, data){
				if (err){
					console.log(err);
				}
				console.log('sending whisper to ' + receiver + '\n');
				io.to(socket_id).emit(
					'new msg', {msg: _msg_, nick: socket.nickname, date: Date.now(), 'seed': socket.id}
				);
			});
		} else {
			var err = 'Please enter an active user';
			io.to(socket.id).emit('invalid msg', {err: err});
		}
	}

	if (_msg_){
		usrExists({nick: receiver, hive: socket.hive, cb:sendWhisper});
	} else {
		var err = 'Please enter a message';
		console.log('Error. A null-string whisper\n');
		io.to(socket.id).emit('invalid msg', {err: err});
	}
}

var pullOldDocs = function(socket){
	var pageThru = function(err, docs){
		if (err) {
			console.log('\nError fetching old chats for hive > ' + socket.hive);
			console.log(err);
			return;
		}

		if (docs !== null){
			for (i = 0; i < docs.length; i++){
				var d = docs[i];
				io.to(socket.id).emit('new msg', {msg: d.msg, nick:  d.nick, date: d.created, 'seed': socket.id});
			}
		} else {
			console.log('\nFor hive: ' + socket.hive + 'no old messages found');
			console.log(docs);
		}
	};
	// make query
	getOldChats({hive:socket.hive, cb: pageThru});
}

var createNewHive = function(socket, data){
	var owner = String(data.nick).trim();
	var space = String(data.space).trim();

	var node = String(data.mode || '');
	console.log('\nCreating hive. Here is the data');
	console.log({owner: owner, space: space, node: node});

	var roomName = '/'+ owner + '/' + space;
	var createSpace = function(err, recs){
		if (err){
			console.log('uniqueNick err');
			console.log(err);
		}

		if (recs === null){
			console.log('Unique nick');
			socket.nickname = owner.toLowerCase();
			socket.hive = roomName.toLowerCase();
			// yay - hive can be created

			var hex = uuid.v4();
			console.log('hex for '+ roomName + ' : ' + hex);

			var token = new Token({token: hex, hive: roomName});
			token.save(function(err, ok){
				if (err){
					console.log(err);
				} else {
					console.log('created new token >> ' + token.token);
					console.log('usertoken '+ hex);
				}
		});

		var hive = new Hive({
			hive: socket.hive,
			owner: socket.nickname,
			token: hex,
			mode: node
		});

		hive.save(function(err, ok){
			if (err) {
				console.log(err);
				return;
			} else {
				// join new room and emit the token
				console.log(ok.inspect());
				console.log('joining new room ' +roomName);
				socket.join(roomName);
			}
	    });

	   // nick, msg, room, hive
	   var usr = new Chat({
	  	 nick: socket.nickname,
	  	 msg: socket.nickname + ' has joined the hive',
	  	 room: socket.hive,
	  	 hive: socket.hive,
	  	 socket: socket.id
	   });

	   usr.save(function(err, ok){
	   	if (err){
	  	 	console.log(err);
	  	 } else {
	  	 	console.log('Saving new user should emit\n');
	  	 	io.sockets.emit(
		  	 	'welcome',
		  	 	{
		  	 		token: hex,
		  	 		nick: socket.nickname,
		  	 		hive: socket.hive,
		  	 		date: Date.now()
		  	 	}
	  	 	);
	  	 }
	  });
	} else {
		console.log('Error. Non unique id, retry hive creation');
		console.log(recs);
		console.log('\n')
		var err = 'Nickname/Hivename already taken. Please enter different combination';
		io.to(socket.id).emit('invalid', {err: err});
	}
}
uniqueNick({hive: roomName, nick: owner, cb: createSpace});
};

var sendNewMessage = function(socket, data){
	var msg = data.trim();
	if (msg){ // catch empty strings
		if (msg.substr(0, 3) === "\\w "){ //it's a secret message
			whisper({socket: socket, msg: msg});
		} else {
			// params: nick, msg, room, hive
			var newMsg = new Chat({
				msg : msg,
				nick: socket.nickname,
				room: socket.hive,
				hive: socket.hive,
				socket: socket.id
			});
			newMsg.save(function(err){
				if (err) {
					console.log(err);
				} else {
					console.log('saving  ' + msg + '>> to the db');
					io.to(socket.hive).emit('new msg', {'msg': data, 'nick': socket.nickname, date: Date.now(), 'seed': socket.id});
				}
			});
		}
	} else {
		console.log('Error. Another null-msg.');
		io.to(socket.id).emit('invalid msg', {err: 'Please enter a message', nick: data.nick});
	}
}

var joinHive = function(socket, data){
	var nick = data.nick;
	var token = data.space;

	var joinHive = function(err, recs){
		if (err){
			console.log('Error in join hive');
			console.log(err)
		}
		if (recs !== null){
			var hive = recs.hive;
			console.log('we have that hive ' + hive);

			var createNick = function(err, recs){
				if (err){
					console.log('error in createNick');
					console.log(err);
				}

				if (recs === null){
					socket.nickname = nick;
					socket.hive = hive;

					var usr = new Chat({
				  		nick: socket.nickname,
				  		msg: socket.nickname + ' has joined the hive',
				  		room: socket.hive,
				  		hive: socket.hive,
				  		socket: socket.id
				  	});

				  	usr.save(function(err, ok){
				  	 	if (err){
				  	 		console.log(err);
				  	 	}
				  	 	console.log('created new user');
				  	 	socket.join(hive);
				  	 	// retrieve old chats from the room
				  	 	pullOldDocs(socket);
				  	 	// send welcome details
				  	 	console.log('about to emit welcome');
				  	 	io.emit(
				  	 		'welcome',
				  	 		{
				  	 			token: token,
				  	 			nick: socket.nickname,
				  	 			hive: socket.hive,
				  	 			date: Date.now()
				  	 		}
				  	 	);
				  	});
				} else {
					var err = 'Nickname is already taken. Please select another';
					console.log('invalid nick creation');
					io.to(socket.id).emit('invalid', {err: err});
				}
			}
			uniqueNick({hive: hive, nick: nick, cb: createNick});
		} else {
			console.log('Error. invalid hive join');
			console.log(recs);
			var err = 'Hmm. Can\'t seem to find that hive. Please crosscheck and retry';
			io.to(socket.id).emit('invalid', {err: err});
		}
	}
	hiveExists({token: token, cb: joinHive});
}


module.exports.listen = function(app){
	io = socket_io.listen(app);

	io.sockets.on('connection', function(socket){
		console.log('\nConnected to server side socket');

		socket.on('new space', function(data, callback){
			// FIX ME: Determine when/how to delete hives and users.
			console.log('In server creating new space');
			console.log(data);
			createNewHive(socket, data)
		});

		socket.on('send message', function(data){
			console.log('In server creating new message');
			console.log('In ' + socket.hive + ' got a message >> ' + data);
			sendNewMessage(socket, data);
		});

		socket.on('new user', function(data, callback){
			console.log('In server creating new user');
			console.log(data);
			joinHive(socket, data);
		});

		socket.on('debug', function(data){
			console.log('====== DEBUG MODE ======');
			io.emit('debug', {});
		});

		socket.on('disconnect', function(data){
			if (!socket.nickname){
				return;
			} else {
				//FIXME: Handle this well.
				console.log('Would be deleting '+ socket.nickname);
				io.to(socket.hive).emit('goodbye', socket.nickname);
			}
		});
	});
};
