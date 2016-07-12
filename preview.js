(function() {

"use strict";

parent.preview = {
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
				libraryPath: 'res/import',
				rawAssetsBase: 'res/raw-',
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
				'js/cocos-component.js'
			],
			groupList: this._CCSettings.groupList,
			collisionMatrix: this._CCSettings.collisionMatrix
		};

		cc.game.run(option, onStart.bind(this));
	},
	updateShader: function(shaderDef){
		if (shaderDef) {
			// console.log(shaderDef.fshader());
			if (cc.EffectPreview) {
				var fs = shaderDef.fshader();
				//fs = fs.split("uniform sampler2D texture12;").join("");
				//fs = fs.split("texture12").join("CC_Texture0");

				cc.EffectPreview.frag_glsl = fs;
				cc.EffectPreview.updateShader();
			}
		}
	}
};

})();
