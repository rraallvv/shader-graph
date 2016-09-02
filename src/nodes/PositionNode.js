var Node = require('./Node');

module.exports = PositionNode;

function PositionNode(options){
	options = options || {};
	Node.call(this, options);
}
PositionNode.prototype = Object.create(Node.prototype);
PositionNode.prototype.constructor = PositionNode;

Node.registerClass('position', PositionNode);

PositionNode.prototype.getInputPorts = function(key){
	return ['position'];
};

PositionNode.prototype.getInputTypes = function(key){
	return ['vec4'];
};

PositionNode.prototype.buildShader = function(){
	return function(){
		this.graph.sortNodes();
		var input = (this.getInputVariableName('position') || 'vec4(a_position, 1.0)');
		return [
			this.graph.renderVaryingDeclarations(),
			this.graph.renderAttributeDeclarations(),
			this.graph.renderUniformDeclarations(),
			'void main(void){',
				this.graph.renderConnectionVariableDeclarations(),
				this.graph.renderNodeCodes(),
				this.graph.renderAttributeToVaryingAssignments(),
				'{',
					'gl_Position = CC_PMatrix * CC_MVMatrix * ' + input + ';',
				'}',
			'}'
		].join('\n');

	}.bind(this);
};
