if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

var preview;

Editor.polymerElement({
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
					"Image/monkey",
					"cc.SpriteFrame",
					1
				],
				"1d955528-ab82-4be4-a727-d864908c2b74": [
					"Image/monkey.png",
					"cc.Texture2D"
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
	ready: function(){
		preview = this;
		setTimeout(function(){

			function boot () {

				if ( !preview._CCSettings.debug ) {
					// retrieve minified raw assets
					var rawAssets = preview._CCSettings.rawAssets;
					var assetTypes = preview._CCSettings.assetTypes;
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
					//cc.view.setDesignResolutionSize(preview._CCSettings.designWidth, preview._CCSettings.designHeight, cc.ResolutionPolicy.SHOW_ALL);
				
					if (cc.sys.isBrowser) {
						setLoadingDisplay();
					}

					if (preview._CCSettings.orientation === 'landscape') {
						cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
					}
					else if (preview._CCSettings.orientation === 'portrait') {
						cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
					}

					// init assets
					cc.AssetLibrary.init({
						libraryPath: preview.resolveUrl('res/import'),
						rawAssetsBase: preview.resolveUrl('res/raw-'),
						rawAssets: preview._CCSettings.rawAssets
					});

					var launchScene = preview._CCSettings.launchScene;

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

							console.log('Success to load scene: ' + launchScene);
						}
					);

					// purge
					//noinspection JSUndeclaredVariable
					preview._CCSettings = undefined;
				};

				var option = {
					//width: width,
					//height: height,
					id: 'GameCanvas',
					scenes: preview._CCSettings.scenes,
					debugMode: preview._CCSettings.debug ? cc.DebugMode.INFO : cc.DebugMode.ERROR,
					showFPS: preview._CCSettings.debug,
					frameRate: 60,
					jsList: [
						preview.resolveUrl(preview._CCSettings.debug ? 'js/project.dev.js' : 'js/project.js')
					],
					groupList: preview._CCSettings.groupList,
					collisionMatrix: preview._CCSettings.collisionMatrix
				};

				cc.game.run(option, onStart);
			}

			if (cc.sys.isBrowser) {
				boot();
			}
			else if (cc.sys.isNative) {
				require('js/settings.js');
				require('js/jsb_polyfill.js');

				boot();
			}

		}, 1000);
	}
});
