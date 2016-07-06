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
		this.state.nodes.push({
			id: this.generateId(),
			type: ShaderGraph.FragColorNode.type
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
	connect: function(nodeA, outputA, nodeB, inputB){
		var nA = this.shader.fragmentGraph.getNodeById(nodeA);
		var nB = this.shader.fragmentGraph.getNodeById(nodeB);
		if(!nA) throw new Error('couldnt find node ' + nodeA);
		if(!nB) throw new Error('couldnt find node ' + nodeB);

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
	},
	render: function() {
		this.updateShader();
		return (
			<div className="preview col-xs-12 style-scope shader-graph"></div>
		);
	},
	updateShader: function(){
		if(this.entity){
			var shaderDef = this.props.shader.buildShader();
			//console.log(shaderDef.fshader())
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
			Connector: "Bezier",
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
			return {
				nodeA: info.source.parentNode.parentNode.attributes['data-node-id'].value,
				nodeB: info.target.parentNode.parentNode.attributes['data-node-id'].value,
				outputA: info.source.innerHTML,
				inputB: info.target.innerHTML
			};
		}

		instance.bind("click", function (c) {
			if(!ignoreConnectionEvents){
				var info = getConnectionInfo(c);
				component.props.disconnect(info.nodeA, info.outputA, info.nodeB, info.inputB);
				//instance.detach(c);
			}
		});

		instance.bind("beforeDrop", function (c) {
			var reg = /([^\d]+)(\d+)/;
			var m = c.sourceId.match(reg);
			var outputA = m[1];
			var nodeA = m[2];

			m = c.targetId.match(reg);
			var inputB = m[1];
			var nodeB = m[2];

			if(!ignoreConnectionEvents && !component.props.connect(nodeA, outputA, nodeB, inputB)){
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

		return (
			<div className={"w node-type-" + this.props.data.type + " style-scope shader-graph"} data-node-id={this.props.data.id}>
				<div className="title style-scope shader-graph">
					{this.props.data.type}
					{removeButton}
				</div>
				<div className="inputs style-scope shader-graph">
					{inputs}
				</div>
				<div className="outputs style-scope shader-graph">
					{outputs}
				</div>
				{extra}
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
