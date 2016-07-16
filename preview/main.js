(function() {

"use strict";



Editor.polymerElement({
	ready: function() {
		this.$.preview.onload = function() {
			parent.preview.init();
		};
	}
});

})();
