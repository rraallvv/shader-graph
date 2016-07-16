(function() {

"use strict";

Editor.polymerElement({
	ready: function() {
		var self = this;
		this.$.preview.onload = function() {
			parent.preview.init();
			if (self.onload) {
				parent.preview.onload = self.onload;
			}
		};
	},
	updateShader: function(shaderDef) {
		if (parent.preview) {
			parent.preview.updateShader(shaderDef);
		}
	}
});

})();
