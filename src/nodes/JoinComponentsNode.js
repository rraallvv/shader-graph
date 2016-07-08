var Node = require('./Node');
var Uniform = require('../Uniform');

module.exports = JoinComponentsNode;

// A vector with four components/values.
function JoinComponentsNode(options){
	options = options || {};
	Node.call(this, options);
}
JoinComponentsNode.prototype = Object.create(Node.prototype);
JoinComponentsNode.prototype.constructor = JoinComponentsNode;

Node.registerClass('join', JoinComponentsNode);

JoinComponentsNode.supportedTypes = [
	'float',
	'vec2',
	'vec3',
	'vec4'
];

JoinComponentsNode.prototype.getInputPorts = function(){
	// var sum = this.getComponentSum();

	// var a = this.inputPortIsConnected('a');
	// var b = this.inputPortIsConnected('b');
	// var c = this.inputPortIsConnected('c');
	// var d = this.inputPortIsConnected('d');

	// if(!a && !b && !c && !d)
	// 	return ['a'];
	// else if(a && !b && !c && !d && sum < 4)
	// 	return ['a', 'b'];
	// else if(a && b && !c && !d && sum < 4)
	// 	return ['a', 'b', 'c'];
	// else if(a && b && c && !d && sum < 4)
	// 	return ['a', 'b', 'c', 'd'];
	// else
	return ['a', 'b', 'c', 'd'];
};

JoinComponentsNode.prototype.getOutputPorts = function(){
	return ['out'];
};

JoinComponentsNode.prototype.getInputTypes = function(key){
	var types;
	switch(key){
	case 'a':
	case 'b':
	case 'c':
	case 'd':
		types = JoinComponentsNode.supportedTypes.slice(0/*, 4 - sum*/);
		break;
	}
	return types;
};

JoinComponentsNode.prototype.getComponentSum = function(){
	var ports = 'abcd';
	var weights = {
		'float': 1,
		'vec2': 2,
		'vec3': 3,
		'vec4': 4
	};
	var sum = 0;
	for(var i=0; i<ports.length; i++){
		var x = ports[i];
		if(this.inputPortIsConnected(x)){
			var type = this.getInputVariableTypes(x)[0];
			sum += weights[type];
		}
	}
	return sum;
};

JoinComponentsNode.prototype.getOutputTypes = function(key){
	return key === 'out' ? [JoinComponentsNode.supportedTypes[this.getComponentSum() - 1]] : [];
};

JoinComponentsNode.prototype.render = function(){
	var a = this.getInputVariableName('a');
	var b = this.getInputVariableName('b');
	var c = this.getInputVariableName('c');
	var d = this.getInputVariableName('d');
	var vars = [];
	if(a) vars.push(a);
	if(b) vars.push(b);
	if(c) vars.push(c);
	if(d) vars.push(d);

	var outVarName = this.getOutputVariableNames('out')[0];
	var outType = this.getOutputTypes('out')[0];

	if(outVarName){
		return outVarName + ' = ' + outType + '(' + vars.join(',') + ');';
	}

	return '';
};