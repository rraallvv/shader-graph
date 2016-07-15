(function() {

"use strict";
/*
function clickInsideElement( e, className ) {
	var el = document.getElementsByClassName(className)[0];

	var pos = getPosition(e);

	var bounds = el.getBoundingClientRect();

	var doc = document.documentElement;
	var clientLeft = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
	var clientTop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

	pos.y -= clientTop;
	pos.x -= clientLeft;

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

function updateNodeList(type) {
	var items = document.getElementById(contextMenuItemsClassName).children;
	var result = fuse.search(type);
	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		var found = true;
		if (type.length) {
			found = false;
			for (var j = 0; j < result.length; j++) {
				if (item.innerHTML === result[j].type) {
					found = true;
					break;
				}
			}
		}
		if (found) {
			item.style.display = "block";
		} else {
			item.style.display = "none";
		}
	}
}

function clearHoveredMenuItems() {
	var items = document.getElementById(contextMenuItemsClassName).children;
	var hovered = -1;
	for (var i = 0; i < items.length; i++) {
		if (items[i].isHovered) {
			items[i].classList.remove(contextMenuItemHoverClassName);
			items[i].isHovered = false;
			hovered = i;
		}
	}
	return hovered;
}

function placeCaretAtEnd(element) {
    element.focus();
    if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(element);
        textRange.collapse(false);
        textRange.select();
    }
}
*/

var nodeTypes = [];

/*
var contextMenuClassName = "outter-context-menu";
var contextMenuItemClassName = "menu-item";
var contextMenuItemHoverClassName = "menu-item-hover";
var contextMenuItemsClassName = "menu-items";
var contextMenuActiveClassName = "outter-context-menu--active";

var graphClassName = "graph";

var searchClassName = "search";

var graphInContext;

var clickCoordsX;
var clickCoordsY;

var menu = document.querySelector("#outter-context-menu");
var menuState = 0;
var menuWidth;
var menuHeight;
var menuPosition;
var menuPositionX;
var menuPositionY;

var clientRight;
var clientBottom;

var fuse;
var fuseOptions = {
  caseSensitive: false,
  includeScore: false,
  shouldSort: true,
  tokenize: true,
  threshold: 0.3,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  keys: ["type"]
};
*/
function init() {
	//searchListeners();
	graphReadyListerner();
	//contextListener();
	//clickListener();
	//keyupListener();
	//resizeListener();
}

function graphReadyListerner() {
	window.addEventListener('WebComponentsReady', function(e) {
		parent.shaderGraph = document.getElementById("graph");
		var menu = document.getElementById("outter-context-menu")
		if (parent.shaderGraph) {
			nodeTypes = parent.shaderGraph.nodeList();
			menu.buildMenu(nodeTypes);
			menu.onItemSelected = function(name) {
				var pos = menu.getPosition();
				parent.shaderGraph.addNode({
					type: name,
					pos: [pos.x, pos.y]
				});
			};
			menu.onToggleOff = function() {
				parent.shaderGraph.clearTempConnection();
			};
		}

		parent.preview.onload = function(){
			parent.shaderGraph.updateShader();
		};
		
		parent.preview.init();

		parent.shaderGraph.onShaderUpdate = function(shader){
			var shaderDef = shader.buildShader()
			var source = document.getElementById("source");
			source.innerHTML = ShaderGraph.Beautify(
				optimize_glsl(shaderDef.fshader(), "2", "fs"),
				//fs,
				{
					"indent_size": 1,
					"indent_char": '\t',
					"max_preserve_newlines": -1,
					"brace_style": "expand",
					"wrap_line_length": 0
				}
			);

			source.classList.remove("prettyprinted");
			prettyPrint();

			parent.preview.updateShader(shaderDef);
		};

		parent.shaderGraph.onConnectionReleased = function(e) {
			menu.toggleMenuOn();
			menu.positionMenu(e);
			return false;
		};
		
		//*
		var demos = [
			{ name: "Pattern",
				nodes: [
					{type:"fragColor", pos:[650, 130]},
					{type:"value", pos:[0, 0], value:70},
					{type:"uv", pos:[0, 100]},
					{type:"value", pos:[0, 220], value:35},
					{type:"value", pos:[0, 320], value:0.5},
					{type:"multiply", pos:[200, 50]},
					{type:"multiply", pos:[200, 150]},
					{type:"cos", pos:[350, 50]},
					{type:"sin", pos:[350, 150]},
					{type:"join", pos:[500, 100]},
					{type:"value", pos:[320, 250], value: 1}
				],
				links: [
					[1, 5],
					[2.1, 5.1],
					[2.2, 6],
					[3, 6.1],
					[5, 7],
					[6, 8],
					[7, 9],
					[8, 9.1],
					[4, 9.2],
					[10, 9.3],
					[9, 0]
				]
			},
			{ name: "Black and White",
				nodes: [
					{type:"fragColor", pos:[660, 200]},
					{type:"texture", pos:[0, 0]},
					{type:"split", pos:[0, 170]},
					{type:"add", pos:[135, 90]},
					{type:"add", pos:[267, 90]},
					{type:"divide", pos:[400, 90]},
					{type:"value", pos:[250, 175], value:3},
					{type:"join", pos:[530, 170]}
				],
				links: [
					[1, 2],
					[2, 3],
					[2.1, 3.1],
					[3, 4],
					[2.2, 4.1],
					[4, 5],
					[6, 5.1],
					[5, 7],
					[5, 7.1],
					[5, 7.2],
					[2.3, 7.3],
					[7, 0]
				]
			}];

		var placeholder = document.getElementById("demos");

		var element = document.createElement("a");
		element.onclick = function() {
			parent.shaderGraph.clearGraph();
		};
		element.innerHTML = "Clear";
		element.className = "demo";
		element.style.color = "red";
		placeholder.appendChild(element);

		for (var i = 0; i < demos.length; i++) {
			var element = document.createElement("a");
			element.demo = demos[i];
			element.onclick = function() {
				parent.shaderGraph.loadGraph(this.demo);
			};
			element.innerHTML = element.demo.name;
			element.className = "demo";
			placeholder.appendChild(element);
		}
	});
}
/*
function searchListeners() {
	document.getElementById(searchClassName).onkeypress = function(e) {
		var code = e.keyCode || e.which;
		if (code === 13) {
			var type = this.innerHTML;
			var result = nodeTypes.filter(function(node){
				return node.type === type;
			});
			if (result.length) {
				addNode(type)
			} else {
				console.error("Type '" + type + "' is not a valid type");
			}
			toggleMenuOff();
			e.preventDefault();
		}
	};
	document.getElementById(searchClassName).onkeydown = function(e) {
		var code = e.keyCode || e.which;
		if (code === 8 && this.innerHTML.length === 1) {
			this.innerHTML = "";
			e.preventDefault();
		} else if (code === 38 || code === 40) {
			var container = document.getElementById(contextMenuItemsClassName);
			var items = container.children;
			var hovered = clearHoveredMenuItems();
			var i = hovered, item;
			if (code === 38) {
				while((item = items[--i]) && item.style.display === "none");
				if (i < 0) {
					i = items.length;
					while(i > hovered && (item = items[--i]) && item.style.display === "none");
				}
			} else {
				while((item = items[++i]) && item.style.display === "none");
				if (i === items.length) {
					i = -1;
					while(i < hovered && (item = items[++i]) && item.style.display === "none");
				}
			}
			items[i].classList.add(contextMenuItemHoverClassName);
			items[i].isHovered = true;
			this.innerHTML = items[i].type;
			placeCaretAtEnd(this);
			var offsetHeight = items[i].offsetHeight;
			var offsetTop = Math.floor(items[i].offsetTop / offsetHeight) * offsetHeight;
			container.scrollTop = Math.min(container.scrollTop, offsetTop);
			container.scrollTop = Math.max(container.scrollTop, offsetTop + offsetHeight - container.clientHeight);
			e.preventDefault();
		}
	};
	document.getElementById(searchClassName).onkeyup = function(e) {
		var code = e.keyCode || e.which;
		if (code !== 38 && code !== 40) {
			updateNodeList(this.innerHTML);
		}
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
		document.getElementById(searchClassName).innerHTML = "";
		menu.classList.add( contextMenuActiveClassName );
		document.getElementById(searchClassName).focus();
		document.getElementById(contextMenuItemsClassName).scrollTop = 0;
	}
}

function toggleMenuOff() {
	if ( menuState !== 0 ) {
		menuState = 0;
		menu.classList.remove( contextMenuActiveClassName );
		var searchField = document.getElementById(searchClassName);
		searchField.value = "";
		searchField.innerHTML = "";
		updateNodeList("");
		clearHoveredMenuItems();
		parent.shaderGraph.clearTempConnection();
	}
}

function positionMenu(e) {
	var doc = document.documentElement;
	var clientLeft = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
	var clientTop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

	var pos = getPosition(e);
	clickCoordsX = pos.x - clientLeft;
	clickCoordsY = pos.y - clientTop;

	menuWidth = menu.offsetWidth + 4;
	menuHeight = menu.offsetHeight + 4;

	clientRight = clientLeft + window.innerWidth;
	clientBottom = clientTop + window.innerHeight;

	if ( (clientRight - clickCoordsX - clientLeft) < menuWidth ) {
		menu.style.left = clientRight - menuWidth + "px";
	} else {
		menu.style.left = clickCoordsX + clientLeft + "px";
	}

	if ( (clientBottom - clickCoordsY - clientTop) < menuHeight ) {
		menu.style.top = clientBottom - menuHeight + "px";
	} else {
		menu.style.top = clickCoordsY + clientTop + "px";
	}
}
*/
init();

})();