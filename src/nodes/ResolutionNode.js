var Node = require('./Node');
var Uniform = require('../Uniform');
var Attribute = require('../Attribute');
var Varying = require('../Varying');

module.exports = ResolutionNode;

function ResolutionNode(options){
	options = options || {};
	Node.call(this, options);
}
ResolutionNode.prototype = Object.create(Node.prototype);
ResolutionNode.prototype.constructor = ResolutionNode;

Node.registerClass('resolution', ResolutionNode);

ResolutionNode.prototype.getOutputPorts = function(key){
	return [
		'wh',
		'w',
		'h'
	];
};

ResolutionNode.prototype.getUniforms = function(){
	var uniforms = [
		new Uniform({
			name: 'resolution',
			defaultValue: 'RESOLUTION',
			type: 'vec2'
		})
	];
	return uniforms;
};

ResolutionNode.prototype.getOutputTypes = function(key){
	var types = [];
	switch(key){
	case 'wh':
		types = ['vec2'];
		break;
	case 'w':
	case 'h':
		types = ['float'];
		break;
	}
	return types;
};

ResolutionNode.prototype.render = function(){
	var source = [];

	var whVarName = this.getOutputVariableNames('wh')[0];
	if(whVarName){
		source.push(whVarName + ' = resolution;');
	}

	var wVarName = this.getOutputVariableNames('w')[0];
	if(wVarName){
		source.push(wVarName + ' = resolution.x;');
	}

	var hVarName = this.getOutputVariableNames('h')[0];
	if(hVarName){
		source.push(hVarName + ' = resolution.y;');
	}

	return source.join('\n');
};
