module.exports = {

	AbsNode: require('./src/nodes/AbsNode'),
	AddNode: require('./src/nodes/AddNode'),
	JoinComponentsNode: require('./src/nodes/JoinComponentsNode'),
	Attribute: require('./src/Attribute'),
	CeilNode: require('./src/nodes/CeilNode'),
	Clamp01Node: require('./src/nodes/Clamp01Node'),
	ClampNode: require('./src/nodes/ClampNode'),
	Connection: require('./src/Connection'),
	ComponentMaskNode: require('./src/nodes/ComponentMaskNode'),
	CosNode: require('./src/nodes/CosNode'),
	DistanceNode: require('./src/nodes/DistanceNode'),
	DivideNode: require('./src/nodes/DivideNode'),
	FloorNode: require('./src/nodes/FloorNode'),
	FracNode: require('./src/nodes/FracNode'),
	FragColorNode: require('./src/nodes/FragColorNode'),
	FragmentGraph: require('./src/FragmentGraph'),
	Graph: require('./src/Graph'),
	GraphShader: require('./src/GraphShader'),
	IfNode: require('./src/nodes/IfNode'),
	LogNode: require('./src/nodes/LogNode'),
	MathFunctionNode: require('./src/nodes/MathFunctionNode'),
	Matrix4Node: require('./src/nodes/Matrix4Node'),
	MaxNode: require('./src/nodes/MaxNode'),
	MinNode: require('./src/nodes/MinNode'),
	MixNode: require('./src/nodes/MixNode'),
	ModNode: require('./src/nodes/ModNode'),
	LengthNode: require('./src/nodes/LengthNode'),
	MultiplyNode: require('./src/nodes/MultiplyNode'),
	Node: require('./src/nodes/Node'),
	NormalizeNode: require('./src/nodes/NormalizeNode'),
	OperatorNode: require('./src/nodes/OperatorNode'),
	PositionNode: require('./src/nodes/PositionNode'),
	PowNode: require('./src/nodes/PowNode'),
	RelayNode: require('./src/nodes/RelayNode'),
	ReciprocalNode: require('./src/nodes/ReciprocalNode'),
	RoundNode: require('./src/nodes/RoundNode'),
	SignNode: require('./src/nodes/SignNode'),
	SineNode: require('./src/nodes/SineNode'),
	SmoothStepNode: require('./src/nodes/SmoothStepNode'),
	SqrtNode: require('./src/nodes/SqrtNode'),
	StepNode: require('./src/nodes/StepNode'),
	SubtractNode: require('./src/nodes/SubtractNode'),
	TextureNode: require('./src/nodes/TextureNode'),
	TimeNode: require('./src/nodes/TimeNode'),
	TruncNode: require('./src/nodes/TruncNode'),
	UberFragNode: require('./src/nodes/UberFragNode'),
	UberVertNode: require('./src/nodes/UberVertNode'),
	Uniform: require('./src/Uniform'),
	Utils: require('./src/Utils'),
	UVNode: require('./src/nodes/UVNode'),
	ValueNode: require('./src/nodes/ValueNode'),
	Varying: require('./src/Varying'),
	Vector2Node: require('./src/nodes/Vector2Node'),
	Vector3Node: require('./src/nodes/Vector3Node'),
	Vector4Node: require('./src/nodes/Vector4Node'),
	SplitComponentsNode: require('./src/nodes/SplitComponentsNode'),
	Beautify: require('./editor/js/external/beautify').js_beautify,

};

if(typeof(window) !== 'undefined'){
	window.ShaderGraph = module.exports;
}