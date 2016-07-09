cc._RFpush({ exports: {} }, '414458STphLF75+aFmYFzfh', 'EffectPreview');

"use strict";

cc.Class({
	"extends": cc.Component,
	properties: {
		isAllChildrenUser: false,
		frag_glsl: {
			"default": "EffectPreview.fs.glsl",
			visible: false
		},
		vert_glsl_no_mvp: {
			"default": "EffectPreview_noMVP.vs",
			visible: false
		},
		vert_glsl: {
			"default": "EffectPreview.vs",
			visible: false
		}
	},
	onLoad: function onLoad() {
		var self = cc.EffectPreview = this;

		cc.loader.loadRes(self.frag_glsl, function(err, txt) {
			if (err) {
				cc.log(err);
			} else {
				self.frag_glsl = txt;
				cc.loader.loadRes(self.vert_glsl_no_mvp, function(err, txt) {
					if (err) {
						cc.log(err);
					} else {
						self.vert_glsl_no_mvp = txt;
						cc.loader.loadRes(self.vert_glsl, function(err, txt) {
							if (err) {
								cc.log(err);
							} else {
								self.vert_glsl = txt;
								self._use();
							}
						});
					}
				});
			}
		});

		cc.eventManager.dispatchCustomEvent("preview_did_load");
	},
	_use: function _use() {
		this._program = new cc.GLProgram();
		if (cc.sys.isNative) {
			cc.log("use native GLProgram");
			this._program.initWithString(this.vert_glsl_no_mvp, this.frag_glsl);
			this._program.link();
			this._program.updateUniforms();
		} else {
			this._program.initWithVertexShaderByteArray(this.vert_glsl, this.frag_glsl);
			this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_POSITION, cc.macro.VERTEX_ATTRIB_POSITION);
			this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_COLOR, cc.macro.VERTEX_ATTRIB_COLOR);
			this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_TEX_COORD, cc.macro.VERTEX_ATTRIB_TEX_COORDS);
			this._program.link();
			this._program.updateUniforms();
		}
		this.setProgram(this.node._sgNode, this._program);
	},
	setProgram: function setProgram(node, program) {
		if (cc.sys.isNative) {
			var glProgram_state = cc.GLProgramState.getOrCreateWithGLProgram(program);
			node.setGLProgramState(glProgram_state);
		} else {
			node.setShaderProgram(program);
		}
		var children = node.children;
		if (!children) return;
		for (var i = 0; i < children.length; i++) {
			this.setProgram(children[i], program);
		}
	}
});

cc._RFpop();
