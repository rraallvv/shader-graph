var toposort = require('toposort');

module.exports = Graph;

function Graph(options){
	options = options || {};

	this.shader = options.shader || null;
	this.nodes = [];
	this.links = [];
	this._idCounter = 1;
	this.mainNode = options.mainNode || null;
	if(this.mainNode){
		this.addNode(this.mainNode);
	}
}

Graph.prototype.addNode = function(node){
	if(!node) throw new Error('Node not given');
	if(node.graph) throw new Error('Node was already added to a graph');

	if(node.id){
		this._idCounter = Math.max(node.id + 1, this._idCounter);
	} else {
		node.id = this._idCounter++;
	}

	this.nodes.push(node);
	node.graph = this;
};

Graph.prototype.removeNode = function(node){
	var index = this.nodes.indexOf(node);
	if(index !== -1){
		this.nodes.splice(index, 1);
		node.graph = null;
	} else {
		throw new Error('Couldn\'t find node');
	}
};

Graph.prototype.getNodeById = function(id){
	return this.nodes.find(function(node){
		return node.id == id;
	});
};

Graph.prototype.addConnection = function(link){
	if(link.graph) throw new Error('Connection was already added to a graph');
	this.links.push(link);
	link.graph = this;
	this.sortNodes();
};

Graph.prototype.removeConnection = function(link){
	var index = this.links.indexOf(link);
	if(index !== -1){
		this.links.splice(index, 1);
	}
};

Graph.prototype.inputPortIsConnected = function(node, inputPort){
	return this.links.some(function (link){
		return link.toNode === node && link.toPortKey === inputPort;
	});
};

Graph.prototype.outputPortIsConnected = function(node, outputPort){
	return this.links.some(function (link){
		return link.fromNode === node && link.fromPortKey === outputPort;
	});
};

Graph.prototype.getNodeConnectedToInputPort = function(node, inputPort){
	var link = this.links.filter(function (link){
		return link.toNode === node && link.toPortKey === inputPort;
	})[0];
	return link && link.fromNode;
};

Graph.prototype.getPortKeyConnectedToInputPort = function(node, inputPort){
	var link = this.links.filter(function (link){
		return link.toNode === node && link.toPortKey === inputPort;
	})[0];
	return link && link.fromPortKey;
};

Graph.prototype.getUniforms = function(){
	var uniforms = [];
	this.nodes.forEach(function (node){
		uniforms = uniforms.concat(node.getUniforms());
	});
	return uniforms;
};

Graph.prototype.getAttributes = function(){
	var attributes = [];
	this.shader.getNodes().forEach(function (node){
		attributes = attributes.concat(node.getAttributes());
	});
	return attributes;
};

Graph.prototype.getVaryings = function(){
	var varyings = [];
	this.shader.getNodes().forEach(function (node){
		varyings = varyings.concat(node.getVaryings());
	});
	return varyings;
};

Graph.prototype.getProcessors = function(){
	var processors = [];
	this.nodes.forEach(function (node){
		processors = processors.concat(node.getProcessors());
	});
	return processors;
};

function sortByName(a1, a2){
	if(a1.name === a2.name){
		return 0;
	} else if(a1.name > a2.name){
		return 1;
	} else {
		return -1;
	}
}

Graph.prototype.renderNodeCodes = function(){
	var shaderSource = [];
	var nodes = this.nodes;
	for (var i = 0; i < nodes.length; i++) {
		node = nodes[i];
		if(node !== this.mainNode){ // Save main node until last
			var nodeSource = node.render();
			if(nodeSource){
				shaderSource.push('{ // node ' + node.id + ', ' + node.constructor.type, nodeSource, '}');
			}
		}
	}
	return shaderSource.join('\n');
};

Graph.prototype.renderAttributeToVaryingAssignments = function(){
	var shaderSource = [];
	var keyToAttributeMap = {};
	this.getAttributes().forEach(function(attribute){
		keyToAttributeMap[attribute.key] = attribute;
	});
	this.getVaryings().sort(sortByName).forEach(function(varying){
		var attribute = keyToAttributeMap[varying.attributeKey];
		if(attribute){
			shaderSource.push(varying.name + ' = ' + attribute.name + ';');
		}
	});
	return shaderSource.join('\n');
};

Graph.prototype.renderConnectionVariableDeclarations = function(){
	var shaderSource = [];
	var nodes = this.nodes;
	for (var i = 0; i < nodes.length; i++) {
		node = nodes[i];
		var outputPorts = node.getOutputPorts();
		for (var k = 0; k < outputPorts.length; k++) {
			var key = outputPorts[k];
			// is the output port connected?
			if(this.outputPortIsConnected(node, key)){
				var types = node.getOutputTypes(key);
				var names = node.getOutputVariableNames(key);
				for (j = 0; j < names.length; j++) {
					shaderSource.push(types[j] + ' ' + names[j] + ';');
				}
			}
		}
	}
	return shaderSource.join('\n');
};

Graph.prototype.renderUniformDeclarations = function(){
	var shaderSource = [];
	this.getUniforms().sort(sortByName).forEach(function(uniform){
		shaderSource.push('uniform ' + uniform.type + ' ' + uniform.name + ';');
	});
	return shaderSource.join('\n');
};

Graph.prototype.renderAttributeDeclarations = function(){
	var shaderSource = [];
	var declarations = {}; // Only unique declarations
	this.getAttributes().sort(sortByName).forEach(function(attribute){
		declarations['attribute ' + attribute.type + ' ' + attribute.name + ';'] = true;
	});
	return Object.keys(declarations).join('\n');
};

Graph.prototype.renderVaryingDeclarations = function(){
	var shaderSource = [];
	var declarations = {}; // Only unique declarations
	this.getVaryings().sort(sortByName).forEach(function(varying){
		declarations['varying ' + varying.type + ' ' + varying.name + ';'] = true;
	});
	return Object.keys(declarations).join('\n');
};

// Topology sort the nodes
Graph.prototype.sortNodes = function(){
	var edges = this.links.map(function (link) {
		return [
			link.fromNode.id,
			link.toNode.id
		];
	});
	var nodeIds = toposort(edges);
	var nodes = this.nodes.slice(0);
	this.nodes = nodeIds.map(function (nodeId) {
		for (var i = nodes.length - 1; i >= 0; i--) {
			var node = nodes[i];
			if(nodeId === node.id) return nodes.splice(i, 1)[0];
		}
		throw new Error('Node id not found: ' + nodeId);
	});

	// add any left overs (needed?)
	while(nodes.length){
		this.nodes.push(nodes.pop())
	}
};
