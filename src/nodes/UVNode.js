var Node = require('./Node');
var Uniform = require('../Uniform');
var Attribute = require('../Attribute');
var Varying = require('../Varying');

module.exports = UVNode;

function UVNode(options){
	options = options || {};
	Node.call(this, options);
}
UVNode.prototype = Object.create(Node.prototype);
UVNode.prototype.constructor = UVNode;

Node.registerClass('uv', UVNode);

UVNode.prototype.getOutputPorts = function(key){
	return [
		'uv',
		'u',
		'v'
	];
};

UVNode.prototype.getAttributes = function(){
	return [
		new Attribute({
			name: 'a_texCoord',
			key: 'TEX_COORD',
			type: 'vec2',
			ifdef: 'TEX_COORD'
		})
	];
};

UVNode.prototype.getVaryings = function(){
	return [
		new Varying({
			type: 'vec2',
			name: 'v_texCoord',
			attributeKey: 'TEX_COORD'
		})
	];
};

UVNode.prototype.getOutputTypes = function(key){
	var types = [];
	switch(key){
	case 'uv':
		types = ['vec2'];
		break;
	case 'u':
	case 'v':
		types = ['float'];
		break;
	}
	return types;
};

UVNode.prototype.render = function(){
	var source = [];

	var uvVarName = this.getOutputVariableNames('uv')[0];
	if(uvVarName){
		source.push(uvVarName + ' = v_texCoord;');
	}

	var uVarName = this.getOutputVariableNames('u')[0];
	if(uVarName){
		source.push(uVarName + ' = v_texCoord.x;');
	}

	var vVarName = this.getOutputVariableNames('v')[0];
	if(vVarName){
		source.push(vVarName + ' = v_texCoord.y;');
	}

	return source.join('\n');
};
