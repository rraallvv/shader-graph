var ignoreConnectionEvents = false;
var App = React.createClass({
	getInitialState: function(){
		return {
			connections: [],
			nodes: []
		};
	},
	render: function() {
		var shader = this.updateShader();
		this.updateConnections();
		var nodeTypes = Object.keys(ShaderGraph.Node.classes).sort().filter(function(type){
			// Should not list the main node
			return type !== 'fragColor' && type !== 'position'
		});
		return (
			<div className="row style-scope shader-graph">
				<div className="col-xs-3 style-scope shader-graph">
					<div className="row style-scope shader-graph">
						<Preview shader={this.shader}/>
					</div>
					<NodeSelectList
						nodeTypes={nodeTypes}
						addNode={this.addNode} />
				</div>
				<div className="col-xs-9 style-scope shader-graph">
					<NodeEditor
						updateShader={this.updateShader}
						instance={this.instance}
						shader={shader}
						nodes={this.state.nodes}
						connections={this.state.connections}
						connect={this.connect}
						disconnect={this.disconnect}
						updateNodeData={this.updateNodeData}
						initialize={this.initialize}
						onClickRemoveNode={this.removeNode} />
				</div>
			</div>
		);
	},
	updateShader: function(){

		// Find the main node
		var fragColorNodeData = this.state.nodes.find(function(node){
			return node.type === 'fragColor';
		});

		var shader = this.shader = new ShaderGraph.GraphShader({
			fragMainNode: new ShaderGraph.FragColorNode({
				id: fragColorNodeData && fragColorNodeData.id
			})
		});

		// Add nodes that are not main nodes
		this.state.nodes.filter(function(nodeData){
			return nodeData.type !== 'fragColor';
		}).forEach(function(nodeData){
			var node = new ShaderGraph.Node.classes[nodeData.type]({
				id: nodeData.id
			});
			this.shader.fragmentGraph.addNode(node);
			switch(nodeData.type){
			case 'value':
				var v = parseFloat(nodeData.value);
				node.value = isNaN(v) ? 0 : v;
				break;
			case 'vec2':
			case 'vec3':
			case 'vec4':
				node.value = nodeData.value.map(function(comp){
					var v = parseFloat(comp);
					return isNaN(v) ? 0 : v;
				});
				break;
			}
		}, this);

		// Connections
		this.state.connections.slice(0).forEach(function (conn){
			var nA = this.shader.fragmentGraph.getNodeById(conn.nodeA);
			var nB = this.shader.fragmentGraph.getNodeById(conn.nodeB);
			if(!nA) console.warn('couldnt find node ' + conn.nodeA);
			if(!nB) console.warn('couldnt find node ' + conn.nodeB);

			if(!nB.canConnect(conn.inputB, nA, conn.outputA)){
				console.warn(nB.errorMessage);

				// If it cannot be rebuilt we may as well remove it from the datamodel
				this.disconnect(conn.nodeA, conn.outputA, conn.nodeB, conn.inputB);
				return false;
			}
			nB.connect(conn.inputB, nA, conn.outputA);
		}, this);

		return shader
	},
	initialize: function(instance){
		this.instance = instance;

		// Add the main node
		this.addNode({
			type: ShaderGraph.FragColorNode.type,
			pos: [600, 300]
		});

		this.setState(this.state);
	},
	updateConnections: function(){
		if(this.instance){
			var instance = this.instance;
			ignoreConnectionEvents = true;
			instance.detachEveryConnection();
			this.state.connections.forEach(function(conn){
				instance.connect({
					source: conn.outputA + conn.nodeA,
					target: conn.inputB + conn.nodeB,
					type: "basic"
				});
			}, this);
			ignoreConnectionEvents = false;
		}
	},
	generateId: function(){
		if(this.idCounter === undefined){
			this.idCounter = 1;
		}
		return this.idCounter++;
	},
	addNode: function(options, extra){
		var data = extra || {};
		if (typeof options === "string") {
			data.type = options;
		} else if (typeof options === "object") {
			for(var i in options) {
				data[i] = options[i];
			}
		} else {
			console.warn("Couldn't create node with options='" + options + "' and extra='" + extra + "'");
			return;
		}
		if (data.type === 'fragColor' || data.type === 'position') {
			// Find the main node
			var mainNode = this.state.nodes.find(function(node){
				return node.type === 'fragColor' || node.type === 'position';
			});
			// Only update its data
			if (mainNode) {
				data.id = 1;
				this.updateNodeData(1, data);
				return data.id;
			}
		}
		if (typeof data.id === "undefined") {
			data.id = this.generateId();
		}
		if (typeof data.pos === "undefined") {
			data.pos = [0, 0];
		}
		if (typeof data.value === "undefined") {
			switch(data.type){
			case 'value':
				data.value = 0;
				break;
			case 'vec2':
				data.value = [0,0];
				break;
			case 'vec3':
				data.value = [0,0,0];
				break;
			case 'vec4':
				data.value = [0,0,0,1];
				break;
			}
		}
		var state = this.state;
		state.nodes.push(data);
		this.setState(state);
		return node.id;
	},
	removeNode: function(id){
		var state = this.state;

		var nodeToRemove = state.nodes.find(function(node){
			return node.id === id;
		});
		if(!nodeToRemove || nodeToRemove.type === 'fragColor'){
			return false;
		}

		// Remove the connections connected
		state.connections.filter(function(conn){
			return conn.nodeA == id || conn.nodeB == id;
		}).forEach(function(conn){
			var idx = state.connections.indexOf(conn);
			if(idx !== -1){
				state.connections.splice(idx, 1);
			}
		});

		var idx = state.nodes.indexOf(nodeToRemove);
		if(idx !== -1){
			 state.nodes.splice(idx, 1);
		}
		this.setState(state);

		return true;
	},
	updateNodeData: function(id, data){
		var node = this.state.nodes.find(function(node){
			return node.id === id;
		});
		if(node){
			for(var key in data){
				node[key] = data[key];
			}
			this.setState(this.state);
		}
	},
	_splitPort: function(port) {
		var string = port.toString();
		if (string.indexOf('.') === -1) {
			return [port, 0];
		}
		var split = string.split('.');
		return [parseInt(split[0]), parseInt(split[1])];
	},
	connect: function(nodeA, outputA, nodeB, inputB){
		if(arguments.length === 2) {
			var portA = this._splitPort(arguments[0]);
			var portB = this._splitPort(arguments[1]);

			nodeA = portA[0];
			outputA = portA[1];

			nodeB = portB[0];
			inputB = portB[1];
		} else {
			nodeA = Number(nodeA);
			nodeB = Number(nodeB);
		}

		var nA = this.shader.fragmentGraph.getNodeById(nodeA);
		var nB = this.shader.fragmentGraph.getNodeById(nodeB);
		if(!nA) throw new Error('couldnt find node ' + nodeA);
		if(!nB) throw new Error('couldnt find node ' + nodeB);

		if(typeof outputA === "number") {
			outputA = nA.getOutputPorts()[outputA];
			if(typeof outputA === "undefined") {
				console.warn("Output port A undefined");
				return false;
			}
		}

		if(typeof inputB === "number") {
			inputB = nB.getInputPorts()[inputB];
			if(typeof inputB === "undefined") {
				console.warn("Input port B undefined");
				return false;
			}
		}

		if(!nB.canConnect(inputB, nA, outputA)){
			console.warn(nB.errorMessage);
			return false;
		}
		nB.connect(inputB, nA, outputA);

		var state = this.state;
		state.connections.push({
			nodeA: nodeA,
			nodeB: nodeB,
			outputA: outputA,
			inputB: inputB
		});
		this.setState(state);

		return true;
	},
	disconnect: function(nodeA, outputA, nodeB, inputB){
		nodeA = Number(nodeA);
		nodeB = Number(nodeB);

		var state = this.state;
		var connToRemove = state.connections.find(function(conn){
			return (
				conn.nodeA === nodeA &&
				conn.nodeB === nodeB &&
				conn.outputA === outputA &&
				conn.inputB === inputB
			);
		});
		var idx = state.connections.indexOf(connToRemove);
		if(idx !== -1){
			state.connections.splice(idx, 1);
		}

		// Test it!
		var nA = this.shader.fragmentGraph.getNodeById(nodeA);
		var nB = this.shader.fragmentGraph.getNodeById(nodeB);
		nB.disconnect(inputB, nA, outputA);

		// Delete any other invalid connections
		/*
		var invalidConnections = this.shader.fragmentGraph.connections.filter(function(conn){
			return !conn.isValid();
		}).forEach(function(conn){
			console.log('removing', conn)
			var connToRemove = state.connections.find(function(connData){
				return (
					connData.nodeA === conn.fromNode &&
					connData.nodeB === conn.toNode &&
					connData.outputA === conn.fromPortKey &&
					connData.inputB === conn.toPortKey
				);
			});
			var idx = state.connections.indexOf(connToRemove);
			if(idx !== -1){
				state.connections.splice(idx, 1);
			}
		});
		*/

		this.setState(state);
	}
});

var NodeSelectList = React.createClass({
	render: function() {
		var items = this.props.nodeTypes.map(function (type) {
		return (
			<AddNodeButton key={type} addNode={this.props.addNode} type={type}/>
		);
		}, this);
		return (
		<div className="list-group style-scope shader-graph">
			{items}
		</div>
		);
	}
});

var AddNodeButton = React.createClass({
	render: function() {
		return (
		<a className="list-group-item add-node-button style-scope shader-graph" onClick={this.handleClick}>{this.props.type}</a>
		);
	},
	handleClick: function(){
		this.props.addNode(this.props.type);
	}
});

var Preview = React.createClass({
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
	componentDidMount: function(){
		var gooRunner = new goo.GooRunner({
			logo: false,
			useDevicePixelRatio: true
		});
		gooRunner.renderer.setClearColor(0, 0, 0, 1);
		gooRunner.renderer.domElement.id = 'goo';
		gooRunner.renderer.domElement.className = 'style-scope shader-graph';
		ReactDOM.findDOMNode(this).appendChild(gooRunner.renderer.domElement);

		var world = gooRunner.world;
		var material = new goo.Material();
		this.entity = world.createEntity(new goo.Sphere(32,32,1), material, function (entity){
			entity.setRotation(0, -world.time * 0.1, 0);
		}).addToWorld();

		var camera = new goo.Camera();
		var entity = gooRunner.world.createEntity(camera, [0,0,3]).addToWorld();
		world.createEntity(new goo.PointLight(), [-100, 100, 100]).addToWorld();

		// Load example texture
		new goo.TextureCreator().loadTexture2D(shaderGraph.resolveUrl('images/chesterfield.png')).then(function (texture) {
			this.sampleTexture = texture;
			this.updateShader();
		}.bind(this), function () {
			console.error('Error loading image.');
		});

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
						console.log("Preview did load!");
						setTimeout(function(){ self.updateShader(); }, 1000);
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
	render: function() {
		this.updateShader();
		return (
			<div>
				<div className="preview col-xs-12 style-scope shader-graph"></div>
				<div id="GameDiv" style={{width: "226px", height: "226px"}} className="style-scope shader-graph">
					<canvas id="GameCanvas" width={"226"} height={"226"} className="style-scope shader-graph"></canvas>
					<div id="splash" className="style-scope shader-graph">
						<div className="progress-bar stripes style-scope shader-graph">
							<span style={{width: "0%"}} className="style-scope shader-graph"></span>
						</div>
					</div>
				</div>
			</div>
		);
	},
	updateShader: function(){
		if(this.entity){
			var shaderDef = this.props.shader.buildShader();
			// console.log(shaderDef.fshader());
			if (cc.EffectPreview) {
				var fs = shaderDef.fshader();
				fs = fs.split("texCoord0").join("v_texCoord");
				fs = fs.split("uniform sampler2D texture12;").join("");
				fs = fs.split("texture12").join("CC_Texture0");
				// console.log(fs);
				cc.EffectPreview.frag_glsl = fs;
				cc.EffectPreview.updateShader();
			}
			var material = new goo.Material(shaderDef);
			if(this.sampleTexture){
				for(var key in shaderDef.uniforms){
					if(shaderDef.uniforms[key].indexOf('TEXTURE') !== -1){ // todo: make nicer
						material.setTexture(shaderDef.uniforms[key], this.sampleTexture);
					}
				}
			}
			this.entity.meshRendererComponent.materials[0] = material;
		}
	}
});

var NodeEditor = React.createClass({
	componentDidMount: function(){

		var component = this;

		// setup some defaults for jsPlumb.
		var instance = jsPlumb.getInstance({
			Endpoint: ["Dot", {radius: 0.00001}],
			Connector: ["Bezier", {curviness: function(v){
				// connection going forward
				var df = 100;
				const sf = 2;
				// connection going backwards
				var db = 600;
				const sb = 4;
				// transition threshold
				const th = 300;
				// distance percentage
				const c = 0.25;

				var d0 = v[ 0 ];
				var d1 = v[ 1 ];
				var d = Math.sqrt( d0 * d0 + d1 * d1 );
				// var d = v[0];

				// fix distance
				df = df + (d - df) / sf;
				db = db + (d - db) / sb;

				if ( v[ 0 ] > 0 ) { // forward
					d = df;
				} else if ( v[ 0 ] < -th  ) { // backwards
					d = db;
				} else { // transition
					var t = v[ 0 ] / th;
					d = (1 + t) * df - t * db;
				}
				// console.log(c * d);
				return c * d;
			}, snapThreshold: 0.00001}],
			HoverPaintStyle: {
				strokeStyle: "#ddd",
				lineWidth: 2
			},
			ConnectionOverlays: [
				/*
				[ "Arrow", {
					location: 0.5,
					id: "arrow",
					length: 10,
					width: 10,
					foldback: 1
				} ]
				*/
			],
			Container: "canvas"
		});

		shaderGraph.jsPlumbInstance = instance;

		instance.registerConnectionType("basic", {
			anchors: ["Right", "Left"],
			connector: "Bezier"
		});

		function getConnectionInfo(info){
			var result = {};
			var reg = /([^\d]+)(\d+)/;
			if (typeof info.source !== "undefined") {
				result.nodeA = info.source.parentNode.parentNode.parentNode.attributes['data-node-id'].value;
				result.outputA = info.source.innerHTML;
			} else {
				var m = info.sourceId.match(reg);
				result.nodeA = m[2];
				result.outputA = m[1];
			}
			if (typeof info.target !== "undefined") {
				result.nodeB = info.target.parentNode.parentNode.parentNode.attributes['data-node-id'].value;
				result.inputB = info.target.innerHTML;
			} else {
				var m = info.targetId.match(reg);
				result.nodeB = m[2];
				result.inputB = m[1];
			}
			return result;
		}

		instance.bind("click", function (c) {
			if(!ignoreConnectionEvents){
				var info = getConnectionInfo(c);
				component.props.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
				//instance.detach(c);
			}
		});

		instance.bind("beforeDrop", function (c) {
			var dst = c.targetId;
			var con = instance.getConnections({target:dst});

			var existing = [];
			if (con.length!=0 && document.getElementById(dst).classList.contains("in")) {
				for (var i = 0; i < con.length; i++) {
					existing.push(getConnectionInfo(con[i]));
				}
			}

			var info = getConnectionInfo(c);

			if (!ignoreConnectionEvents) {
				if (component.props.connect(info.nodeA, info.outputA, info.nodeB, info.inputB)) {
					// disconnect existing connections if is input
					for (var i = 0; i < existing.length; i++) {
						info = existing[i];
						component.props.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
					}
				}
			}
		});

		console.log('Mount node editor')

		// suspend drawing and initialize.
		instance.batch(function () {
			// Connect initial connections
			this.props.initialize(instance);

		}.bind(this));
	},
	render: function() {
		var nodes = this.props.nodes;
		return (
		<div id="canvas" className="style-scope shader-graph">
			{nodes.map(function(node) {
			return (
				<SGNode
					updateShader={this.props.updateShader}
					onClickRemove={node.type !== 'fragColor' ? this.props.onClickRemoveNode : undefined }
					updateNodeData={this.props.updateNodeData}
					instance={this.props.instance}
					key={node.id}
					data={node}
					shader={this.props.shader} />
			);
			}, this)}
		</div>
		);
	}
});

var Port = React.createClass({
	componentDidMount: function(){
		var el = ReactDOM.findDOMNode(this);
		var instance = this.props.instance;

		instance.makeSource(el, {
			anchors: ["Right", "Left"],
			connectorStyle: {
				strokeStyle: "black",
				lineWidth: 2,
				outlineColor: "transparent",
				outlineWidth: 4
			},
			maxConnections: 1,
			connectionType: "basic",
			onMaxConnections: function (info, e) {
				console.error("Maximum connections (" + info.maxConnections + ") reached");
			},
			extract: {
				"action": "the-action"
			}
		});

		instance.makeTarget(el, {
			dropOptions: { hoverClass: "dragHover" },
			anchors: ["Right", "Left"],
			allowLoopback: false
		});
	},
	componentWillUnmount: function(){
		var el = ReactDOM.findDOMNode(this);
		var instance = this.props.instance;

		instance.unmakeSource(el);
		instance.makeTarget(el);
	},
	render: function(){
		return (
			<div className={this.props.type + " style-scope shader-graph"} key={this.props.portKey} id={this.props.portKey + this.props.id}>{this.props.portKey}</div>
		);
	}
});

var SGNode = React.createClass({
	componentDidMount: function(){
		var el = ReactDOM.findDOMNode(this);
		var instance = this.props.instance;
		instance.draggable(el);
	},
	render: function() {
		var shader = this.props.updateShader();
		var node = shader.fragmentGraph.getNodeById(this.props.data.id);
		var inputs = node ? node.getInputPorts().map(function(key){
			return (
				<Port
					type={"in"}
					id={this.props.data.id}
					instance={this.props.instance}
					key={key}
					portKey={key} />
			);
		}, this) : undefined;
		var outputs = node ? node.getOutputPorts().map(function(key){
			return (
				<Port
					type={"out"}
					id={this.props.data.id}
					key={key}
					instance={this.props.instance}
					portKey={key} />
			);
		}, this) : undefined;

		var removeButton = this.props.onClickRemove ? (
			<span className="glyphicon glyphicon-remove remove-button pull-right style-scope shader-graph" onClick={this.handleClickRemove}></span>
		) : undefined;

		var extra;

		switch(this.props.data.type){
		case 'value':
			extra = (
				<input
					type="number"
					className="style-scope shader-graph"
					value={this.props.data.value}
					onChange={this.onChangeValue} />
			);
			break;
		case 'vec2':
			extra = (
				<div>
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[0]}
						onChange={this.onChangeVec2Value} />
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[1]}
						onChange={this.onChangeVec2Value} />
				</div>
			);
			break;
		case 'vec3':
			extra = (
				<div>
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[0]}
						onChange={this.onChangeVec3Value} />
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[1]}
						onChange={this.onChangeVec3Value} />
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[2]}
						onChange={this.onChangeVec3Value} />
				</div>
			);
			break;
		case 'vec4':
			extra = (
				<div>
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[0]}
						onChange={this.onChangeVec4Value} />
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[1]}
						onChange={this.onChangeVec4Value} />
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[2]}
						onChange={this.onChangeVec4Value} />
					<input
						type="number"
						className="style-scope shader-graph"
						value={this.props.data.value[3]}
						onChange={this.onChangeVec4Value} />
				</div>
			);
			break;
		};

		var nodeStyle = {
			left: this.props.data.pos[0],
			top: this.props.data.pos[1]
		};

		return (
			<div className={"w node-type-" + this.props.data.type + " style-scope shader-graph"} style={nodeStyle} data-node-id={this.props.data.id}>
				<div className="title style-scope shader-graph">
					{this.props.data.type}
					{removeButton}
				</div>
				{extra}
				<div>
					<div className="inputs style-scope shader-graph">
						{inputs}
					</div>
					<div className="outputs style-scope shader-graph">
						{outputs}
					</div>
				</div>
			</div>
		);
	},
	onChangeValue: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: evt.target.value
		})
	},
	onChangeVec2Value: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: [
				evt.target.parentNode.childNodes[0].value,
				evt.target.parentNode.childNodes[1].value
			]
		})
	},
	onChangeVec3Value: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: [
				evt.target.parentNode.childNodes[0].value,
				evt.target.parentNode.childNodes[1].value,
				evt.target.parentNode.childNodes[2].value
			]
		})
	},
	onChangeVec4Value: function(evt){
		this.props.updateNodeData(this.props.data.id, {
			value: [
				evt.target.parentNode.childNodes[0].value,
				evt.target.parentNode.childNodes[1].value,
				evt.target.parentNode.childNodes[2].value,
				evt.target.parentNode.childNodes[3].value
			]
		})
	},
	handleClickRemove: function(){
		this.props.onClickRemove(this.props.data.id);
	}
});
