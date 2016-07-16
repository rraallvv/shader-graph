(function(){

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
		return (
			<div className="row style-scope shader-graph">
				<div id="sidebar" className="col-xs-3 style-scope shader-graph">
					<div className="row style-scope shader-graph">
						<Preview shader={this.shader}/>
					</div>
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
	nodeTypes: function(){
		return Object.keys(ShaderGraph.Node.classes).sort().filter(function(type){
			// Should not list the main node
			return type !== 'fragColor' && type !== 'position';
		});
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
					type: "basicRL"
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
		return data.id;
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

		var state = this.state;

		if(!nB.canConnect(inputB, nA, outputA)){
			if (!nA.canConnect(outputA, nB, inputB)) {
				console.warn(nB.errorMessage);
				return false;
			} else {
				// make the connetion in opposite direction
				nA.connect(outputA, nB, inputB);
				state.connections.push({
					nodeA: nodeB,
					nodeB: nodeA,
					outputA: inputB,
					inputB: outputA
				});
			}
		} else {
			// make the connetion as is
			nB.connect(inputB, nA, outputA);
			state.connections.push({
				nodeA: nodeA,
				nodeB: nodeB,
				outputA: outputA,
				inputB: inputB
			});
		}

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
		var shaderDef = this.props.shader.buildShader();

		// console.log(shaderDef.fshader());
		if (cc.EffectPreview) {
			var fs = shaderDef.fshader();
			//fs = fs.split("uniform sampler2D texture12;").join("");
			fs = fs.split("texture12").join("CC_Texture0");

			console.log(ShaderGraph.Beautify(
				//optimize_glsl(fs, "2", "fs"),
				fs,
				{
					"indent_size": 1,
					"indent_char": '\t',
					"max_preserve_newlines": -1,
					"brace_style": "expand",
					"wrap_line_length": 0
				}
			));

			cc.EffectPreview.frag_glsl = fs;
			cc.EffectPreview.updateShader();
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

		instance.registerConnectionType("basicRL", {
			anchors: ["Right", "Left"],
			connector: "Bezier"
		});

		instance.registerConnectionType("basicLR", {
			anchors: ["Left", "Right"],
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
			connectorStyle: {
				strokeStyle: "black",
				lineWidth: 2,
				outlineColor: "transparent",
				outlineWidth: 4
			},
			maxConnections: 1,
			connectionType: this.props.type === "in" ? "basicLR" : "basicRL",
			onMaxConnections: function (info, e) {
				console.error("Maximum connections (" + info.maxConnections + ") reached");
			},
			extract: {
				"action": "the-action"
			}
		});

		instance.makeTarget(el, {
			dropOptions: { hoverClass: "dragHover" },
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

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

var shaderGraph;

Editor.polymerElement({
	ready: function(){
		shaderGraph = this;

		setTimeout(function(){
			shaderGraph._appInstance = ReactDOM.render(React.createElement(App), shaderGraph.$.content);

			/*
			// build the list of nodes
			var sidebar = Polymer.dom(document.getElementById("sidebar"));
			var items = shaderGraph.nodeList();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				item.className = "list-group-item add-node-button";
				sidebar.appendChild(item);
			}
			*/

			//*
			var nodes = [
				{type:"value", pos:[0, 0], value:70},
				{type:"uv", pos:[0, 100]},
				{type:"value", pos:[0, 220], value:35},
				{type:"value", pos:[0, 320], value:0.5},
				{type:"multiply", pos:[200, 50]},
				{type:"multiply", pos:[200, 150]},
				{type:"cos", pos:[350, 50]},
				{type:"sin", pos:[350, 150]},
				{type:"join", pos:[500, 100]},
				{type:"value", pos:[300, 300], value: 1}
			];
			var links = [
				[2, 6],
				[3.1, 6.1],
				[3.2, 7],
				[4, 7.1],
				[6, 8],
				[7, 9],
				[8, 10],
				[9, 10.1],
				[5, 10.2],
				[11, 10.3],
				[10, 1]
			];
			//*/
			/*
			var nodes = [
				{type:"fragColor", pos:[660, 200]},
				{type:"texture", pos:[0, 0]},
				{type:"split", pos:[0, 170]},
				{type:"add", pos:[135, 90]},
				{type:"add", pos:[267, 90]},
				{type:"divide", pos:[400, 90]},
				{type:"value", pos:[250, 175], value:3},
				{type:"join", pos:[530, 170]}
			];
			var links = [
				[2, 3],
				[3, 4],
				[3.1, 4.1],
				[4, 5],
				[3.2, 5.1],
				[5, 6],
				[7, 6.1],
				[6, 8],
				[6, 8.1],
				[6, 8.2],
				[3.3, 8.3],
				[8, 1]
			];
			//*/

			for (var i = 0; i < nodes.length; i++) {
				shaderGraph._appInstance.addNode(nodes[i]);
			}

			for (var i = 0; i < links.length; i++) {
				shaderGraph._appInstance.connect(links[i][0], links[i][1]);
			}
		}, 1000);

	},
	nodeList: function() {
		return shaderGraph._appInstance.nodeTypes().map(function (type) {
			var item = document.createElement("a");
			item.type = item.innerHTML = type;
			return item;
		});
	},
	addNode: function(e) {
		var b = graph.querySelector("#canvas").getBoundingClientRect();
		var pos = e.pos || [0, 0];
		pos[0] -= b.left;
		pos[1] -= b.top;
		e.pos = pos;
		shaderGraph._appInstance.addNode(e);
	},
	setTransform: function( s, r, n, t ){
		// s = 1, r = 1, n = 0, t = 0;
		this.style.transform = "matrix(" +
			s + ", 0, 0, " +
			r + ", " +
			Math.round(n + 0.5 * this.offsetWidth * (s - 1)) + ", " +
			Math.round(t + 0.5 * this.offsetHeight * (r - 1)) + ")";
	}
});

})();
