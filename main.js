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
	menuReadyListerner();
	contextListener();
	clickListener();
	keyupListener();
	resizeListener();
}

function menuReadyListerner() {
	window.addEventListener('WebComponentsReady', function(e) {
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
		}
	});
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

window.preview = {
	_CCSettings: {
		"platform": "web-desktop",
		"groupList": [
			"default"
		],
		"collisionMatrix": [
			[
				true
			]
		],
		"rawAssets": {
			"assets": {
				"cd0305b4-c877-43af-8ed8-27d38478c262": [
					"Images/monkey",
					"cc.SpriteFrame",
					1
				],
				"1d955528-ab82-4be4-a727-d864908c2b74": [
					"Images/monkey.png",
					"cc.Texture2D"
				],
				"ecbfd2e4-3595-4b9e-94e1-ad307f36bfab": [
					"resources/EffectPreview.fs.glsl",
					"cc.RawAsset"
				],
				"2fdfd899-b375-46c6-ac69-fdefaf994017": [
					"resources/EffectPreview_noMVP.vs.glsl",
					"cc.RawAsset"
				],
				"0bf9ac5e-ff33-4a0a-9de7-83bff3b29a40": [
					"resources/EffectPreview.vs.glsl",
					"cc.RawAsset"
				]
			},
			"internal": {
			}
		},
		"launchScene": "db://assets/Scene/EffectPreview.fire",
		"scenes": [
			{
				"url": "db://assets/Scene/EffectPreview.fire",
				"uuid": "0c0e54e8-a57a-4811-af7d-e0106440f9f2"
			}
		],
		"orientation": "",
		"debug": false
	},
	init: function(){
		if (cc.sys.isBrowser) {
			this._initEngine();
		}
		else if (cc.sys.isNative) {
			require('js/settings.js');
			require('js/jsb_polyfill.js');

			this._initEngine();
		}
	},
	_initEngine: function() {
		if ( !this._CCSettings.debug ) {
			// retrieve minified raw assets
			var rawAssets = this._CCSettings.rawAssets;
			var assetTypes = this._CCSettings.assetTypes;
			for (var mount in rawAssets) {
				var entries = rawAssets[mount];
				for (var uuid in entries) {
					var entry = entries[uuid];
					var type = entry[1];
					if (typeof type === 'number') {
						entry[1] = assetTypes[type];
					}
				}
			}
		}

		// init engine
		var canvas, div;
		//var width = 640, height = 480;

		if (cc.sys.isBrowser) {
			canvas = document.getElementById('GameCanvas');
			div = document.getElementById('GameDiv');

			//width = div.clientWidth;
			//height = div.clientHeight;
		}

		function setLoadingDisplay () {
			// Loading splash scene
			var splash = document.getElementById('splash');
			var progressBar = splash.querySelector('.progress-bar span');
			var currentResCount = cc.loader.getResCount();
			cc.loader.onProgress = function (completedCount, totalCount, item) {
				var percent = 100 * (completedCount - currentResCount) / (totalCount - currentResCount);
				if (progressBar) {
					progressBar.style.width = percent.toFixed(2) + '%';
				}
			};
			splash.style.display = 'block';

			cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
				splash.style.display = 'none';
			});
		}

		var onStart = function () {
			cc.view.resizeWithBrowserSize(true);
			// UC browser on many android devices have performance issue with retina display
			if (cc.sys.os !== cc.sys.OS_ANDROID || cc.sys.browserType !== cc.sys.BROWSER_TYPE_UC) {
				cc.view.enableRetina(true);
			}
			//cc.view.setDesignResolutionSize(this._CCSettings.designWidth, this._CCSettings.designHeight, cc.ResolutionPolicy.SHOW_ALL);
		
			if (cc.sys.isBrowser) {
				setLoadingDisplay();
			}

			if (this._CCSettings.orientation === 'landscape') {
				cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
			}
			else if (this._CCSettings.orientation === 'portrait') {
				cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
			}

			// init assets
			cc.AssetLibrary.init({
				libraryPath: shaderGraph.resolveUrl('res/import'),
				rawAssetsBase: shaderGraph.resolveUrl('res/raw-'),
				rawAssets: this._CCSettings.rawAssets
			});

			var launchScene = this._CCSettings.launchScene;

			var self = this;

			// load scene
			cc.director.loadScene(launchScene, null,
				function () {
					if (cc.sys.isBrowser) {
						// show canvas
						canvas.style.visibility = '';
						var div = document.getElementById('GameDiv');
						if (div) {
							div.style.backgroundImage = '';
						}
					}

					// play game
					// cc.game.resume();

					cc.eventManager.addCustomListener("preview_did_load", function(event){
						cc.eventManager.removeCustomListeners("preview_did_load");
						setTimeout(function(){
							typeof self.onload === "function" && self.onload();
						}, 1000);
					});

					console.log('Success to load scene: ' + launchScene);
				}
			);

			// purge
			//noinspection JSUndeclaredVariable
			this._CCSettings = undefined;
		};

		var option = {
			//width: width,
			//height: height,
			id: 'GameCanvas',
			scenes: this._CCSettings.scenes,
			debugMode: this._CCSettings.debug ? cc.DebugMode.INFO : cc.DebugMode.ERROR,
			showFPS: this._CCSettings.debug,
			frameRate: 60,
			jsList: [
				shaderGraph.resolveUrl('js/preview.js')
			],
			groupList: this._CCSettings.groupList,
			collisionMatrix: this._CCSettings.collisionMatrix
		};

		cc.game.run(option, onStart.bind(this));
	},
	updateShader: function(graph){
		if (graph) {
			var shaderDef = graph.buildShader();

			// console.log(shaderDef.fshader());
			if (cc.EffectPreview) {
				var fs = shaderDef.fshader();
				//fs = fs.split("uniform sampler2D texture12;").join("");
				//fs = fs.split("texture12").join("CC_Texture0");

				document.getElementById("source").innerHTML = ShaderGraph.Beautify(
					//optimize_glsl(fs, "2", "fs"),
					fs,
					{
						"indent_size": 1,
						"indent_char": '\t',
						"max_preserve_newlines": -1,
						"brace_style": "expand",
						"wrap_line_length": 0
					}
				);

				cc.EffectPreview.frag_glsl = fs;
				cc.EffectPreview.updateShader();
			}
		}
	}
};


init();

})();