(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function() {
	},
	properties: {
		nodes: {
			type: Array,
		}
	}
});

})();
