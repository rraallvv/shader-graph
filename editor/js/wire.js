(function(){

if ( typeof Editor === "undefined" ) {
	window.Editor = { polymerElement: Polymer, log: console.log };
}

Editor.polymerElement({
	ready: function() {
		this.$.A.addEventListener("mousedown", this._onDragConnector.bind( this ), true);
		this.$.B.addEventListener("mousedown", this._onDragConnector.bind( this ), true);
	},
	created: function() {
		// Get connector styling
		var style = this._getStyleRule("svg.shader-wire circle.shader-wire") || {};
		var strokeWidth = parseFloat(style["stroke-width"] || 1);
		var radius = parseFloat(style.r || 0);
		this.radius = strokeWidth + radius;

		// Get path styling
		style = this._getStyleRule("svg.shader-wire path.shader-wire") || {};
		this.strokeWidth = parseFloat(style["stroke-width"] || 1);

		this.curviness = 200;
	},
	properties: {
		posA: {
			type: Array,
			value: function() { return [300,0]; },
		},
		posB: {
			type: Array,
			value: function() { return [100,100]; },
		}
	},
	observers: [
		'_onPosChange(posA, posB)'
	],
	_onPosChange(posA, posB) {
		// Bounding box for connectors
		var left = Math.min( posA[ 0 ], posB[ 0 ] );
		var top = Math.min( posA[ 1 ], posB[ 1 ] );
		var width = Math.abs( posA[ 0 ] - posB[ 0 ] );
		var height = Math.abs( posA[ 1 ] - posB[ 1 ] );

		// Bounding box with wire and connector circle
		var bb = this._bezierBoundingBox( posA[ 0 ] - left, posA[ 1 ] - top,
			posA[ 0 ] - left + this.curviness, posA[ 1 ] - top,
			posB[ 0 ] - left - this.curviness, posB[ 1 ] - top,
			posB[ 0 ] - left, posB[ 1 ] - top );

		var radiusx2 = 2 * this.radius;

		left = Math.min(left - this.radius, left + bb.min.x);
		top = Math.min(top - this.radius, top + bb.min.y);
		width = Math.max(width + radiusx2, bb.max.x - bb.min.x);
		height = Math.max(height + radiusx2, bb.max.y - bb.min.y);

		// Element position and size
		this.style.left = left + "px";
		this.style.top = top + "px";

		this.style.width = width + "px";
		this.style.height = height + "px";

		// Add bounding box offset
		posA[0] -= left;
		posA[1] -= top;
		posB[0] -= left;
		posB[1] -= top;

		// Conector A position
		this.$.A.setAttribute("cx", posA[0]);
		this.$.A.setAttribute("cy", posA[1]);

		// Conector B position
		this.$.B.setAttribute("cx", posB[0]);
		this.$.B.setAttribute("cy", posB[1]);

		// Wire position
		this.$.W.setAttribute("d", "M " +
			// A
			posA[0] + " " + posA[1] + " " +
			// control A
			" C " + (posA[0] + this.curviness) + " " + posA[1] + " " +
			// control B
			(posB[0] - this.curviness) + " " + posB[1] + " " +
			// B
			posB[0] + " " + posB[1]);
	},
	_getStyleRule: function(selector) {
		for (var i = 0; i < document.styleSheets.length; i++) {
			var mysheet = document.styleSheets[i];
			var myrules = mysheet.cssRules ? mysheet.cssRules : mysheet.rules;
			for (var j = 0; j < myrules.length; j++) {
				if (myrules[j].selectorText && myrules[j].selectorText.toLowerCase() === selector) {
					return myrules[j].style;
				}
			}

		}
	},
	_bezierBoundingBox: function( x0, y0, x1, y1, x2, y2, x3, y3 ) {
		var tvalues = [], xvalues = [], yvalues = [],
		a, b, c, t, t1, t2, b2ac, sqrtb2ac;
		for ( var i = 0; i < 2; ++i ) {
			if ( i == 0 ) {
				b = 6 * x0 - 12 * x1 + 6 * x2;
				a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
				c = 3 * x1 - 3 * x0;
			} else {
				b = 6 * y0 - 12 * y1 + 6 * y2;
				a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
				c = 3 * y1 - 3 * y0;
			}
			if ( Math.abs( a ) < 1e-12 ) {
				if ( Math.abs( b ) < 1e-12 ) {
					continue;
				}
				t = -c / b;
				if ( 0 < t && t < 1 ) {
					tvalues.push( t );
				}
				continue;
			}
			b2ac = b * b - 4 * c * a;
			if ( b2ac < 0 ) {
				continue;
			}
			sqrtb2ac = Math.sqrt( b2ac );
			t1 = (-b + sqrtb2ac) / (2 * a);
			if ( 0 < t1 && t1 < 1 ) {
				tvalues.push( t1 );
			}
			t2 = (-b - sqrtb2ac) / (2 * a);
			if ( 0 < t2 && t2 < 1 ) {
				tvalues.push( t2 );
			}
		}

		var j = tvalues.length, mt;
		while ( j-- ) {
			t = tvalues[ j ];
			mt = 1 - t;
			xvalues[ j ] = (mt * mt * mt * x0) + (3 * mt * mt * t * x1) + (3 * mt * t * t * x2) + (t * t * t * x3);
			yvalues[ j ] = (mt * mt * mt * y0) + (3 * mt * mt * t * y1) + (3 * mt * t * t * y2) + (t * t * t * y3);
		}

		xvalues.push( x0, x3 );
		yvalues.push( y0, y3 );

		return {
		min: { x: Math.min.apply( 0, xvalues ), y: Math.min.apply( 0, yvalues ) },
		max: { x: Math.max.apply( 0, xvalues ), y: Math.max.apply( 0, yvalues ) }
		};
	},
	_onDragConnector: function( e ) {
		if (3 === e.which || 2 === e.which) {
			return true;
		}
		e.stopPropagation();
		var self = this;
		this.style.cursor = "pointer";
		Editor.UI.DomUtils.startDrag("pointer", e, function( o, dx, dy ) {
			if (e.target.id === "A") {
				self.posA = [self.posA[0] - dx, self.posA[1] - dy];
			} else {
				self.posB = [self.posB[0] + dx, self.posB[1] + dy];
			}
		}, function( e ) {
			self.style.cursor = "";
		});
	}
});

})();