var Node = require('./Node');
var Uniform = require('../Uniform');
var Attribute = require('../Attribute');
var Varying = require('../Varying');

module.exports = MouseTouchNode;

function MouseTouchNode(options){
	options = options || {};
	Node.call(this, options);
}
MouseTouchNode.prototype = Object.create(Node.prototype);
MouseTouchNode.prototype.constructor = MouseTouchNode;

Node.registerClass('mouseTouch', MouseTouchNode);

MouseTouchNode.prototype.getOutputPorts = function(key){
	return [
		'xy',
		'x',
		'y'
	];
};

MouseTouchNode.prototype.getUniforms = function(){
	var uniforms = [
		new Uniform({
			name: 'mouse_touch',
			defaultValue: 'MOUSETOUCH',
			type: 'vec2'
		})
	];
	return uniforms;
};

MouseTouchNode.prototype.getOutputTypes = function(key){
	var types = [];
	switch(key){
	case 'xy':
		types = ['vec2'];
		break;
	case 'x':
	case 'y':
		types = ['float'];
		break;
	}
	return types;
};

MouseTouchNode.prototype.render = function(){
	var source = [];

	var xyVarName = this.getOutputVariableNames('xy')[0];
	if(xyVarName){
		source.push(xyVarName + ' = mouse_touch;');
	}

	var xVarName = this.getOutputVariableNames('x')[0];
	if(xVarName){
		source.push(xVarName + ' = mouse_touch.x;');
	}

	var yVarName = this.getOutputVariableNames('y')[0];
	if(yVarName){
		source.push(yVarName + ' = mouse_touch.y;');
	}

	return source.join('\n');
};
