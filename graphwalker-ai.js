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
	This file contains all the logic for the available AIs
*/

var AI=[];

// Constructor: creates a new AI
var ai=function(name, fun) {
	this.name=name;
	this.fun=fun;
	AI.push(this);
}

var random_prime_multiplier = function() {
	return [2063,2069,2081,2083,2087,2089,2099,2111,2113,2129][Math.floor(Math.random()*10)];
}

// An ai must be a function that accepts one parameter.
// This parameter is the persistent data storage for use by the ai.
// The ai must either return the node it wants to move to, or otherwise
// forefeit by returning false.

new ai("Human",0);

// This is a stupid random player
new ai("Random player",function(data) {
	var N = current.node.edges.length;
	var s = Math.floor(Math.random()*N);
	var m = random_prime_multiplier();
	for (var i=0; i<N; i++) {
		var e = current.node.edges[(s+i*m)%N];
		if (!e.used) {
			return e.a==current.node?e.b:e.a;
		}
	}
	return false;
});

// This player tries to minimize the distance to its own exit.
// Which can be stupid if there is a slightly longer path of chained moves to its exit.
new ai("Shortest path",function(data) {
	// Do a BFS.
	var queue = [];
	var distance = {};
	var e = exits[current.player];
	for (var i in e) {
		queue.push(e[i]);
		distance[e[i]]=0;
	}
	while (queue.length>0) {
		var n = queue.shift();
		for (var i in n.edges) {
			var e = n.edges[i];
			if (!e.used) {
				var m = e.a==n?e.b:e.a;
				if (!distance.hasOwnProperty(m)) {
					distance[m] = distance[n]+1;
					queue.push(m);
				}
			}
		}
	}

	// If there is no path to our exit, give up.
	if (!distance.hasOwnProperty(current.node)) return false;

	// Pick randomly an edge that reduces the distance.
	var N = current.node.edges.length;
	var s = Math.floor(Math.random()*N);
	var m = random_prime_multiplier();
	for (var i=0; i<N; i++) {
		var e = current.node.edges[(s+i*m)%N];
		if (!e.used) {
			var move = e.a==current.node?e.b:e.a;
			if (distance[move]<distance[current.node]) return move;
		}
	}
	return false;
});

new ai("Shortest turns",function(data) {
	// Do a BFS.
	var queue1 = []; // costs a turn
	var queue2 = []; // move to visited point
	var distance = {};
	var e = exits[current.player];
	for (var i in e) {
		queue1.push(e[i]);
		distance[e[i]]=[0,0];
	}
	while (queue1.length>0 || queue2.length>0) {
		if (queue2.length>0)
			var n = queue2.shift();
		else
			var n = queue1.shift();
		for (var i in n.edges) {
			var e = n.edges[i];
			if (!e.used) {
				var m = e.a==n?e.b:e.a;
				if (!distance.hasOwnProperty(m)) {
					if (m.used) {
						distance[m] = [distance[n][0],distance[n][1]+1];
						queue2.push(m);
					} else {
						distance[m] = [distance[n][0]+1,0];
						queue1.push(m);
					}
				}
			}
		}
	}

	// If there is no path to our exit, give up.
	if (!distance.hasOwnProperty(current.node)) return false;

	// Pick randomly an edge that reduces the distance.
	var N = current.node.edges.length;
	var s = Math.floor(Math.random()*N);
	var m = random_prime_multiplier();
	for (var i=0; i<N; i++) {
		var e = current.node.edges[(s+i*m)%N];
		if (!e.used) {
			var move = e.a==current.node?e.b:e.a;
			if (distance[move][0]<distance[current.node][0] ||
				(distance[move][0]==distance[current.node][0] && distance[move][1]<distance[current.node][1])) return move;
		}
	}
	return false;
});

new ai("Annoying",function(data) {
	// Do a BFS.
	var queue1 = []; // costs a turn
	var queue2 = []; // move to visited point
	var distance = {};
	var e = exits[current.player=="p1"?"p2":"p1"];
	for (var i in e) {
		queue1.push(e[i]);
		distance[e[i]]=[0,0];
	}
	while (queue1.length>0 || queue2.length>0) {
		if (queue2.length>0)
			var n = queue2.shift();
		else
			var n = queue1.shift();
		for (var i in n.edges) {
			var e = n.edges[i];
			if (!e.used) {
				var m = e.a==n?e.b:e.a;
				if (!distance.hasOwnProperty(m)) {
					if (m.used) {
						distance[m] = [distance[n][0],distance[n][1]+1];
						queue2.push(m);
					} else {
						distance[m] = [distance[n][0]+1,0];
						queue1.push(m);
					}
				}
			}
		}
	}

	// If there is no path to our exit, give up.
	if (!distance.hasOwnProperty(current.node)) return false;

	// Pick randomly an edge that reduces the distance.
	var N = current.node.edges.length;
	var s = Math.floor(Math.random()*N);
	var m = random_prime_multiplier();
	for (var i=0; i<N; i++) { // try a free move first.
		var e = current.node.edges[(s+i*m)%N];
		if (!e.used) {
			var move = e.a==current.node?e.b:e.a;
			if (distance[move][0]==distance[current.node][0] && distance[move][1]>distance[current.node][1]) return move;
		}
	}
	for (var i=0; i<N; i++) { // try dist increasing
		var e = current.node.edges[(s+i*m)%N];
		if (!e.used) {
			var move = e.a==current.node?e.b:e.a;
			if (distance[move][0]>distance[current.node][0]) return move;
		}
	}
	for (var i=0; i<N; i++) { // try equal
		var e = current.node.edges[(s+i*m)%N];
		if (!e.used) {
			var move = e.a==current.node?e.b:e.a;
			if (distance[move][0]==distance[current.node][0]) return move;
		}
	}
	for (var i=0; i<N; i++) { // stay alive
		var e = current.node.edges[(s+i*m)%N];
		if (!e.used) {
			var move = e.a==current.node?e.b:e.a;
			return move;
		}
	}
	return false;
});
// kate: space-indent off; indent-width 2; 
