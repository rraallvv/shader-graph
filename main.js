(function() {

"use strict";

function clickInsideElement( e, className ) {
	var el = e.srcElement || e.target;
	
	if ( el.classList.contains(className) ) {
		return el;
	} else {
		while ( el = el.parentNode ) {
			if ( el.classList && el.classList.contains(className) ) {
				return el;
			}
		}
	}

	return false;
}

function getPosition(e) {
	var posx = 0;
	var posy = 0;

	if (!e) var e = window.event;
	
	if (e.pageX || e.pageY) {
		posx = e.pageX;
		posy = e.pageY;
	} else if (e.clientX || e.clientY) {
		posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}

	return {
		x: posx,
		y: posy
	}
}

function updateNodeList(value) {
	var items = document.getElementById(contextMenuItemsClassName).children;
	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		if (item.innerHTML.startsWith(value)) {
			item.style.display = "block";
		} else {
			item.style.display = "none";
		}
	}
}

var contextMenuClassName = "context-menu";
var contextMenuItemClassName = "menu-item";
var contextMenuItemsClassName = "menu-items";
var contextMenuActiveClassName = "context-menu--active";

var graphClassName = "graph";
var graphInContext;

var clickCoords;
var clickCoordsX;
var clickCoordsY;

var menu = document.querySelector("#context-menu");
var menuState = 0;
var menuWidth;
var menuHeight;
var menuPosition;
var menuPositionX;
var menuPositionY;

var windowWidth;
var windowHeight;

function init() {
	searchListener();
	contextListener();
	clickListener();
	keyupListener();
	resizeListener();
}

function searchListener() {
	document.getElementById("search").onkeyup = function(e) {
		updateNodeList(this.value)
	};
}

function contextListener() {
	document.addEventListener( "contextmenu", function(e) {
		graphInContext = clickInsideElement( e, graphClassName );

		if ( graphInContext ) {
			e.preventDefault();

			if (!window.menuLoaded) {
				var graph = document.getElementById("graph");
				if (graph) {
					// build the list of nodes
					var menu = document.getElementById(contextMenuItemsClassName);
					var items = graph.nodeList();
					for (var i = 0; i < items.length; i++) {
						var item = items[i];
						item.className = contextMenuItemClassName;
						item.onclick = function () {
							graph.addNode({
								type: this.type,
								pos: [clickCoords.x, clickCoords.y]
							});
						};
						menu.appendChild(item);
					}
					window.menuLoaded = true;
				}
			}

			toggleMenuOn();
			positionMenu(e);
		} else {
			graphInContext = null;
			toggleMenuOff();
		}
	});
}

function clickListener() {
	document.addEventListener( "click", function(e) {
		var clickeElIsLink = clickInsideElement( e, contextMenuItemClassName );

		if ( clickeElIsLink ) {
			e.preventDefault();
			toggleMenuOff();
		} else {
			var button = e.which || e.button;
			if ( button === 1 ) {
				toggleMenuOff();
			}
		}
	});
}

function keyupListener() {
	window.onkeyup = function(e) {
		if ( e.keyCode === 27 ) {
			toggleMenuOff();
		}
	}
}

function resizeListener() {
	window.onresize = function(e) {
		toggleMenuOff();
	};
}

function toggleMenuOn() {
	if ( menuState !== 1 ) {
		menuState = 1;
		menu.classList.add( contextMenuActiveClassName );
		document.getElementById("search").focus();
	}
}

function toggleMenuOff() {
	if ( menuState !== 0 ) {
		menuState = 0;
		menu.classList.remove( contextMenuActiveClassName );
		document.getElementById("search").value = "";
		updateNodeList("");
	}
}

function positionMenu(e) {
	clickCoords = getPosition(e);
	clickCoordsX = clickCoords.x;
	clickCoordsY = clickCoords.y;

	menuWidth = menu.offsetWidth + 4;
	menuHeight = menu.offsetHeight + 4;

	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;

	if ( (windowWidth - clickCoordsX) < menuWidth ) {
		menu.style.left = windowWidth - menuWidth + "px";
	} else {
		menu.style.left = clickCoordsX + "px";
	}

	if ( (windowHeight - clickCoordsY) < menuHeight ) {
		menu.style.top = windowHeight - menuHeight + "px";
	} else {
		menu.style.top = clickCoordsY + "px";
	}
}

init();

})();