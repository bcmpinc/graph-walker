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
	This file contains the various available maps.
*/ 

var MAPS=[];
var SCALE=1000;

// Constructor: creates a new Map
var map=function(name, fun) {
	this.name=name;
	this.fun=fun;
	MAPS.push(this);
}

// Constructor: Adds a node to the map.
// Let n be a node:
//  - n.x,n.y denote the location of the node.
//  - n.exit tells what player can exit at this node. (0 if not an exit, default)
//  - n.element is the svg element that displays this node.
//  - n.used stores whether the node has been visited already.
var node=function(x,y,boundary) {
	this.x=x*SCALE;
	this.y=y*SCALE;
	this.edges=[];
	this.id=map.length;
	if (boundary) this.boundary=true;
	map.push(this);
}
node.prototype.toString=function(){return "node"+this.id;};

// Constructor: Adds an edge to the map.
// Let e be an edge:
//  - e.a and e.b are the nodes connected by this edge.
//  - e.used tells whether this edge is in use. Such an edge can not be used to make a move.
//  - e.element the svg element used to display the edge.
var edge=function(na,nb,used) {
	this.a=na
	this.b=nb
	this.used=used||false;
	na.edges.push(this);
	nb.edges.push(this);
	if (used) na.used=nb.used=true;
}

// Grid generators
var rectangular_grid = function(size) {
	var square={}
	var scale = .8/size;
	// Create nodes
	for (var y=-size;y<=size;y++) {
		for (var x=-size;x<=size;x++) {
			boundary = (x==-size || x==size || y==-size || y==size);
			square[[x,y]]=new node(x*scale,y*scale, boundary);
		}
	}
	// create exit nodes
	square[[-size,0]].exit=1;
	square[[ size,0]].exit=2;
	current.node=square[[0,0]];
	current.player="p"+(1+Math.floor(Math.random()*2));
	return square;
}

var hexagonal_grid = function(size) {
	var square={}
	var scale = 0.9/size;
	var up = Math.sqrt(0.75);
	// Create nodes
	for (var y=-size;y<=size;y++) {
		for (var x=-size;x<=size;x++) {
			if (x-y>=-size && x-y<=size) {
  			boundary = (x==-size || x==size || y==-size || y==size || x-y==-size || x-y==size);
				square[[x,y]]=new node((x+y)*.5*scale,(x-y)*up*scale, boundary);
			}
		}
	}
	// create exit nodes
	square[[-size,-size]].exit=1;
	square[[ size, size]].exit=2;
	current.node=square[[0,0]];
	current.player="p"+(1+Math.floor(Math.random()*2));
	return square;
}

// Connects a grid
// dx and dy are equal length arrays with offsets that need to be connected.
// bounds (optional) is another equal length array, that tells whether the connection can be a boundary edge.
var connect_nodes=function(grid, dx, dy, bounds) {
	// create edges
	N = dx.length;
	
	if (!bounds) bounds = [];
	
	for (var p1 in grid) {
		g1 = grid[p1];
		p1 = p1.split(",");
		for (var i=0; i<N; i++) {
			p2 = [p1[0]-dx[i],p1[1]-dy[i]];
			g2 = grid[p2];
			if(g2) {
				if (g1.boundary && g2.exit && bounds[i]) continue;
				if (g2.boundary && g1.exit && bounds[i]) continue;
				new edge(g1,g2, g1.boundary && g2.boundary && bounds[i]);
			}
		}
	}
}

new map("Original", function(){
	var grid = rectangular_grid(5);
	var dx=[1,1,1,0];
	var dy=[-1,0,1,1];
	var bounds=[0,1,0,1];
	connect_nodes(grid, dx, dy, bounds);
});

new map("Horse", function(){
	var grid = rectangular_grid(5);
	var dx=[-2,2,-1,1];
	var dy=[1,1,2,2];
	connect_nodes(grid, dx, dy);
});

new map("Hexagon", function(){
	var grid = hexagonal_grid(6);
	var dx=[0,1,1];
	var dy=[1,0,1];
	var bounds=[1,1,1];
	connect_nodes(grid, dx, dy, bounds);
});

new map("Hexagon dense", function(){
	var grid = hexagonal_grid(5);
	var dx=[0,1,1,2,1,1];
	var dy=[1,0,1,1,2,-1];
	var bounds=[1,1,1,0,0,0];
	connect_nodes(grid, dx, dy, bounds);
});

// kate: space-indent off; indent-width 2; 

