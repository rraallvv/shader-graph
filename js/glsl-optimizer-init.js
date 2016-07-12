// var statusLabel = document.getElementById('statusLabel');
var GLSLOptimizer = {
	onError: function(reason)
	{
		console.error(e);
		// statusLabel.textContent = reason;
	},
	onSuccess: function(code)
	{
		// errorLabel.textContent = statusLabel.textContent = '';
		source.value = code;
	},
}
var optimize_glsl = function()
{
	alert('not loaded yet!');
}

function postRun()
{
	optimize_glsl = Module.cwrap('optimize_glsl', 'string', ['string', 'number', 'number']);
}

function optimize()
{
	var results = optimize_glsl(source.value, +target.value, shaderType.value === "vs");
	console.log('results', results)
	if(results.indexOf('Error:') > -1)
	{
		GLSLOptimizer.onError(results);
	}
	else
	{
		GLSLOptimizer.onSuccess(results);
	}
}
var Module = {
	preRun: [],
	postRun: [postRun],
	print: function(text)
	{
		console.log('::print::', text);
		errorLabel.textContent = text;
	},
	printErr: function(text)
	{
		text = Array.prototype.slice.call(arguments).join(' ');
		if(0)
		{ // XXX disabled for safety typeof dump == 'function') {
			dump(text + '\n'); // fast, straight to the real console
		}
		else
		{
			// console.error(text);
		}
	},
	setStatus: function(text)
	{
		// console.log('::status::', text)
		// statusLabel.textContent = text;
	},
	totalDependencies: 0,
	monitorRunDependencies: function(left)
	{
		// console.error('monitorRunDependencies', left);
		this.totalDependencies = Math.max(this.totalDependencies, left);
		Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies - left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
	},
	locateFile: function(hoho)
	{
		return 'js/glsl-optimizer.js.mem';
	}
};
Module.setStatus('Downloading...');
window.onerror = function(event)
{
	Module.setStatus('Exception thrown, see JavaScript console');
	Module.setStatus = function(text)
	{
		if(text) Module.printErr('[post-exception status] ' + text);
	};
};
