(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function() {
	},
	properties: {
		id: String,
		type: String,
		instance: Object,
		className: String,
		ports: {
			type: Object,
			value: function(){return [];}
		}
	}
});

})();
