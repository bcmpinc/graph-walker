/*
	Graph walker - A simple 2-player graph walking game.
	Copyright (C) 2012, 2013  B. Conijn <bcmpinc@users.sourceforge.net>

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/ 

/*
	This file contains the game logic.
*/

// Static globals.
var SVG="http://www.w3.org/2000/svg"; // svg namespace
var XHTML="http://www.w3.org/1999/xhtml"; // xhtml namespace
var DEFAULT_DOT_RADIUS=20;
var NEAR_DOT_RADIUS=30;
var MOVE_DURATION=0.25;
var GLOBAL=this;
var NET={}
var $=function(a){return document.getElementById(a);};
var LS=localStorage?localStorage:{}

// Create and append a new element
// Don't use style in pars. Gives 'component not available' exception.
var add=function(nodetype,node,pars,ns){
	var e=document.createElementNS(ns||SVG,nodetype);
	for (var p in pars) {
		e.setAttribute(p,pars[p]);
	}
	node.appendChild(e);
	return e;
}

var remove=function(e) {
	if (e) e.parentNode.removeChild(e);
}

var add_class=function(e,cls) {
	e.setAttribute("class",e.hasAttribute("class")?e.getAttribute("class")+' '+cls:cls);
}
var remove_class=function(e,cls) {
	if(!e.hasAttribute("class")) return;
	var v = (' '+e.getAttribute("class")+' ').replace(' '+cls+' ',' ').trim();
	if(v)e.setAttribute("class",v);
	else e.removeAttribute("class");
}

var generate_uid = function(){
	var string = navigator.userAgent;
	var hash = new Date().getTime(), i, char;
	for (i = 0; i < string.length; i++) {
		hash = ((hash<<5)-hash)+string.charCodeAt(i);
		hash = hash & hash; // Convert to 32bit integer
	}
	if (hash<0) hash = hash + 0x100000000;
	return hash.toString(36);
};

// Initialize or reset non-static game specific globals.
var reset=function() {
	GLOBAL.map=[]; // a list of all nodes contained in the map.
	GLOBAL.current={}; // stores information about the current state.  It has the fields:
	// - 'node' the currently visited node,
	// - 'can_move' boolean that is set to true when the player is allowed to make a move,
	// - 'player' the player that is allowed to make the next move, value is "p1" or "p2".
	GLOBAL.msgs={}; // contains text elements for 'notice', 'p1' and 'p2'.
	GLOBAL.ai_data={p1:{},p2:{}}; // contains auxiliary data for the ai's
	GLOBAL.exits={p1:[],p2:[]}; // contains lists of exists. One for each player.
}

// If this node has only one edge remaining, then remove that edge.
// In that case prune the neighbouring node as well.
// This avoids any player to easily force a draw.
var prune_node=function(n) {
	// Do not prune exit nodes.
	if (n.exit) return;
	var count = 0;
	var last;
	for (var j in n.edges) {
		var e=n.edges[j];
		if(!e.used) {
			count++;
			last = e;
		}
	}
	// Node is a dead end, prune it.
	if (count<=1) {
		add_class(n.element,"pruned");
	}
	if (count==1) {
		last.used=true;
		add_class(last.element,"pruned");
		prune_node(last.a==n?last.b:last.a);
	}
}

// Check the validity of the move
// If valid, mark the used edge as used.
var is_move_valid=function(n) {
	// a 'pass' is always valid
	if (n==current.node) return true;
	// Check if the new node is a neighbour of the current node, through an unused edge.
	for (var j in current.node.edges) {
		var e=current.node.edges[j];
		if(!e.used && (e.a==n || e.b==n)) {
			// It is valid. Apply the move.
			// Mark edge as used.
			add_class(e.element,"used");
			add_class(e.element,current.player);
			e.used=true;
			// Move is valid
			return true;
		}
	}
	return false;
}

// Checks whether the move is actually valid.
// If this is the case, initiate a move to the given node.
// Updating status and visual information of points and the walked edge.
var initiate_move=function(n) {
	// Verify that the game is still running
	if (!current.can_move) return false;
	
	// Check if the clicked node is a valid move.
	if (!is_move_valid(n)) return false;

	// clear previous allowed move markers
	for (var j in current.node.edges) {
		var e=current.node.edges[j];
		remove_class(e.a.element,"near");
		remove_class(e.b.element,"near");
		e.a.element.setAttribute("r",DEFAULT_DOT_RADIUS);
		e.b.element.setAttribute("r",DEFAULT_DOT_RADIUS);
	}

	// mark previous node as used. visualize new node (temporarily) as unused.
	if (n!=current.node) {
		add_class(current.node.element,"used");
		current.node.used=true;
		remove_class(n.element,"used");
	}

	// Move animation & current point color.
	// current.anim.setAttribute("transform","translate("+n.x+","+n.y+")");
	current.translate.setAttribute("values",current.node.x+","+current.node.y+";"+n.x+","+n.y);
	current.translate.beginElement();
	setTimeout(update_current, MOVE_DURATION*1000);

	// Remove color from current node
	remove_class(current.node.element,current.player);
	prune_node(current.node);
	current.node=n;
	current.can_move=false;
	return true;
}

// After finishing the animation
// Update the visuals for the new position
var update_current=function() {
	var n = current.node;
	if (n.exit) {
		// Provide end-of game message.
		msgs.notice.data=LS["name_p"+n.exit]+" has won!";
		add_class(msgs.notice.parentNode,"p"+n.exit);
		return;
	}
	current.can_move=true;
	if (!n.used) {
		// Change player if an unused node is hit.
		remove_class(current.anim,current.player);
		current.player = (current.player=="p1")?"p2":"p1";
		add_class(current.anim,current.player);
	}
	add_class(n.element,current.player);

	// Create new allowed move markers
	var last=false;
	var options=0;
	for (var j in n.edges) {
		var e=n.edges[j];
		if(!e.used) {
			var m=e.a==n?e.b:e.a;
			add_class(m.element,"near");
			m.element.setAttribute("r",NEAR_DOT_RADIUS);
			last=m;
			options++;
		}
	}

	if (options==0) {
		// Check for a tie.
		msgs.notice.data="The game is a tie!";
	} else if (options==1) {
		// Only one valid move available, so execute it immediately.
		initiate_move(last);
	} else {
		if (selected_ai[current.player]) {
			var move = selected_ai[current.player](ai_data[current.player]);
			if (!move) {
				msgs.notice.data=LS["name_"+current.player]+" has given up!";
				add_class(msgs.notice.parentNode,current.player);
				current.can_move=false;
				return;
			} else {
				initiate_move(move);
			}
		}
	}
}

// Adds an event handler for a point.
var add_move_handler=function(n) {
	n.element.addEventListener("click",function() {
		if (n==current.node) return;
		// Attempt to change the current position.
		var moved = initiate_move(n);
		if (NET.game && moved) {
			NET.channel.trigger("client-move-"+NET.game, {node: n.id});
		}
	},false);
}

// Create the user interface
var build_interface=function(){
	var root=$("root");
	// Remove any old interface
	while (root.childNodes.length>0) root.removeChild(root.lastChild);
	// Build the new one
	var texts=add("g",root,{class:"text"});
	var grid=add("g",root,{class:"grid"});
	current.anim=add("g",root,{class:"current"});
	var points=add("g",root,{class:"points"});
	msgs.notice = document.createTextNode("Welcome to Graph Walker.");
	add("text",texts,{x:0,y:930}).appendChild(msgs.notice);
	msgs.p1 = document.createTextNode("");
	add("text",texts,{x:-500,y:-870,class:"p1"}).appendChild(msgs.p1);
	msgs.p2 = document.createTextNode("");
	add("text",texts,{x: 500,y:-870,class:"p2"}).appendChild(msgs.p2);
	msgs.ng = document.createTextNode("New Game");
	add("text",texts,{x:-500,y:930,class:"ng",transform:"rotate(-90)"}).appendChild(msgs.ng);
	msgs.ng.parentNode.addEventListener("click",function(){$("form").style.display="block"; if(NET.disconnected) {NET.disconnected = false; pusher.connect();}});

	// Create nodes and edges svg-elements.
	for (var i in map) {
		var n=map[i];
		// Create exit lists.
		if (n.exit) exits["p"+n.exit].push(n);
		// Create the node.
		n.element=add("circle",points,{cx:n.x,cy:n.y,r:DEFAULT_DOT_RADIUS});
		if (n.exit) n.element.setAttribute("class",["","exit p1","exit p2"][n.exit]);
		if (n.used) add_class(n.element,"used");

		// Add an click event handler to the node.
		add_move_handler(n);
		for (var j in n.edges) {
			var e=n.edges[j];
			if(!e.element) {
				// Create the edge.
				e.element=add("line",grid,{x1:e.a.x,y1:e.a.y,x2:e.b.x,y2:e.b.y});
				if (e.used) e.element.setAttribute("class","used initial");
			}
		}
	}

	// Do initial pruning.
	for (var i in map) {
		prune_node(map[i]);
	}
	
	// Create current animation.
	for (var i=0; i<2; i++) {
		var c=add("circle",current.anim,{cx:0,cy:0,r:0,class:"wave"});
		add("animate",c,{attributeName:"r", dur:"2s", begin:-i, values:"10;50", repeatCount:"indefinite"});
		add("animate",c,{attributeName:"stroke-width", dur:"2s", begin:-i, values:"20;0", repeatCount:"indefinite"});
	}
	add("circle",current.anim,{cx:0,cy:0,r:DEFAULT_DOT_RADIUS});
	current.translate = add("animateTransform",current.anim,{attributeName:"transform", type:"translate", begin: "indefinite", dur:MOVE_DURATION, fill:"freeze"});
	current.translate.setAttribute("values",current.node.x+","+current.node.y);
	current.translate.beginElement();
	//current.translate.addEventListener("endEvent", update_current, false);
}

var network_player=function(data) {
	current.can_move=true;
	if (data.node) {
		var n = map[data.node];
		if (n) initiate_move(n);
	}
	current.can_move=false;
	if (data.start) {
		current.can_move = (current.player == NET.me);
		NET.opponent = NET.game;
	}
	return true;
}

// Starts a new game, destroying the previous one.
var new_game=function() {
	// Sanity checking. Network player must play against human.
	var ai1 = $("ai_p1").selectedIndex;
	var ai2 = $("ai_p2").selectedIndex;
	if (typeof pusher!="undefined") {
		if (!AI[ai2]) ai1=0;
		if (!AI[ai1]) ai2=0;
		delete NET.game;
		delete NET.opponent;
		
		if (AI[ai1] && AI[ai2]) {
			$("network").disabled="disabled";
			pusher.disconnect();
			network_enter_channel({});
			NET.disconnected = true;
			NET.pending = false;
		} else if (NET.pending) {
			NET.pending = false;
			// Make sure we are anonymous (in case of network play).
			network_enter_channel({}, new_game);
			$("form").style.display="none";
			return;
		}
	}
	
	// Create interface
	LS.map=$("map").selectedIndex;
	reset();
	MAPS[LS.map].fun();
	build_interface();

	// Select player info.
	var color;
	var name;
	if (AI[ai1]) {
		var color_p1=LS.color_p1=$("color_p1").value;
		color=color_p1;
		name=LS.name_p1=$("name_p1").value;
		LS.ai_p1=ai1;
		msgs.p1.textContent=LS.name_p1;
		var ai1_fun=AI[LS.ai_p1].fun;
	} else {
		NET.game=$("ai_p1").options[ai1].id.slice(5);
		var info = NET.channel.members.get(NET.game).info;
		msgs.p1.textContent=info.name;
		var color_p1=info.color;
		var ai1_fun=network_player;
		var other=1;
	}
	if (AI[ai2]) {
		var color_p2=LS.color_p2=$("color_p2").value;
		color=color_p2;
		name=LS.name_p2=$("name_p2").value;
		LS.ai_p2=ai2;
		msgs.p2.textContent=LS.name_p2;
		var ai2_fun=AI[LS.ai_p2].fun;
	} else {
		NET.game=$("ai_p2").options[ai2].id.slice(5);
		var info = NET.channel.members.get(NET.game).info;
		msgs.p2.textContent=info.name;
		var color_p2=info.color;
		var ai2_fun=network_player;
		var other=2;
	}
	
	// Network stuff
	if (NET.game) {
		NET.channel.bind("client-move-"+NET.game, network_player);
		NET.channel.trigger("client-init-"+NET.game, {map: LS.map, you:other, name:name, color: color, start: current.player, opponent: NET.user_id});
		NET.me = "p"+(3-other);
	}
	
	// Latest stuff
	GLOBAL.selected_ai={p1:ai1_fun,p2:ai2_fun};
	$("player_colors").textContent=
		"svg .p1{fill:"+color_p1+"; stroke:"+color_p1+";}\n" +
		"svg .p2{fill:"+color_p2+"; stroke:"+color_p2+";}\n";
	$("form").style.display="none";
	$("cancel").style.display="inline";
	
	// Start!
	update_current();
}

var network_game_start=function(data) {
	// Create interface
	reset();
	MAPS[data.map].fun();
	build_interface();

	// Select player info.
	if (data.you==1) {
		msgs.p1.textContent=LS.name_nw;
		msgs.p2.textContent=data.name;
		GLOBAL.selected_ai={p1:0,p2:network_player};
		$("player_colors").textContent=
			"svg .p1{fill:"+LS.color_nw+"; stroke:"+LS.color_nw+";}\n" +
			"svg .p2{fill:"+data.color+"; stroke:"+data.color+";}\n";
	} else {
		msgs.p1.textContent=data.name;
		msgs.p2.textContent=LS.name_nw;
		GLOBAL.selected_ai={p1:network_player,p2:0};
		$("player_colors").textContent=
			"svg .p1{fill:"+LS.data.color+"; stroke:"+LS.data.color+";}\n" +
			"svg .p2{fill:"+color_nw+"; stroke:"+color_nw+";}\n";
	}
	current.player = data.start;
	NET.me = "p"+data.you;
	NET.opponent = data.opponent;
	
	// Latest stuff
	$("form").style.display="none";
	$("cancel").style.display="inline";
	
	// Start!
	update_current();
	
	// Network stuff
	current.can_move = false;
	network_enter_channel({}, function(){
		current.can_move=(current.player==NET.me);
		NET.channel.bind("client-move-"+NET.game, network_player);
		NET.channel.trigger("client-move-"+NET.game, {start: 1});
	});
}

// Waits for an incomming network game, destroying the previous one.
// Updates channel info to accepting status.
// 
var network_game=function() {
	LS.color_nw=$("color_nw").value;
	LS.name_nw=$("name_nw").value;
	$("player_colors").textContent=
		"svg .nw{fill:"+LS.color_nw+"; stroke:"+LS.color_nw+";}\n";
	reset();
	$("form").style.display="none";
	$("cancel").style.display="inline";
	
	// Show a message
	var root=$("root");
	// Remove any old interface
	while (root.childNodes.length>0) root.removeChild(root.lastChild);
	// Build the new one
	var texts=add("g",root,{class:"text"});
	msgs.notice = document.createTextNode("Waiting for other player...");
	add("text",texts,{x:0,y:930,class:"nw"}).appendChild(msgs.notice);
	msgs.ng = document.createTextNode("New Game");
	add("text",texts,{x:-500,y:930,class:"ng",transform:"rotate(-90)"}).appendChild(msgs.ng);
	msgs.ng.parentNode.addEventListener("click",function(){$("form").style.display="block";});
	
	// Network stuff
	delete NET.opponent;
	NET.game = NET.user_id;
	NET.pending = true;
	network_enter_channel({name: LS.name_nw, color: LS.color_nw}, function(){
		NET.channel.bind("client-init-"+NET.game, network_game_start);
	});
}

var network_add_user=function(data){
	if (!data.info || !data.info.name) return;
	var ps=["nwp1-","nwp2-"];
	var aip=[$("ai_p1_nw"),$("ai_p2_nw")];
	for(i in ps) {
		var id = ps[i]+data.id;
		var old = $(id);
		if (!old) {
			var option = add("option",aip[i],{id: id},XHTML);
			option.appendChild(document.createTextNode(data.info.name));
			option.style.color = data.info.color;
		}
	}
}

// Connect to multiplayer channel
var network_enter_channel=function(info, callback) {
	if (typeof pusher=="undefined") return;
	if (NET.channel) pusher.unsubscribe('presence-graphwalker');
	$("network").disabled="disabled";
	NET.user_info = {user_id: NET.user_id, user_info: info};
	var aip=[$("ai_p1_nw"),$("ai_p2_nw")];
	for(i in aip) {
		while (aip[i].childNodes.length>0) aip[i].removeChild(aip[i].lastChild);
	}
	setTimeout(function(){
		NET.channel = pusher.subscribe('presence-graphwalker');
		NET.channel.bind('pusher:subscription_succeeded', function(members) {
			$("network").disabled="";
			NET.channel.members.each(network_add_user);
			if (callback) callback();
		});
		NET.channel.bind('pusher:member_added', network_add_user);
		NET.channel.bind('pusher:member_removed', function(data) {
			remove($("nwp1-"+data.id));
			remove($("nwp2-"+data.id));
			if (data.id==NET.opponent) {
				msgs.notice.textContent = "You opponent has disconnected";
			}
		});
	}, 500);
}

// Initialize
var init=function() {
	// Create header elements
	add("style", document.head, {}, XHTML).textContent = 
'#game{text-align:center;}\n\
form{margin: 100px auto; display:table; border:2px solid black; background:white;}\n\
div.ng{position: fixed; top:0; bottom:0; left:0; right:0; background: rgba(0,0,0,0.1);}\n\
table input{width: 100px;}\n\
\n\
svg{width:500px; height:500px; border: 2px solid black; background:white;}\n\
text{font-size:100px; text-anchor:middle; stroke:none !important; stroke-width:0 !important;}\n\
.grid{stroke:gray; stroke-width:3;}\n\
.grid .used{stroke-width:15;}\n\
.grid .pruned{stroke-width:15;stroke:lightgray;}\n\
\n\
.current .wave{fill:transparent !important;}\n\
.current {stroke:black; stroke-width:0;}\n\
\n\
.points{fill:black; stroke:black !important;stroke-width:5;}\n\
.points .near{stroke-width:10; cursor:pointer; pointer-events: all;}\n\
.points .used{fill:gray;}\n\
.points .pruned{fill:white;stroke:lightgray;}\n\
.initial{stroke:black;}\n\
text.ng{fill:gray;cursor:pointer;}\n\
text.ng:hover{fill:black;}';
	add("style", document.head, {id: "player_colors"}, XHTML);

	// Create base elements
	var game = $("game")
	var root = add("svg", game, {viewBox: "-1000 -1000 2000 2000", id: "root"});
	var form = add("div", game, {id: "form", class: "ng"},XHTML);

	// Check for errors.
	var missing = []
	if (typeof AI   == "undefined") missing.push("AIs");
	if (typeof MAPS == "undefined") missing.push("Maps");
	if (missing.length>0) {
		form.innerHTML="<h1>Graph Walker</h1><b>Error: Missing "+missing.join(" & ")+"</b>";
		return;
	}
	
	// Create new-game form
	form.innerHTML=
'<form><h1>Graph Walker</h1>\
<p><b>Map:</b> <select id="map"></select></p>\
<table>\
<tr><th></th><th>Name</th><th>Color</th><th>AI</th></tr>\
<tr><td>1</td><td><input id="name_p1"></td><td><input id="color_p1"></td><td><select id="ai_p1"></select></td></tr>\
<tr><td>2</td><td><input id="name_p2"></td><td><input id="color_p2"></td><td><select id="ai_p2"></select></td></tr>'+
(typeof pusher=="undefined"?'':'<tr><td> </td><td><input id="name_nw"></td><td><input id="color_nw"></td><td><input type="button" id="network" value="multiplayer" disabled="disabled"></td></tr>')+
'</table><input type="button" id="newgame" value="New Game"/><input type="button" id="cancel" value="Cancel"/></form>';

	// Fill Map combobox
	var map = $("map")
	for (var i in MAPS) {
		add("option",map,{},XHTML).appendChild(document.createTextNode(MAPS[i].name));
	}

	// Fill Ai comboboxes
	var aip=[$("ai_p1"),$("ai_p2")];
	for (var j in aip) {
		for (var i in AI) {
			add("option",aip[j],{},XHTML).appendChild(document.createTextNode(AI[i].name));
		}
		if (typeof pusher!="undefined") {
			add("optgroup",aip[j],{id:"ai_p"+(j- -1)+"_nw",label:"Network:"},XHTML);
		}
	}

	// Set initial info
	$("name_p1").value=LS.name_p1||"Player Red";
	$("name_p2").value=LS.name_p2||"Player Blue";
	$("color_p1").value=LS.color_p1||"red";
	$("color_p2").value=LS.color_p2||"blue";
	$("newgame").addEventListener("click",new_game,false);
	$("cancel").addEventListener("click",function(){$("form").style.display="none";});
	$("cancel").style.display="none";
	$("map").selectedIndex=LS.map||0;
	$("ai_p1").selectedIndex=LS.ai_p1||3;
	$("ai_p2").selectedIndex=LS.ai_p2||0;
  if (typeof pusher!="undefined") {
		$("name_nw").value=LS.name_nw||"Player";
		$("color_nw").value=LS.color_nw||"green";
		$("network").addEventListener("click",network_game,false);
		NET.user_id = generate_uid();
		network_enter_channel({});
	}
}

window.addEventListener("load",init,false);
// kate: space-indent off; indent-width 2; 
