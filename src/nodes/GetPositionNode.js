var Node = require('./Node');
var Uniform = require('../Uniform');
var Attribute = require('../Attribute');
var Varying = require('../Varying');

module.exports = GetPosition;

function GetPosition(options){
	options = options || {};
	Node.call(this, options);
}
GetPosition.prototype = Object.create(Node.prototype);
GetPosition.prototype.constructor = GetPosition;

Node.registerClass('getPosition', GetPosition);

GetPosition.prototype.getOutputPorts = function(key){
	return ['position'];
};

GetPosition.prototype.getOutputTypes = function(key){
	return ['vec3'];
};

GetPosition.prototype.render = function(){
	var source = [];

	var positionVarName = this.getOutputVariableNames('position')[0];
	if(positionVarName){
		source.push(positionVarName + ' = a_position;');
	}

	return source.join('\n');
};
