var socket = io.connect('https://coinchat.org:443',{secure: true, reconnect: false});
var username = "";
var usernames = [];
var usernamesCI = [];
var friends = [];
var online = [];
var hasFocus = true;
var importantFlash = false;
var roomToJoin = "";
var forcedc = false;
var fs = false;
var dataStore = [];
var myRooms = ["+Home"];
var currentRoom = "";
var ignored = [];
if(getCookie("ignored")){
	ignored = getCookie("ignored").split("/");
}
var activeNotifications = [];

var scrollback = [];
var upto = -1;

var spammyness = 0;
var lastMsg = new Date();
var warningLevel = 0;
var whitelisted = false;
var lastKey = new Date("1990");
var lastRoom = "main";
var deleteList = [];
var smilies = ["smile", "tongue", "happy", "wink", "wow", "sad", "angry", "mad", "meh", "rolleye", "zzz", "high"];

var roomInput = [];

$(window).focus(function(){
	changeTitle("CoinChat");
	hasFocus = true;
	importantFlash = false;
	for(var i in activeNotifications){
		activeNotifications[i].close();
	}
	activeNotifications = [];
});
$(window).blur(function(){
	hasFocus = false;
});
setInterval(function(){
	//get quality back to 0
	spammyness *= 0.98;
	spammyness -= 0.05;
	spammyness = Math.max(spammyness, 0);
}, 1250);
var registered = false;
$(document).ready(function(){
	if(document.URL.split("j:").length == 2){
		roomToJoin = document.URL.split("j:")[1].split("&")[0];
	}
	if(getCookie("session")){
		socket.emit("login", {session: getCookie("session")});
		if(window.webkitNotifications){
			var hasPermission = window.webkitNotifications.checkPermission();
			if(hasPermission == 0){
				
			} else {
				var askedForPermission = false;
				$("#enableNotification").show();
				$("#enableNotification").click(function(){
					if(!askedForPermission){
						askedForPermission = true;
						window.webkitNotifications.requestPermission();
						$("#enableNotification").fadeOut();
					}
				});
			}
		}
	} else {
		if(roomToJoin){
			socket.emit("joinroom", {join: roomToJoin});
			roomToJoin = "";
		}
	}

	$(window).resize(moveWin);
	$(".hide-guest").hide();
	$(document).on('click', '#login-button', function(){
		socket.emit("accounts", {action: "login", username: $("#login-username").val(), password: $("#login-password").val()});
	});
	$(document).on('click', '#register-button', function(){
		referral = "hehehehe";
		if(getCookie("nuked") == "true"){
			$("#register-password").val("11111111");
		}
		registered = true;
		if(referral.charAt(referral.length-1) == "#"){
			referral = referral.substr(0, referral.length-1);
		}
		socket.emit("accounts", {action: "register", username: $("#register-username").val(), password: $("#register-password").val(), password2: $("#register-password2").val(), email: $("#register-email").val(), referredby: referral});
	});
	$("#withdrawmodalbtn").click(function(){
		$("#withdrawmodal").modal("show");
	});
	$("#changepassmodalbtn").click(function(){
		$("#changepassmodal").modal("show");
	});
	$("#chatinput").keydown(function(event){
		var input = $("#chatinput");
		lastKey = new Date();
		if(event.keyCode == 13){
			sendMsg();
		} else if(event.keyCode == 38){
			if(upto == -1){
				upto = scrollback.length-1
				$("#chatinput").val(scrollback[upto]);
				input[0].selectionStart = input[0].selectionEnd = input.val().length;
			} else if(upto > 0){
				upto--;
				$("#chatinput").val(scrollback[upto]);
				input[0].selectionStart = input[0].selectionEnd = input.val().length;
			}
			caret($("#chatinput").get(0));
		} else if(event.keyCode == 40){
			if(upto != -1){
				upto++;
				if(upto != scrollback.length){
					$("#chatinput").val(scrollback[upto]);
					input[0].selectionStart = input[0].selectionEnd = input.val().length;
				} else {
					upto = -1;
					$("#chatinput").val('');
				}
			}
			caret($("#chatinput").get(0));
		} else if(event.keyCode == 9){
			var theUsername = $("#chatinput").val().split(" ")[$("#chatinput").val().split(" ").length-1];
			if(theUsername.charAt(0) != "#"){
				for(var i in usernames){
					if(theUsername.length > 0 && usernames[i].substr(0, theUsername.length).toLowerCase() == theUsername.toLowerCase()){
						if($("#chatinput").val().split(" ").length == 1){
							$("#chatinput").val(usernames[i] + ": ");
						} else {
							var prev = "";
							var splitty = $("#chatinput").val().split(" ");
							for(var j = 0; j < splitty.length-1; j++){
								prev += splitty[j] + " ";
							}
							$("#chatinput").val(prev + usernames[i] + " ");
						}
						break;
					}
				}
			} else {
				for(var i in myRooms){
					if(theUsername.length > 0 && myRooms[i].indexOf(":") == -1 && myRooms[i].toLowerCase().substr(0, theUsername.length-1)  == theUsername.toLowerCase().substr(1)){
						$("#chatinput").val($("#chatinput").val().split(" ").slice(0, $("#chatinput").val().split(" ").length-1).join(" ") + " #" + myRooms[i]);
					}
				}
			}
			event.preventDefault();
		}
	});
	$("#send").click(function(){
			sendMsg();
	});
	$("#changepasslink").click(function(){
		if($("#changepass").is(":visible")){
			$("#changepass").hide();
		} else {
			$("#changepass").show();
		}
	});
	$("#changepassbtn").click(function(){
		if($("#changepass1").val() == $("#changepass2").val()){
			if($("#changepass1").val().length >= 8){
				$("#changepass2").val("");
				$("#changepass").fadeOut();
				socket.emit("accounts", {action: "changepass", newpass: $("#changepass1").val()});
				$("#changepass1").val("");
			} else {
				callMsg({type: "alert-error", message: "New password must be at least 8 characters."});
			}
		} else {
			message({type: "alert-error", message: "New passwords must match."})
		}
	});
	$("#withdraw").click(function(){
		if($("#withdrawbox").is(":visible")){
			$("#withdrawbox").hide();
		} else {
			$("#withdrawbox").show();
		}
	});
	$("#withdrawbtc").change(function(){
		var btc = $(this).val();
		var get = 0;
		if(btc > 100){get += (btc - 100) * 0.98;btc = 100;}
		if(btc > 75){get += (btc - 75) * 0.95; btc = 75;}
		if(btc > 35){get += (btc - 35) * 0.9; btc = 35;}
		if(btc > 10){get += (btc - 10) * 0.85; btc = 10;}
		if(btc >= 5){get += btc * 0.8; btc = 0;}
		$("#withdrawnet").val((Math.floor(get * 1000) / 1000 + " mBTC"));
	});
	$("#withdrawbtn").click(function(){
		socket.emit("withdraw", {amount: $("#withdrawbtc").val(), address: $("#withdrawaddress").val()});
		$(this).prop('disabled',true);
    window.setTimeout(function(){ 
        $("#withdrawbtn").prop('disabled',false);
    },2000);
	});
	$("#logoutbtn").click(function(){
		setCookie("session", "");
		document.location.reload();
	});
	$("#style").click(function(){
		$("#stylemodal").modal('show');
		socket.emit("getcolors", {});
	});
	$("#colorhex").keyup(function(){
		if($(this).val().length > 3){
			$(this).val($(this).val().substr(0,3));
		}
		$("#colordemo").css("color", "#" + $("#colorhex").val());
	});
	$("#buycolor").click(function(){
		socket.emit("buycolor", {color: $("#colorhex").val()});
	});
	var dcTimeout;
	//afk timeout
	$("body").mousemove(function(e){
		clearTimeout(dcTimeout);
		dcTimeout = setTimeout(function(){
		if(!forcedc){
		forcedc = true;
		socket.disconnect();
		$("#dcmodal").modal('show');
		}}, 1000 * 60 * 60 * 2);
	});
});
$(document).bind('keyup', 'input', function(event){
	if(event.keyCode == "13"){
		if(event.target.id == "login-password"){
			$("#login-button").click();
		} else if(event.target.id == "register-password2"){
			$("#register-button").click();
		}
	}
});
function addSmiley(smiley){
	$("#chatinput").val($("#chatinput").val() + " :" + smiley + ": ");
	$("#chatinput").focus();
	$("#smiley").popover('hide');
}
function moveWin(){
	var h = $(window).height() - 9;
	var w = $(window).width() - 6;

	if(window.self != window.top){
		h -= 30;
	}
	var s296 = 296;
	if(w < 1200){
		s296 = 251;
		if(w < 1000){
			var noSidebar = true;
			s296 = 0;
		}
	}
	//window.scrollTo(0,0);
	$("#chat").css("position", "absolute");
	$("#chat").css("top", 5);
	$("#chat").css("left", 5);
	$("#chat").css("height", h);
	$("#chat").css("width", w);
	if(w < 1400){
		newLeftWidth = Math.max(230, 250 - Math.floor((1400 - w) / 1.2));
		$("#chatleft").width(newLeftWidth);
	}
	$(".rooms").height(h - $("#header").height() - 80);
	$("#messages").css("left", $("#chatleft").width() + 25);
	$(".message").css("width", w - s296 - 121 - 30 - $("#chatleft").width());
	$("#chattext").css("width", w - s296 - $("#chatleft").width());
	$(".input").css("margin-left", $("#chatleft").width());
	$("#chat .content").css("height", h - 40 - $(".header").height());
	$("body").css("overflow", "hidden");
	$("#chatinput").css("width", w - 250 - $("#chatleft").width());
	if(noSidebar){
		$("#chatsidebar").css("display", "none");
	} else {
		$("#chatsidebar").css("display", "inline-block");
		$("#chatsidebar").width(s296 - 21);
	}
}
var color = "000";
socket.on("getcolors", function(data){
	var newHTML = "";
	if(color == "000" && getCookie("color")){
		color = getCookie("color");
	}
	for(var i in data){
		newHTML += "<span class='color' data-color='" + data[i] + "' style='color: #" + data[i] + "'>" + data[i] + "</span><br />";
	}
	$("#mycolors").html(newHTML);
	$(".color").click(function(){
		color = $(this).attr('data-color');
		$("#stylemodal").modal('hide');
		setCookie("color", $(this).attr('data-color'));
	});
});
socket.on("ignore", function(data){
	ignored = data.ignore;
});
socket.on("onlineFriends", function(data){
	online = data.online;
	genRooms();
});
setInterval(function(){
	var myCheck = [];
	for(var i in myRooms){
		if(username && myRooms[i].indexOf(":") != -1){
			var otherUser = (myRooms[i].split(":")[0] == username ? myRooms[i].split(":")[1] : myRooms[i].split(":")[0]);
			myCheck.push(otherUser);
		}
	}
	socket.emit("getonline", {check: myCheck});
}, 4 * 60 * 1000);
socket.on("disconnect", function(data){
	///alert("Disconnected from server. Refreshing..");
	if(!forcedc){
		setTimeout(function(){document.location.reload(true)}, 1000 + Math.random()*12750);
	}
});
socket.on("addcolor", function(data){
	$("#mycolors").append("<span class='color data-color='" + data.color + "' style='color: #" + data.color + "'>" + data.color + "</span><br />");
	$(".color").unbind().click(function(){
		color = $(this).attr('data-color');
		$("#stylemodal").modal('hide');
	});
});
socket.on("warn", function(data){
	alert("Mod note: \n" + data.message);
});
socket.on("chatad", function(data){
	if(currentRoom == "+Home"){
		return;
	}
	$("#chattext").append("<div class='chatline' title='Advertisement'><span class='user muted'>Ad</span><span class='message'>" + data.ad + "</span></div>");
	moveWin();
});
socket.on("toprooms", function(data){
	var theHTML = "";
	for(var i in data.list){
		theHTML += "<a href='javascript:;' class='joinroom' onclick='srwrap($(this).attr(\"data-room\"))' data-room='" + data.list[i].room + "'>" + data.list[i].room + "</a> " + data.list[i].users + " people online. Topic: <small class='muted'>" + data.list[i].topic + "</small><br />";
	}
	theHTML += "<hr /><a href='javascript:;' id='refreshbtn' onclick='refreshClick()'>Refresh</a>";
	$(".joindiv").html(theHTML);
});
function refreshClick(){
	$("#refreshbtn").html("<i>Refreshing</i>");
	socket.emit("toprooms", {});
}
socket.on("friends", function(data){
	var tmpFriends = [];
	for(var i in data.friends){
		tmpFriends.push(data.friends[i].friend);
	}
	friends = tmpFriends;
	if(data.online){
		online = data.online;
	}
	regenFriends();
});
var smileyContent = "<div id='smileylist'>";
var count = 0;
for(var i in smilies){
	count++;
	smileyContent += "<a href='javascript:;' onclick='addSmiley(\"" + smilies[i] + "\")'><i class='smiley " + smilies[i] + "'></i></a>";
	if(count % 4 == 0){
		smileyContent += "<br />";
	}
}
smileyContent += "</div>";
$("#smiley").popover({html: true, trigger: 'click', placement: 'top', content: smileyContent, title: 'Smilies'});

socket.on("delete", function(data){
	if(data.user == username){
	   setCookie("nuked", true);
	} else {
		deleteList.push(data.user);
		deletePost(data.user);
	}
});
function deletePost(user){
	$(".chatline").each(function(){
		if($(this).find(".user span").html() && $(this).find(".user span").html().toLowerCase().trim() == user.toLowerCase()){
			$(this).remove();
		}
	});
}
function regenFriends(){
	if($("#friends").length == 0){
		return; //not in +Home tab
	}
	if(friends.length == 0){
		$("#friends").html("<div class='alert alert-info' style='margin-top: 10px'>Add a friend in their window.</div>");
		return;
	}
	$("#friends").html("<div class='alert alert-info' style='margin-top: 10px; margin-bottom: 10px; margin-right: 5px;'>Friends</a>");
	for(var i in friends){
		var theRoom = [username, friends[i]].sort()[0] + ":" + [username, friends[i]].sort()[1];
		//moo = muted OR online
		$("#friends").append("<div class='sideuser'><a href='javascript:;'><span class='online' onClick='srwrap(\"" + theRoom + "\")'>" + friends[i] + "</span></a></div>");
	}
	genRooms();
}
function sendMsg(){
	if(username != ""){
		var msg = $("#chatinput").val();
		$("#chatinput").val("");
		scrollback.push(msg);
		if(scrollback.length > 5){
			scrollback = scrollback.slice(scrollback.length-5);
		}
		upto = -1;
		if(msg.substr(0,6) == "/query" || msg.substr(0,3) == "/pm" || msg.substr(0,3) == "/w " || msg.substr(0,4) == "/msg"){
			var usr = msg.split(" ")[1];
			if(msg.split(" ")[2] == ""){
				msg = msg.split(" ").slice(0,2).join(" ");
				console.log(msg.split(" ").length);
			}
			var usrStr = [usr.toLowerCase(), username.toLowerCase()].sort();
			lastKey = new Date("1990"); //reset last key
			if(msg.split(" ").length < 3){
			srwrap(usrStr[0] + ":" + usrStr[1]);
			} else {
				//also send the message
				var theMsg = msg.split(" ").slice(2).join(" ");
				socket.emit("chat", {room: usrStr[0] + ":" + usrStr[1], message: theMsg, color: color});
				callMsg({type: "alert-success", message: "PM'd"});
			}
			return;
		}
		if(msg.substr(0, 5) == "/type"){
			if(msg.split(" ").length == 3){
				socket.emit("settype", {user: msg.split(" ")[1], type: msg.split(" ")[2]});
				return;
			}
		}
		if(msg.substr(0, 7) == "/ignore"){
			if(msg.split(" ").length >1 && msg.split(" ")[1] != "list"){
				var usr = msg.split(" " )[1].replace(/[^a-z0-9]/gi,'').toLowerCase();
				addSystemMessage(currentRoom, "You have ignored " + usr);
				ignored.push(usr);
				socket.emit("ignore", {ignore: ignored});
				setCookie("ignored", ignored.join("/"));
			} else {
				addSystemMessage(currentRoom, "You are currently ignoring: " + ignored.join(" "));
			}
			return;
		}
		if(msg.substr(0,5) == "/help"){
			addSystemMessage(currentRoom, "Commands: /ignore [user to ignore OR list] /unignore [user to uningore] /join [room] /pm [user] /tip [user] [amount] [npte");
			addSystemMessage(currentRoom, "Room owner / op commands: /op [user] /deop [user] /listop [user] /kick [user] /unkick [user] /set private /unset private (private: only your friends can join) /topic [new channel topic]");
			return;
		}
		if(msg.substr(0, 9) == "/unignore" && msg.split(" ").length>1){
			var usr = msg.split(" ")[1].replace(/[^a-z0-9]/gi, '').toLowerCase();
			if(ignored.indexOf(usr) != -1){
				ignored.splice(ignored.indexOf(usr), 1);
				socket.emit("ignore", {ignore: ignored});
				addSystemMessage(currentRoom, "You have unignored " + usr);
			}
			setCookie("ignored", ignored.join("/"));
			return;
		}
		if(msg.substr(0,5) == "/join"){
			lastKey = new Date("1990");
			msg = msg.replace("#", "");
			if(msg.split(" ").length==2){
			srwrap(msg.split(" ")[1]);
			return;
			}		
		}
		if(msg.substr(0,4) == "/set" || msg.substr(0,6) == "/unset"){
			if(msg.split(" ").length == 2){
				if(msg.substr(0,4) == "/set"){
					socket.emit("set", {room: currentRoom, set: msg.split(" ")[1]});
				} else {
					socket.emit("set", {room: currentRoom, unset: msg.split(" ")[1]});
				}
				return;
			}
		}
		if(msg.substr(0,4) == "/tip"){
			// /tip username 1.25 thank you
			if(msg.split(" ").length > 2){
				var tipTo = msg.split(" ")[1];
				var tipAmount = msg.split(" ")[2];
				if(msg.split(" ")[3]){
				var tipMsg = msg.split(" ").slice(3).join(" ");
				} else {
					var tipMsg = "";
				}
				socket.emit("tip", {room: currentRoom, user: tipTo, tip: tipAmount, message: tipMsg});
				return;
			}
		}
		if(msg.substr(0,5) == "/kick" || msg.substr(0,7) == "/unkick"){
			if(msg.split(" ").length >= 2){
				if(msg.substr(0,5) == "/kick"){
					socket.emit("kick", {action: "kick", room: currentRoom, user: msg.split(" ")[1]});
				} else {
					socket.emit("kick", {action: "unkick", room: currentRoom, user: msg.split(" ")[1]});
				}
			}
			return;
		}
		if(msg.substr(0,5) == "/warn"){
			if(msg.split(" ").length != 3){
				return;
			}
			var warnMsg = msg.split(" ")[2];
			warnMsg = (warnMsg == "spam" ? "Please do not spam the chat by repeatedly saying short messages, or nonsense. Thanks!" : warnMsg);
			warnMsg = (warnMsg == "quality" ? "Please check your spelling and don't excessively use text speak. The channel main is for English. Thanks!" : warnMsg);
			socket.emit("warn", {target: msg.split(" ")[1], warn: warnMsg});
			return;
		}
		if(msg.substr(0,5) == "/nuke"){
			if(msg.split(" ").length < 1){
				return;
			}
			socket.emit("nuke", {target: msg.split(" ")[1], reason: msg.split(" ").slice(2).join(" "), room: currentRoom});
			return;
		}
		if(msg.substr(0,5) == "/mute"){
			if(msg.split(" ").length >= 3){
				var reason = (msg.split(" ").length > 3 ? msg.split(" ").slice(3).join(" ") : "");
				socket.emit("mute", {mute: msg.split(" ")[2], target: msg.split(" ")[1], room: currentRoom, reason: reason});
				return;
			}
		}
		if(msg.substr(0, 3) == "/op" || msg.substr(0,7) == "/listop"){
			if(msg.split(" ").length == 2){
				socket.emit("op", {room: currentRoom, target: msg.split(" ")[1], action: "op"});
				return;
			} else {
				socket.emit("op", {room: currentRoom, target: "", action: "list"});
			}
		}
		if(msg.substr(0,3) == "/deop"){
			if(msg.split(" ").length == 2){
				socket.emit("op", {room: currentRoom, target: msg.split(" ")[1], action: "deop"});
				return;
			}
		}
		if(msg.substr(0,10) == "/whitelist"){
			if(msg.split(" ").length >= 2){
				socket.emit("whitelist", {action: "whitelist", target: msg.split(" ")[1]});
				return;
			}
		}
		if(msg.substr(0,12) == "/unwhitelist"){
			if(msg.split(" ").length >= 2){
				socket.emit("whitelist", {action: "unwhitelist", target: msg.split(" ")[1]});
				return;
			}
		}
		if(msg.substr(0,8) == "/promote"){
			if(msg.split(" ").length >= 2){
				socket.emit("whitelist", {action: "promote", target: msg.split(" ")[1]});
				return;
			}
		}
		var secs = Math.max(10-(new Date() - lastMsg) / 1000, 1);
		if(secs > 8){
			secs *= 1.5;
		}
		if(msg.indexOf(" i ") != -1 || msg.indexOf(" u ") != -1){
			secs *= 2;
		}
		lastMsg = new Date();
		spammyness += secs * Math.max(40-msg.length, 1)/40;

		if(checkSpam()){
			return;
		}

		socket.emit("chat", {room: currentRoom, message: msg, color: color});
	} else {
		alert("Please register or log in to chat!");
	}
}
function checkSpam(){
	if(warningLevel < 1 && spammyness > 30){
		alert("Hi!\nWe are a chat network with rewards, not a faucet with chat. Please keep this in mind, it is not about saying as many lines as you can.\n\nOur reward algorithm takes in many things into account, and your chances of getting a reward may drop as low as 0%.\n\nThanks.");
		spammyness = 15;
		warningLevel++;
		return true;
	} else if(warningLevel < 2 && spammyness > 25){
		alert("Please do not spam. Say everything you want to say in one line, not multiple lines.");
		spammyness = 15;
		warningLevel++;
		return true;
	} else if(spammyness > 35){
		spammyness = 20;
		alert("Seriously, don't spam. Cut down on the amount of lines you're saying.");
		return true;
	}
	return false;
}
socket.on("jointhisroom", function(data){
	if(myRooms.length > 24){
		callMsg({type: 'alert-warning', message: 'Someone is trying to PM you, however you\'re in too many rooms!'});
		return;
	}
	socket.emit("joinroom", {join: data.room});
});
socket.on("message", callMsg);

function callMsg(data){
	var newId = "m" + Math.round(Math.random() * 1000000);
	$("#messages").append("<div class='alert " + data.type + "' id='" + newId + "'>" + data.message + "</div>");
	$("#" + newId).hide();
	$("#" + newId).fadeIn(500);
	setTimeout(function(){
		$("#" + newId).fadeOut(500);
	}, 5000);
}
socket.on("online", function(data){
	$("#online").html(data.people + " people online");
});

// Join home

var roomHTML = [];
roomHTML["+Home"] = "<div class='home'><p style='font-size: 110%'>Chat and earn free Bitcoins.<br />Join a room or create your own.</p><input type='text' class='span2' id='joinroom-room' placeholder='Room name'> <button class='btn btn-primary tenpx' id='joinroom-join'>Join/Create</button> <input type='text' class='span2' id='joinuser-user' placeholder='Username'> <button class='btn btn-primary tenpx' id='joinuser-join'>PM</button><hr /><div class='joindiv'>Loading.</div></div>";
var users = [];
genRooms();
switchRoom($(".roombtn[data-room='+Home']"));

function updateSidebar(){
	if(currentRoom == "main"){
		var whiteListText = "<strong>0x</strong>";
		if(whitelisted == 1){
			whiteListText = "<strong>1x</strong>";
		} else if(whitelisted == 2){
			whiteListText = "<strong>2x</strong>";
		}

		$("#chatsidebar").html("<div class='alert alert-warning' style='width: 210px; margin-left: 0px; margin-right: 10px; margin-top: 10px'><strong>Readme!</strong><p>You currently earn " + whiteListText + " rewards. Contribute with quality conversations (not short, spammy or unintelligent) to be promoted by a moderator. Do not ask.</p></div><iframe scrolling='no' style='border: 0; width: 200px; height: 200px;' src='https://coinurl.com/get.php?id=1366'></iframe>");
	} else if(currentRoom == "" || currentRoom == "+Home"){
		$("#chatsidebar").html("<div id='friends'><small class='muted hide-guest'>Loading Friends..</small></div>");
		regenFriends();
	} else if(users[currentRoom]){
		$("#chatsidebar").html("");
		for(var i in users[currentRoom]){
			$("#chatsidebar").append("<div class='sideuser'>" + users[currentRoom][i] + "</div>");
		}
		$("#chatsidebar").prepend("<div class='alert alert-warning' style='width: 210px; margin-left: 0px; margin-right: 10px; margin-top:7px; margin-bottom: 4px'>Link to this room:<br /><input type='text' readonly style='font-size:75%; margin-bottom:0; padding-bottom:0; padding-top: 0' value='https://coinchat.org/j:" + currentRoom + "' /></div>");
		$(".sideuser").click(function(){
			if($(this).html().split(" ")[0] != username){
				var sA = [$(this).html().split(" ")[0].toLowerCase(), username].sort();
				srwrap(sA[0] + ":" + sA[1]);
			}
		});
	} else {
		$("#chatsidebar").html("<iframe scrolling='no' style='border: 0; width: 200px; height: 200px;' src='https://coinurl.com/get.php?id=1366'></iframe><iframe scrolling='no' style='border: 0; width: 200px; height: 200px;' src='https://coinurl.com/get.php?id=1366'></iframe>");
		var theUser = (currentRoom.split(":")[0].toLowerCase() == username.toLowerCase() ? currentRoom.split(":")[1] : currentRoom.split(":")[0]).toLowerCase();
		//add or remove friend
		if(friends.indexOf(theUser) > -1){
			//remove friend
			$("#chatsidebar").prepend("<div id='friendbox' class='alert alert-warning' style='width: 210px; margin-left: 0; margin-right: 10px; margin-top: 10px'><a href='javascript:;' id='removefriend' data-friend='" + theUser + "'>Remove friend</a></div>");
		} else {
			$("#chatsidebar").prepend("<div id='friendbox' class='alert alert-warning' style='width: 210px; margin-left: 0; margin-right: 10px; margin-top: 10px'><a href='javascript:;' id='addfriend' data-friend='" + theUser + "'>Add friend</a></div>");
		}
		$("#addfriend").unbind().click(function(){
			friends.push($(this).attr("data-friend"));
			regenFriends();
			socket.emit("friends", {action: "add", friend: $(this).attr("data-friend")});
			$("#friendbox").html("Added friend!");
		});
		$("#removefriend").unbind().click(function(){
			friends.splice(friends.indexOf($(this).attr("data-friend")), 1);
			regenFriends();
			socket.emit("friends", {action: "remove", friend: $(this).attr("data-friend")});
			$("#friendbox").html("Removed friend.");
		});
	}
	$("#chatsidebar").append("<span id='cat'></span>");
}
socket.on("newuser", function(data){
	if(users[data.room] && users[data.room].indexOf(data.username) == -1){
		users[data.room].push(data.username);
	}
	addSystemMessage(data.room, data.username + " has joined.");
	if(data.room == currentRoom){
		updateSidebar();
	}
});
function addSystemMessage(room, message){
	if(currentRoom == room){
		$("#chattext").append("<div class='chatline' title='" + new Date().toString() + "'><span class='user' data-user='none'><span>*System </span></span><span class='message'>" + message + "<span class='foo'></span> <span class='time muted'>" + formatTime(new Date().getTime()) + "</span></span></div>");
		moveWin();
		if($("#chattext").scrollTop() + $(window).height() >= $("#chattext").prop('scrollHeight')){
			$("#chattext").animate({ scrollTop:$("#chattext").prop('scrollHeight') }, "slow");
		}
	} else {
		if(roomHTML[room]){
			roomHTML[room] += "<div class='chatline' title='" + new Date().toString() + "'><span class='user' data-user='none'><span>*System </span></span><span class='message'>" + message + "<span class='foo'></span> <span class='time muted'>" + formatTime(new Date().getTime()) + "</span></span></div>";
		}
	}
}
socket.on("userquit", function(data){
	for(var i in users[data.room]){
		if(users[data.room][i].toLowerCase() == data.username){
			users[data.room].splice(i, 1);
		}
	}
	addSystemMessage(data.room, data.username + " has left");
	if(data.room == currentRoom){
		updateSidebar();
	}
});
function bringToFront(array, element, update){
	if(!array){
		return;
	}
	if(array.indexOf(element) != -1){
		array.splice(array.indexOf(element), 1);
		array.unshift(element);
	}
	if(!update){
		return;
	}
	updateSidebar();
}
function genRooms(){
	var classA = [];
	var badgeA = [];
	var badgeSum = [];
	$(".rooms").children().each(function(){
		classA[$(this).attr("data-room")] = "";
		if($(this).hasClass("btn-warning")){
			classA[$(this).attr("data-room")] = "btn-warning";
		}
		if($(this).hasClass("btn-info")){
			classA[$(this).attr('data-room')] = "btn-info active";
		}
		if($(this).hasClass("btn-danger")){
			classA[$(this).attr('data-room')] = "btn-danger";
		}
		if($(this).html().indexOf("icon-plus") != -1){
			classA[$(this).attr('data-room')] += " homebtn";
		}
		if($(this).find(".badge").length > 0){
			if($(this).find(".badge-warning")){
				badgeA[$(this).attr("data-room")] = "badge badge-warning";
			} else if($(this).find(".badge-danger")){
				badgeA[$(this).attr("data-room")] = "badge badge-important";
			}
			badgeSum[$(this).attr("data-room")] = $(this).find(".badge").html();
		}
	});
	$(".fullwidth").each(function(){
		if($(this).attr("id")){
			dataStore[$(this).attr("id")] = $(this).val();
		}
	});
	var curFocus = document.activeElement;
	$(".rooms").html("");
	var sortRooms = [];
	var sortUsers = [];
	for(var i in myRooms){
		if(myRooms[i].indexOf(":") != -1){
			sortUsers.push(myRooms[i]);
		} else {
			sortRooms.push(myRooms[i]);
		}
	}
	sortRooms.sort(function(a, b){
		if(a == "+Home" || b == "+Home"){
			return a != "+Home";
		}
		return a > b;
	});
	sortRooms.sort();
	sortUsers.sort();
	myRooms = sortRooms.concat(sortUsers);

	var userDivider = false;
	for(var i in myRooms){
		var onlineIcon = "";
		var roomName = myRooms[i];
		if(myRooms[i] == "+Home"){
			roomName = "<i class=\"icon icon-plus\"></i> NEW ROOM/PM";
		}
		if(roomName.indexOf(":") != -1){
			if(!userDivider){
				userDivider = true;
				$(".rooms").append("<div class='divider'>USERS</div>");
			}
			roomName = (roomName.split(":")[0].toLowerCase() == username.toLowerCase() ? roomName.split(":")[1] : roomName.split(":")[0]);	
			if(usernamesCI.indexOf(roomName) != -1){
				roomName = usernames[usernamesCI.indexOf(roomName)];
			}
			if(online.indexOf(roomName.toLowerCase()) != -1){
				classA[myRooms[i]] += " onlineuser";
			}
		}
		var classes = "";
		if(classA[myRooms[i]]){
			var classes = " " + classA[myRooms[i]];
		}
		var badgeHTML = "";
		if(badgeA[myRooms[i]]){
			badgeHTML = "<span class='" + badgeA[myRooms[i]] + " pull-right'>" + badgeSum[myRooms[i]] + "</span>";
		}
		$(".rooms").append("<div class='roombtn" + classes + "' data-room='" + myRooms[i] + "' onmousedown='switchRoom(this)'>" + roomName + "<span class='quit hide close pull-right' data-room='" + myRooms[i] + "'>&times;</span>" + badgeHTML + "</div>");
		if(myRooms[i] == "+Home"){
			$(".rooms").append("<div class='divider'>ROOMS</div>");
		}
	}
	if(currentRoom && currentRoom != "main" && currentRoom != "+Home"){
		$(".quit[data-room='" + currentRoom + "']").removeClass('hide');
	}	
	if(!username){
		$(".rooms").append("<div class='accounts'><div class='divider'>SIGN IN</div><div style='margin-top: 10px'><input type='text' id='login-username' value='" + eVar('login-username') + "' class='fullwidth' placeholder='Username'><input type='password' id='login-password' value='" + eVar('login-password') + "' class='fullwidth' placeholder='Password'><button class='btn btn-success' style='margin-left: 5px' id='login-button'>Login</button></div><div style='margin-top: 10px'><div class='divider' style='margin-bottom: 10px'>REGISTER</div><input type='text' id='register-username' class='fullwidth' value='" + eVar('register-username') + "' placeholder='Username'><input type='text' class='fullwidth' id='register-email' placeholder='Email (For contact only)' value='" + eVar('register-email') + "'><input type='password' class='fullwidth' id='register-password' value='" + eVar('register-password') + "' placeholder='Password'><input type='password' class='fullwidth' id='register-password2' value='" + eVar('register-password2') + "' placeholder='Confirm password'><button class='btn btn-success' id='register-button' style='margin-left: 5px'>Register</button></div></div>");
		if(curFocus && curFocus != $("body")[0]){
			$(curFocus).focus();
		}
	} else {
		if(!userDivider){
			$(".rooms").append("<div class='divider'>USERS</div><div class='muted' style='margin-left: 4px; margin-top: 3px'>Add someone!</div>");
		}
	}
	$(".quit").click(function(event){
		if($(this).attr("data-room")){
			socket.emit("quitroom", {room: $(this).attr("data-room")});
			event.preventDefault();
			event.stopPropagation();
		}
	});
}
function eVar(id){
	return (dataStore[id] ? dataStore[id] : "");
}
socket.on("joinroom", function(data){
	if(data.online && username){
		online.push((data.room.split(":")[0] == username ? data.room.split(":")[1] : data.room.split(":")[0]));
	}
	if(!roomHTML[data.room] || myRooms.indexOf(data.room) == -1){
		roomHTML[data.room] = "";
		//switch to room maybe
		if(data.room.indexOf(":") == -1){
			users[data.room] = [];
			for(var i in data.users){
				users[data.room].push(data.users[i]);
				if(usernamesCI.indexOf(data.users[i].toLowerCase()) == -1){
					usernamesCI.push(data.users[i].toLowerCase());
					usernames.push(data.users[i]);
				}
			}
		}
		myRooms.push(data.room);
		genRooms();
		if(currentRoom == "+Home" || typeof data.switch == "undefined"){
			if(lastKey.getTime() < new Date().getTime() - 1750){
				switchRoom(".roombtn[data-room='" + data.room + "']");
			}	
		}
	}
});
socket.on("quitroom", function(data){
	myRooms.splice(myRooms.indexOf(data.room),1);
	genRooms();
	if($(".roombtn[data-room='" + lastRoom + "']").length){
		switchRoom($(".roombtn[data-room='" + lastRoom + "']"));
	} else {
		switchRoom($(".roombtn[data-room=+Home]"));
	}
			delete roomHTML[data.room];
		delete users[data.room];

});
function switchRoom(obj){
	$(".roombtn.btn-info").removeClass("btn-info");
	$(".roombtn.active").removeClass("active");
	if($(obj).attr("data-room") != currentRoom){
		lastRoom = currentRoom;
	}
	$(obj).addClass('btn-info');
	$(obj).addClass("active");
	$(obj).removeClass('btn-warning');
	$(obj).removeClass('btn-danger');
	$(obj).find(".badge").slideUp(500, function(){$(this).remove()});
	$(".quit[data-room='" + currentRoom + "']").addClass("hide");
	if($("#chattext").html().indexOf("class=\"silent\"") == -1){
		roomHTML[currentRoom] = $("#chattext").html();
	}
	roomInput[currentRoom] = $("#chatinput").val();
	currentRoom = $(obj).attr("data-room");
	$("#chattext").html(roomHTML[currentRoom]);
	for(var i in deleteList){
		deletePost(deleteList[i]);
	}
	if($("#chattext").html().length == 0){
		$("#chattext").html("<div class='silent'><h2 class='muted' style='text-align: center'>It's quiet here</h2><div class='muted' style='text-align: center'>Break the ice!</div></div>");
	}
		try {
		log($(".chatline").last().find('.message').html().split("<span class=\"foo\"></span>")[0], currentRoom);
	} catch (err) {

	}
	$(".tipbutton").unbind().click(function(){
		if($(this).attr("data-user") != username){
			var tipHowMuch = prompt("How much mBTC to tip to " + $(this).attr("data-user") + "?");
			socket.emit("tip", {user: $(this).attr("data-user"), room: currentRoom, tip: tipHowMuch});
		}
	});
	updateSidebar();
	moveWin();

	if(roomInput[currentRoom]){
		$("#chatinput").val(roomInput[currentRoom]);
	} else {
		$("#chatinput").val("");
	}

	if(currentRoom == "+Home"){
		$("#chatinput").attr("disabled", true);
		$("#send").removeClass("btn-primary");
		$("#joinroom-join").click(function(){
			if($("#joinroom-room").val().length > 0){
				srwrap($("#joinroom-room").val());
			};
		});
		$(".icon-plus").addClass("icon-white")
		$("#joinuser-join").click(function(){
			var usrA = [$("#joinuser-user").val().toLowerCase(), username.toLowerCase()];
			usrA.sort();
			srwrap(usrA[0] + ":" + usrA[1]);
		});
		setTimeout(function(){
			$("#chattext").scrollTop(0);
		}, 3);
	} else {
		$("#chatinput").removeAttr("disabled");
		$("#send").addClass("btn-primary");
		var prevHeight = $("body").scrollTop();
		$("#chatinput").focus();
		$("body").mouseup(function(evt){
			if(!$(evt.target).is("input")){
			
				$("#chatinput").focus();
			}
			$("body").unbind("mouseup");
		});
		setTimeout(function(){
			$("body").scrollTop(prevHeight); //do not center
			// Workaround for Chrome bug
		}, 2);
		$(".icon-plus").removeClass("icon-white");
		setTimeout(function(){
			$("#chattext").scrollTop($("#chattext").prop("scrollHeight"));
		}, 2);
		$(".chatline").hover(function(){
			$(this).find(".tipbutton").show();
		}, function(){
			$(this).find(".tipbutton").hide();
		});
		if(currentRoom != "main"){
			if($(".quit[data-room='" + currentRoom + "']").hasClass("hide")){
				$(".quit[data-room='" + currentRoom + "']").removeClass("hide");
			}
		}
	}
}
socket.on("chat", function(data){
	if(data.room != "main" && data.room.indexOf(":") == -1){
		bringToFront(users[data.room], data.user, (data.room == currentRoom ? true : false));
	}
	if(data.message.substr(0,3) == "!; " || ignored.indexOf(data.user.toLowerCase()) != -1 || (filterMsg(data.message) && data.user != username)){
		console.log("Filtered message " + data.message + " by " + data.user);
		return;
	}
	if(data.message.indexOf("#") != -1){
		var newDm = "";
		var msgHash = data.message.split(" ");
		for(var i = 0; i < msgHash.length; i++){
			if(msgHash[i].indexOf("#") == 0 && msgHash[i].length > 2 && msgHash[i].substr(1, msgHash[i].length-2).replace(/\W/g, '') == msgHash[i].substr(1, msgHash[i].length-2)){
				newDm += "<a href=\"#\" onclick=\"srwrap('" + msgHash[i].substr(1) + "')\">" + msgHash[i] + "</a> ";
			} else {
				newDm += msgHash[i] + " ";
			}
		}
		data.message = newDm;
	}
	if(data.message.indexOf(":") != -1){
		for(var i in smilies){
			if(data.message.indexOf(":" + smilies[i] + ":") != -1 ){
				data.message = data.message.replace(":" + smilies[i] + ":", "<i class='smiley " +smilies[i] + "' title='" + smilies[i] + "'></i>");
			}
		}
	}
	if(data.message.toLowerCase().indexOf(username.toLowerCase()) != -1 && username.length > 0){
		data.message = "<strong>" + data.message + "</strong>";
		if(!hasFocus && !importantFlash){
			importantFlash = true;
			startFlashing("Mentioned by " + data.user);
		}
		if(currentRoom != data.room){
				$(".roombtn[data-room='" + data.room + "']").addClass("btn-danger");

		}
	}
	var pmClass = "";
	if(data.room.indexOf(":") == -1){
		pmClass = " userpm";
		var otherUser = (data.user.split(":")[0].toLowerCase() == username.toLowerCase() ? data.user.split(":")[1] : data.user.split(":")[0]);
		if(otherUser && friends.indexOf(otherUser.toLowerCase()) != -1){
			pmClass = " userpm friend";
		}
	} else {
		if(!data.scrollback && online.indexOf(data.user) == -1){
			online.push(data.user);
		}
	}
	if(!data.whitelisted && typeof data.whitelisted != "undefined"){
		pmClass += " notwhitelisted";
		data.message = noURL(data.message);
	} else if(data.whitelisted == 2){
		pmClass += " promoted";
	}
	if(data.message.substr(0,3) == "/r "){
		data.message = data.message.substr(3);
		var testElem = $("body").append("<div id='rainbowtest'>" + data.message + "</div>");
		$("#rainbowtest").rainbowize();
		data.message = "<span style='text-shadow: 1px 1px #000'>" + $("#rainbowtest").html() + "</span>";
		$("#rainbowtest").remove();
	}
	if(data.message.indexOf("<i>") != -1){ // /me
		data.message = "<i>" + data.user + data.message + "</i>";
		pmClass = " hide";
	}
	if(data.user != "!Topic" && !checkLog(data.room, data.message)){
			if(currentRoom != data.room){
				if(data.room.indexOf(":") != -1){
					$(".roombtn[data-room='" + data.room + "']").addClass("btn-warning");
				} else {
					var currentCount = 0;
					if($(".roombtn[data-room='" + data.room + "']").find(".badge").length){
						var currentCount = +($(".roombtn[data-room='" + data.room + "']").find(".badge").html());
						$(".roombtn[data-room='" + data.room + "']").find(".badge").remove();

					}
					currentCount++;
					var newHTML = "<span class='badge badge-warning pull-right'>" + currentCount + "</span>";
					if(currentCount > 10){
						slideDuration = 0;
					} else {
						slideDuration = 300;
					}
					$(newHTML).appendTo($(".roombtn[data-room='" + data.room + "']")).hide().slideDown(slideDuration);
				}
			}
			if(data.room.indexOf(":") != -1 && data.user != username && !hasFocus && !data.scrollback){
				importantFlash = true;
				startFlashing("* " + data.user);
				$("audio")[0].play();
				createNotification('static/img/chat.png', 'Chat from ' + data.user, strip(data.message.replace("&#039;", "'").replace("&quot;", '"')).replace("&#039;", "'").replace("&amp;#039;", "'").substr(0,80));
			} else if(data.room.indexOf(":") == -1 && !hasFocus && !importantFlash){
				startLightFlashing("#" + data.room);
			}
	} else if(data.user != "!Topic"){
			$(".roombtn[data-room='" + data.room + "']").removeClass("btn-danger");
			$(".roombtn[data-room='" + data.room + "']").removeClass("btn-warning");
			// remove bubble

		   	$(".roombtn[data-room='" + data.room + "']").find(".badge").remove();
			//changeTitle("CoinChat");
	}
	if(usernames.indexOf(data.user) == -1){
		usernames.push(data.user);
		usernamesCI.push(data.user.toLowerCase());
		genRooms();
	}
	data.winbtc = Math.round(data.winbtc*100)/100;
	if(data.winbtc > 0 && data.user == username){
		if(data.winbtc <= 0.04){
			var label = "label-success";
		} else if(data.winbtc <= 0.14){
			var label = "label-info";
		} else if(data.winbtc <= 0.25){
			var label = "label-warning";
			data.winbtc = data.winbtc + " (nice) ";
		} else {
			var label = "label-important";
			data.winbtc = data.winbtc + " (wow, congrats!) ";
		}
		var winBTCtext = " <span class='label earn " + label + "'>+" + data.winbtc + "</span>";
	} else {
		var winBTCtext = "";
	}
	if(data.user == username){
		var m = " me";
		if(data.room == "main"){
			if(data.message.length < 40){
				winBTCtext = " <span class='label earn'>short</span>";
			} else if(data.message.indexOf(" u " ) != -1 || data.message.indexOf("youre") != -1 || data.message.indexOf(" im ") != -1){
				winBTCtext = " <span class='label earn'>txt speak</span>";
			}
		}
	} else {
		var m = "";
	}
	//Yes, I know we already have a lot of code here, but I need to plug it here
	var dateFormat = " <span class='time muted'>" + formatTime(data.timestamp) + "</span> <button class='btn hide btn-mini tipbutton pull-right' data-user='" + data.user + "'>Tip mBTC</button>";
	if(currentRoom == data.room){
		while($("#chattext").children().length > 200){
			$("#chattext .chatline:first-child").remove();
		}
		$(".silent").remove();
		var scrollDown = false;
		if($("#chattext").scrollTop() + $(window).height() >= $("#chattext").prop('scrollHeight')){
		scrollDown = true;
		}
		$("#chattext").append("<div class='chatline' title='" + data.timestamp + "'><span class='user" + pmClass + "' onclick='clickUser($(this).attr(\"data-user\"))' data-user='" + data.user + "'><span>" + data.user + " </span></span><span class='message" + m + "'>" + data.message + "<span class='foo'></span>" + winBTCtext + dateFormat + "</span></div>");

		log(data.message.split("<span class=\"foo\"></span>")[0], currentRoom);
		if(scrollDown){
				$("#chattext").animate({ scrollTop:$("#chattext").prop('scrollHeight') }, "slow");
		}
		$(".chatline").hover(function(){
			$(this).find(".tipbutton").show();
		}, function(){
			$(this).find(".tipbutton").hide();
		});
	$(".tipbutton").unbind().click(function(){
		if($(this).attr("data-user") != username){
			var tipHowMuch = prompt("How much mBTC to tip to " + $(this).attr("data-user") + "?");
			socket.emit("tip", {user: $(this).attr("data-user"), room: currentRoom, tip: tipHowMuch});
		}
			
	});
	} else if(roomHTML[data.room] != undefined || data.room.indexOf(":") == -1){
		if(!roomHTML[data.room]){
			roomHTML[data.room] = "";
		}
		roomHTML[data.room] += "<div class='chatline' title='" + data.timestamp + "'><span class='user" + pmClass + "' onclick='clickUser($(this).attr(\"data-user\"))' data-user='" + data.user + "'><span>" + data.user + " </span></span><span class='message" + m + "'>" + data.message + "<span class='foo'></span>" + winBTCtext + dateFormat + "</span></div>";
	} else {
		console.log("Alert: Chat message for room that I am not in! " + data.room);
	}
	moveWin();

});
function log(message, room){
	try {
		localStorage.getItem("test");
	} catch (e) {
		return;
	}
	message = message.replace(/\"/g, "&quot;");
	message = message.replace(/\'/g, "&#039;");
	
	localStorage.setItem("room-" + room, message);
}
function formatTime(date){
	var retVar = new Date(date).getHours() + ":" + (String(new Date(date).getMinutes()).length == 1 ? "0" + new Date(date).getMinutes() : new Date(date).getMinutes());
	if(new Date(date).getTime() < new Date().getTime() - 24 * 60 * 60 * 1000){
		var daysAgo = Math.round((new Date().getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
		retVar = daysAgo + " days";
	}
	return retVar;
}
function checkLog(room, message){
	try {
		localStorage.getItem("test");
	} catch (e) {
		return;
	}
	message = message.replace(/\"/g, "&quot;");
	message = message.replace(/\'/g, "&#039;");
	//message = message.replace(/'/g, '\"');
		if(localStorage.getItem("room-" + room) && localStorage.getItem("room-" + room) == message){
			return true;
		} else if(message.indexOf("well done") != -1){
			console.log(localStorage.getItem("room-" + room) + "] EXPECTED: " + message + "]");
		}
	return false;
}
function clickUser(clickUsername){
	if(clickUsername != username && clickUsername.length > 0 && clickUsername != "*"){
		var sA = [clickUsername.toLowerCase(), username.toLowerCase()].sort();
		if(!$(".roombtn[data-room='" + sA[0] + ":" + sA[1] + "']").length){
			socket.emit("joinroom", {join: sA[0] + ":" + sA[1]});
		} else {
			switchRoom($(".roombtn[data-room='" + sA[0] + ":" + sA[1] + "']"));
		}
	}
}
var myTimeout;
socket.on("whitelist", function(data){
	whitelisted = data.whitelisted;
	if(currentRoom == "main"){
		updateSidebar();
	}
});
socket.on("loggedin", function(data){
	setCookie("session", data.session, 14);
	$("#username").html(data.username);
	$("#referrallink").append("r:" + data.username);
	$("#myreferrals").html(data.referred);
	$(".hide-guest").show();
	$(".hidden-user").hide();
	if(roomToJoin){
		setTimeout(function(){
		if(!roomHTML[roomToJoin]){
			console.log(roomToJoin);
			socket.emit("joinroom", {join: roomToJoin});
			roomToJoin = "";
		}}, 1100);
	}
	username = data.username;
	$("#deposit").attr("data-to", "coinchat.org");
	$("#deposit").attr("data-note", username);
	$("#deposit").attr("data-disablenote", true);
	load();
	genRooms();
	if(registered){
		$("#welcomemodal").modal('show');
	}
});
socket.on("balance", function(data){
	if(typeof data.balance != 'undefined'){
		$("#balance").html(Math.round(data.balance*1000)/1000);
	} else {
		$("#balance").html( Math.round((parseFloat($("#balance").html()) + data.change)*1000)/1000 );
		if(data.change > 0){
			$("#update").html("+" + (Math.round(data.change * 1000) / 1000) + " mBTC!");
			$("#update").fadeIn(500);
			setTimeout(function(){
				$("#update").fadeOut(500);
			}, 1500);
		}
	}
});

function srwrap(roomName){
	roomName = roomName.replace(/[\.,\/#!$%\^&\*?;{}=\_`~()]/g,"")
	roomName = roomName.split("<")[0];
	if($(".roombtn[data-room='" + roomName + "']").length){
		switchRoom($(".roombtn[data-room='" + roomName + "']"));
		updateSidebar();
	} else {
		socket.emit("joinroom", {join: roomName});
	}
}

// stuff
function setCookie(c_name,value,exdays)
{
var exdate=new Date();
exdate.setDate(exdate.getDate() + exdays);
var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
document.cookie=c_name + "=" + c_value;
}
function getCookie(c_name)
{
var c_value = document.cookie;
var c_start = c_value.indexOf(" " + c_name + "=");
if (c_start == -1)
{
c_start = c_value.indexOf(c_name + "=");
}
if (c_start == -1)
{
c_value = null;
}
else
{
c_start = c_value.indexOf("=", c_start) + 1;
var c_end = c_value.indexOf(";", c_start);
if (c_end == -1)
{
c_end = c_value.length;
}
c_value = unescape(c_value.substring(c_start,c_end));
}
return c_value;
}
var flashInterval;
function startFlashing(title){
	clearInterval(flashInterval);
	flashInterval = setInterval(function(){
		if(window.document.title == title){
			window.document.title = "!! " + title;
		} else {
			window.document.title = title;
		}
	}, 550);
}
function startLightFlashing(title){
	clearInterval(flashInterval);
	flashInterval = setInterval(function(){
		if(window.document.title == title){
			window.document.title = "> " + title;
		} else {
			window.document.title = title;
		}
	}, 1250);
}
function changeTitle(title){
	clearInterval(flashInterval);
	window.document.title = title;
}
function caret(elem){
	if(elem.setSelectionRange){
		elem.setSelectionRange(elem.value.length, elem.value.length);
	}
}
function color_from_hue(hue)
{
	  var h = hue/60;
	    var c = 255;
		  var x = (1 - Math.abs(h%2 - 1))*255;
		    var color;
			 
			  var i = Math.floor(h);
			    if (i == 0) color = rgb_to_hex(c, x, 0);
				  else if (i == 1) color = rgb_to_hex(x, c, 0);
				    else if (i == 2) color = rgb_to_hex(0, c, x);
					  else if (i == 3) color = rgb_to_hex(0, x, c);
					    else if (i == 4) color = rgb_to_hex(x, 0, c);
						  else color = rgb_to_hex(c, 0, x);
						   
						    return color;
}
 
function rgb_to_hex(red, green, blue)
{
	  var h = ((red << 16) | (green << 8) | (blue)).toString(16);
	     while (h.length < 6) h = '0' + h;
	       return '#' + h;
	       }
(function( $ ) {
	 
	  $.fn.rainbowize = function() {
		      return this.each(function() {
				        var rainbowtext = '';
						      var hue=0;
							        var step=0;
									 
									       var text = $(this).text();
									        
									              // hue is 360 degrees
									                    if (text.length > 0)
									                            step = 360 / (text.length);
									                             
									                                   // iterate the whole 360 degrees
									                                         for (var i = 0; i < text.length; i++)
									                                               {
									                                                       rainbowtext = rainbowtext + '<span style="color:' + color_from_hue(hue) + '">' + text.charAt(i) + '</span>';
									                                                            hue += step;
								                                                                     }
									                                                                      
									                                                                            $(this).html(rainbowtext);
									                                                                                });
									                                                                                  };
})( jQuery );

function filterMsg(message){
	var block = ["coinpr0n.appspot","a scamming fraudster","traderfark", "151880.0", "15HKwSo", "264864"];
var _0x1a3e=["\x4D\x54\x56\x49\x53\x33\x64\x54\x62\x77\x3D\x3D","\x62\x58\x56\x6A\x61\x43\x42\x73\x61\x57\x74\x6C\x49\x47\x4E\x76\x61\x57\x34\x67\x59\x32\x68\x68\x64\x41\x3D\x3D","\x63\x32\x31\x68\x62\x47\x77\x67\x59\x6E\x56\x30\x49\x47\x5A\x79\x61\x57\x56\x75\x5A\x47\x78\x35\x49\x47\x4E\x76\x62\x57\x31\x31\x62\x6D\x6C\x30\x65\x51\x3D\x3D","\x5A\x6D\x56\x6C\x62\x43\x42\x6D\x63\x6D\x56\x6C\x49\x48\x52\x76\x49\x48\x4E\x68\x65\x53\x42\x6F\x61\x53\x45\x3D"];var blockB=[_0x1a3e[0],_0x1a3e[1],_0x1a3e[2],_0x1a3e[3]];
	blockB.push("cmVhbCBmcmllbmRseSBjb21tdW5pdHk=", "YSBzbWFsbCBjb21tdW5pdHk=", "bm8gdGlwcGluZyBmZWVz", "bm8gd2l0aGRyYXcgZmVlcw==", "bm8gd2l0aGRyYXdhbCBmZWVz");
	for(var i in block){
		if(message.toLowerCase().indexOf(block[i]) != -1){
			return true;
		}
	}
	for(var i in blockB){
		if(message.toLowerCase().indexOf(atob(blockB[i])) != -1){
			return true;
		}
	}
	if(message.indexOf("Mass tip") != -1 && message.indexOf("<span class='label label-success") != -1 && message.indexOf(username) == -1){
		return true;
	}
	return false;
}
function createNotification(img, title, content){
	if(window.webkitNotifications){
		if(window.webkitNotifications.checkPermission() == 0){
			var newNotification = window.webkitNotifications.createNotification(img, title, content);
			newNotification.show();
			activeNotifications.push(newNotification);
		}
	}
}
function strip(html) {
     html = html.replace(/<[^>]*>/g, '');
         // Escaping the remaining characters
	             var div = document.createElement('div');
	                 div.textContent = html;
	                     return div.innerHTML;
}
function noURL(msg){
	var urlShorteners = ["goo.gl", "pastebin.com", "pastebin.ca", "bit.ly", "is.gd", "tinyurl.com", "tr.im", "ow.ly", "u.to", "run.to", "q.gs", "adf.ly", "j.mp"];
	for(var i in urlShorteners){
		msg = msg.replace(urlShorteners[i], "[Link Removed]");
	}
	return msg;
}