(function() {

"use strict";

var contextMenuClassName = "context-menu";
var contextMenuItemClassName = "menu-item";
var contextMenuItemHoverClassName = "menu-item-hover";
var contextMenuItemsClassName = "menu-items";
var contextMenuActiveClassName = "context-menu--active";

var searchClassName = "search";

var clickCoordsX;
var clickCoordsY;

var menu;
var menuState = 0;
var menuWidth;
var menuHeight;
var menuPosition;
var menuPositionX;
var menuPositionY;

var clientRight;
var clientBottom;

var nodeTypes = [];

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

Editor.polymerElement({
	ready: function() {
		menu = this.$[contextMenuClassName];
		this._initSearchListeners();
		this._initContextListener();
		this._initClickListener();
		this._initKeyupListener();
		this._initResizeListener();
	},
	properties: {
		activateForClass: String
	},
	buildMenu: function(items) {
		var self = this;
		nodeTypes = items.slice(0);
		fuse = new Fuse(nodeTypes, fuseOptions);
		var menu = Polymer.dom(this.$[contextMenuItemsClassName]);
		for (var i = 0; i < nodeTypes.length; i++) {
			var a = document.createElement("a");
			a.type = a.innerHTML = nodeTypes[i].type;
			a.className = contextMenuItemClassName;
			a.onclick = function (e) {
				self._itemSelected(this.type);
				self.toggleMenuOff();
				e.stopPropagation();
			};
			a.onmouseover = function () {
				self.clearHoveredMenuItems();
				this.isHovered = true;
				this.classList.add(contextMenuItemHoverClassName);
			};
			a.onmouseout = function () {
				this.isHovered = false;
				this.classList.remove(contextMenuItemHoverClassName);
			};
			a.onmousemove = function (e) {
				if (!this.isHovered) {
					this.onmouseover(e);
				};
			};
			menu.appendChild(a);
		}
	},
	_itemSelected: function(type) {
		if (this.onItemSelected) {
			this.onItemSelected(type);
		}
	},
	clickInsideElement: function( e, className ) {
		var el = document.getElementsByClassName(className)[0];

		var pos = this._getMousePosition(e);

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
	},
	_getMousePosition: function(e) {
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
	},
	updateNodeList: function(type) {
		var items = this.$[contextMenuItemsClassName].children;
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
	},
	clearHoveredMenuItems: function() {
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
	},
	placeCaretAtEnd: function(element) {
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
	},
	_initSearchListeners: function() {
		var self = this;
		document.getElementById(searchClassName).onkeypress = function(e) {
			var code = e.keyCode || e.which;
			if (code === 13) {
				var type = this.innerHTML;
				var result = nodeTypes.filter(function(node){
					return node.type === type;
				});
				if (result.length) {
					self._itemSelected(type);
				} else {
					console.error("Type '" + type + "' is not a valid type");
				}
				self.toggleMenuOff();
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
				var hovered = self.clearHoveredMenuItems();
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
				self.placeCaretAtEnd(this);
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
				self.updateNodeList(this.innerHTML);
			}
		};
	},
	_initContextListener: function() {
		var self = this;
		document.addEventListener( "contextmenu", function(e) {
			var inContext = self.clickInsideElement( e, self.activateForClass );

			if ( inContext ) {
				e.preventDefault();
				self.toggleMenuOn();
				self.positionMenu(e);
			} else {
				inContext = null;
				toggleMenuOff();
			}
		});
	},
	_initClickListener: function() {
		var self = this;
		document.addEventListener( "click", function(e) {
			var clickeElIsLink = self.clickInsideElement( e, contextMenuClassName );

			if ( clickeElIsLink ) {
				e.preventDefault();
				if (!self.clickInsideElement( e, searchClassName )) {
					self.toggleMenuOff();
				}
			} else {
				var button = e.which || e.button;
				if ( button === 1 ) {
					self.toggleMenuOff();
				}
			}
		});
	},
	_initKeyupListener: function() {
		window.onkeyup = function(e) {
			if ( e.keyCode === 27 ) {
				toggleMenuOff();
			}
		}
	},
	_initResizeListener: function() {
		var self = this;
		window.onresize = function(e) {
			self.toggleMenuOff();
		};
	},
	toggleMenuOn: function() {
		if ( menuState !== 1 ) {
			menuState = 1;
			document.getElementById(searchClassName).innerHTML = "";
			menu.classList.add( contextMenuActiveClassName );
			document.getElementById(searchClassName).focus();
			document.getElementById(contextMenuItemsClassName).scrollTop = 0;
		}
	},
	toggleMenuOff: function() {
		if ( menuState !== 0 ) {
			menuState = 0;
			menu.classList.remove( contextMenuActiveClassName );
			var searchField = document.getElementById(searchClassName);
			searchField.value = "";
			searchField.innerHTML = "";
			this.updateNodeList("");
			this.clearHoveredMenuItems();
			parent.shaderGraph.clearTempConnection();
		}
	},
	positionMenu: function(e) {
		var doc = document.documentElement;
		var clientLeft = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
		var clientTop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

		var pos = this._getMousePosition(e);
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
	},
	getPosition: function() {
		return {x: clickCoordsX, y: clickCoordsY};
	}
});

})();
