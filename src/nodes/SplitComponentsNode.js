var Node = require('./Node');
var Utils = require('../Utils');

module.exports = SplitComponentsNode;

function SplitComponentsNode(options){
	options = options || {};
	Node.call(this, options);
}

SplitComponentsNode.prototype = Object.create(Node.prototype);
SplitComponentsNode.prototype.constructor = SplitComponentsNode;

Node.registerClass('split', SplitComponentsNode);

SplitComponentsNode.supportedTypes = [
	'vec2',
	'vec3',
	'vec4'
];

SplitComponentsNode.prototype.getInputPorts = function(key){
	return ['in'];
};

SplitComponentsNode.prototype.getOutputPorts = function(key){
	return [
		'a',
		'b',
		'c',
		'd'
	];
};

// Output type is always one channel: float
SplitComponentsNode.prototype.getOutputTypes = function(key){
	return ['float'];
};

SplitComponentsNode.prototype.getInputTypes = function(key){
	return key === 'in' ? SplitComponentsNode.supportedTypes : [];
};

SplitComponentsNode.prototype.render = function(){
	var source = [];

	var inName = this.getInputVariableName('in');

	var aVarName = this.getOutputVariableNames('a')[0];
	if(aVarName){
		source.push(aVarName + ' = ' + inName + '.x;');
	}

	var bVarName = this.getOutputVariableNames('b')[0];
	if(bVarName){
		source.push(bVarName + ' = ' + inName + '.y;');
	}

	var cVarName = this.getOutputVariableNames('c')[0];
	if(cVarName){
		source.push(cVarName + ' = ' + inName + '.z;');
	}

	var dVarName = this.getOutputVariableNames('d')[0];
	if(dVarName){
		source.push(dVarName + ' = ' + inName + '.w;');
	}

	return source.join('\n');
};