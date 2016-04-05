jQuery(function($){
	console.log('started client-side socket');
	var socket = io.connect();
	var randCol = require('randomcolor');
	var $nickForm = $('#setNick');
	var $err = $('.Error');
	var $nickBox = $('#nickname');
	var $hiveBox = $('#hivename');
	var $hiveWrap = $('#hiveWrap');
	var $contentWrap = $('#contentWrap');
	var $chatForm = $('#send-message');
	var $messageForm = $('#send-message');
	var $messageBox = $('#the_message');
	var $roomToken = $('#roomToken');
	console.log('socket >>');
	console.log(socket);

	var timeDiff = function(tstamp){
		//FIXME: better naming of the input var
		var coeff = 1000 * 60
		var _now = Date.now();
		var _diff = Math.ceil((_now - tstamp) / coeff);

		if (_diff && _diff < 2){
			 return _diff + ' min ago'
		} else if (_diff && _diff < 60) {
			return _diff + ' mins ago'
		} else if (_diff && _diff > 60){
			var days = Math.ceil(_diff / 24);
			if (days < 1){
				return _diff + ' hours ago';
			} else {
				if (days < 7){
					return days + ' days ago';
				} else if (days == 7) {
					return '1 week ago'
				} else if (days > 7 && days < 14) {
					return days + ' days ago'
				} else if (days >= 14){
					var weeks = Math.ceil(days / 14);
					return weeks + ' weeks ago'
				}
			}
		} else {
			return '';
		}
	}

	var setTimeStamp = function(){
		setInterval(function(){
			$('[date-unix]').each(function(){
				var currTime = $(this).attr('date-unix');
				var diff = timeDiff(currTime);
				$(this).text(diff);
			});
		}, 10000);
	}

	//FIXME: Get randCol as avatars working.
	var randInt = function(strg){
		var digits = 0;
		for (i=0; i < strg.length; i++){
			if (isNaN(strg[i]) !== true) {
				digits += String(strg[i]);
			}
		}

		return randCol({seed: parseInt(digits)});
	}

	clearInterval(setTimeStamp);

	var _welcome = function(data){
		$nickBox.val('');
		$hiveBox.val('');
		$hiveWrap.hide()

		console.log('New User ' + $nickBox.val());
		console.log('\nNick >> ' + socket.nickname);

		// set a cookie so on refresh, does not remove the user
		Cookies.set('nick', data.nick, {expires: 7});
		Cookies.set('token', data.token, {expires: 7});
		Cookies.set('hive', data.hive, {expires: 7});

		// add in the room token
		$('#token').val(data.token);

		// FIX-ME: Avatars add in

		$contentWrap.show();
		$contentWrap.trigger('chat_view');
		$roomToken.show();

		// FIXME: server should broadcast this to whole room not just socket
		// FIXME: add code to display roomName and token, data.hive and data.token
	}

	//FIXME: ensure user does not lose connection on page refresh
	//Init this when all is done.
	// if (Cookies.get('nick')){
	// 	var data = {
	// 		nick: Cookies.get('nick'),
	// 		token: Cookies.get('token'),
	// 		hive: Cookies.get('hive')
	// 	}

	// 	// let them enter the room
	// 	// FIXME: Determine btw page refresh and closing that tab.
	// 	_welcome(data);
	// }

	var _invalid = function(data){
		console.log('nick already in use');
		$err.html(data.err);
		$err.show();

		// clear for retry
		$nickBox.val('');
		$hiveBox.val('');
		$hiveWrap.show();
	}

	var _invalid_msg = function(data){
		//FIXME: Figure out what to do with this.
		console.log('err for ' + data.nick + ' says: ' + data.err);
	}

	socket.on('invalid', _invalid);
	socket.on('welcome', _welcome);
	socket.on('invalid msg', _invalid_msg);

	var createHive = function(){
		$nickForm.submit(function(e){
			$err.hide();
			console.log('new space to create >> ' + $nickBox.val());
			e.preventDefault();
			var form = {
				nick: $nickBox.val(),
				space: $hiveBox.val(),
				node:'javascript'
			};
			socket.emit('new space', form)
		});
	}

	var joinHive = function(){
		$nickForm.submit(function(e){
			$err.hide();
			console.log('new user to submit '+$nickBox.val());
			e.preventDefault();

			var form = {
				nick: $nickBox.val(),
				space: $hiveBox.val(),
			};

			socket.emit('new user', form, function(data){
					if (data === true){
						console.log('new user ' + $nickBox.val());
						loggedIn = true;
						$('#hiveWrap').hide();
					} else {
						console.log('nick already in use');
						$err.html('This username is already taken. Try another one');
						$err.show();
					}
				}
			);
			$nickBox.val('');
			$hiveBox.val('');
		});
	}

	// what does user want to do
	$('.task').click(function(){
		console.log('changed');
		$err.hide();
		$contentWrap.hide();
		$hiveWrap.hide();
		$('#title').hide();

		var task = $(this).val().toLowerCase();
		console.log('User checked ' + task);

		if (task.indexOf('join') != -1) {
			console.log('joining');
			$('#choiceWrap').hide();
			$hiveWrap.show();
			joinHive();
		} else if (task.indexOf('create') != -1) {
			console.log('creating');
			$('#choiceWrap').hide();
			$hiveWrap.show();
			createHive();
		}
	});

	var displayMsg = function(data){
		var d = new Date(data.date)
		var diff = timeDiff(d.getTime());
		console.log('written ' + diff);
		$('.messages').append(
			'<div class="message"><div class="avatar"></div><h2>' + data.nick +
			'</h2><p>' + data.msg + '</p><p class="time" date-unix=' +
			d.getTime() +  '><span class="entypo-clock"></span>' +
			diff + '</p></div>'
		);
	};

	// update timestamps on each message
	$('#contentWrap').on('chat_view', function(){
		setTimeStamp();
		console.log('in chat view');
	});

	$messageForm.submit(function(e){
		console.log('Submitting chat message >> ' + $messageBox.val());
		e.preventDefault();
		var data = $messageBox.val();
		if (data){
			socket.emit('send message', data);
		} else {  //FIXME: might change this to simply do nothing
			_invalid_msg({nick: 'rand', err: 'Please enter a message'})
		}
		$messageBox.val(''); //reset
	});

	socket.on('new msg', function(data){
		console.log('emitting >> ' + data.msg);
		displayMsg(data);
	});
});