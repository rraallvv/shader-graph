(function() {

"use strict";

function clickInsideElement( e, className ) {
	var el = document.getElementsByClassName(className)[0];

	var pos = getPosition(e);

	var bounds = el.getBoundingClientRect();

	if (pos.x < bounds.left || pos.x > bounds.right || pos.y < bounds.top || pos.y > bounds.bottom) {
		return false;
	}

	return true;
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

var searchClassName = "search";

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
	graphReadyListerner();
	contextListener();
	clickListener();
	keyupListener();
	resizeListener();
}

function graphReadyListerner() {
	window.addEventListener('WebComponentsReady', function(e) {
		parent.shaderGraph = document.getElementById("graph");
		if (parent.shaderGraph) {
			// build the list of nodes
			var menu = document.getElementById(contextMenuItemsClassName);
			var items = parent.shaderGraph.nodeList();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				item.className = contextMenuItemClassName;
				item.onclick = function () {
					parent.shaderGraph.addNode({
						type: this.type,
						pos: [clickCoords.x, clickCoords.y]
					});
				};
				menu.appendChild(item);
			}
		}

		parent.preview.onload = function(){
			parent.shaderGraph.updateShader();
		};
		parent.preview.init();
		parent.shaderGraph.onUpdateShader = function(shader){
			parent.preview.updateShader(shader);
		};

	});
}

function searchListener() {
	document.getElementById(searchClassName).onkeyup = function(e) {
		updateNodeList(this.value)
	};
}

function contextListener() {
	document.addEventListener( "contextmenu", function(e) {
		graphInContext = clickInsideElement( e, graphClassName );

		if ( graphInContext ) {
			e.preventDefault();
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
		var clickeElIsLink = clickInsideElement( e, contextMenuClassName );

		if ( clickeElIsLink ) {
			e.preventDefault();
			if (!clickInsideElement( e, searchClassName )) {
				toggleMenuOff();
			}
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
		document.getElementById(searchClassName).focus();
	}
}

function toggleMenuOff() {
	if ( menuState !== 0 ) {
		menuState = 0;
		menu.classList.remove( contextMenuActiveClassName );
		document.getElementById(searchClassName).value = "";
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