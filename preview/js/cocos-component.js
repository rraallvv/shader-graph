cc._RFpush({ exports: {} }, '414458STphLF75+aFmYFzfh', 'EffectPreview');

"use strict";

var Editor = parent.Editor;

cc.Class({
	"extends": cc.Component,
	properties: {
		isAllChildrenUser: false,
		frag_glsl: {
			"default": null,
			visible: false
		},
		vert_glsl_no_mvp: {
			"default": null,
			visible: false
		},
		vert_glsl: {
			"default": null,
			visible: false
		}
	},
	onLoad: function onLoad() {
		/*
		cc.eventManager.addCustomListener(cc.Director.EVENT_AFTER_DRAW, function() {
			cc.game.emit(cc.game.EVENT_HIDE, cc.game);
		});
		*/

		/* map the attribute indexes for texture coordinates to the default */
		cc.macro.VERTEX_ATTRIB_TEX_COORD = cc.macro.VERTEX_ATTRIB_TEX_COORDS;
		cc.macro.VERTEX_ATTRIB_TEX_COORD1 = cc.macro.VERTEX_ATTRIB_TEX_COORDS;
		cc.macro.VERTEX_ATTRIB_TEX_COORD2 = cc.macro.VERTEX_ATTRIB_TEX_COORDS;
		cc.macro.VERTEX_ATTRIB_TEX_COORD3 = cc.macro.VERTEX_ATTRIB_TEX_COORDS;

		this.parameters = {
            startTime: Date.now(),
            time: 0.0,
            mouse_touch: [0.0, 0.0],
            resolution: [0.0, 0.0]
		};

		this.uniformLocation = {};

		this.node.on(cc.Node.EventType.MOUSE_MOVE, function (event) {
            this.parameters.mouse_touch[0] = this.node.getContentSize().width / event.getLocationX();
            this.parameters.mouse_touch[1] = this.node.getContentSize().height / event.getLocationY();
        }, this);


        this.node.on( cc.Node.EventType.TOUCH_MOVE, function (event) {
            this.parameters.mouse_touch[0] = this.node.getContentSize().width / event.getLocationX();
            this.parameters.mouse_touch[1] = this.node.getContentSize().height / event.getLocationY();
        }, this);

		var self = cc.EffectPreview = this;

		cc.loader.loadRes("EffectPreview.fs.glsl", function(err, txt) {
			if (err) {
				cc.log(err);
			} else {
				self.frag_glsl = txt;
				cc.loader.loadRes("EffectPreview_noMVP.vs", function(err, txt) {
					if (err) {
						cc.log(err);
					} else {
						self.vert_glsl_no_mvp = txt;
						cc.loader.loadRes("EffectPreview.vs", function(err, txt) {
							if (err) {
								cc.log(err);
							} else {
								self.vert_glsl = txt;
								self.updateShader();
							}
						});
					}
				});
			}
		});

        cc.director.visit(cc.director._deltaTime);
		cc.director.render(cc.director._deltaTime);
		cc.game.emit(cc.game.EVENT_HIDE, cc.game);
		cc.eventManager.dispatchCustomEvent("preview_did_load");
	},
	updateGLParameters(){
        this.parameters.time = (Date.now() - this.parameters.startTime)/1000;
        this.parameters.resolution[0] = ( this.node.getContentSize().width );
        this.parameters.resolution[1] = ( this.node.getContentSize().height );
    },
	updateShader: function updateShader(shaderDef) {
		this.vert_glsl = shaderDef.vshader();
		this.frag_glsl = shaderDef.fshader();
		//fs = fs.split("uniform sampler2D texture12;").join("");
		//fs = fs.split("texture12").join("CC_Texture0");

		//parent.Editor.log("!", shaderDef.attributes);
		//{ vertexUV0: 'TEXCOORD0', vertexPosition: 'POSITION' }
		//parent.Editor.log("!", shaderDef.uniforms);
		//{ viewProjectionMatrix: 'VIEW_PROJECTION_MATRIX', worldMatrix: 'WORLD_MATRIX' }

		var linked = false;
		this._program = new cc.GLProgram();
		if (cc.sys.isNative) {
			cc.log("use native GLProgram");
			this._program.initWithString(this.vert_glsl_no_mvp, this.frag_glsl);
			linked = this._program.link();
		} else {
			this._program.initWithVertexShaderByteArray(this.vert_glsl, this.frag_glsl);
			for(var i = 0; i < shaderDef.attributes.length; i++) {
				var attribute = shaderDef.attributes[i];
				this._program.addAttribute(cc.macro["ATTRIBUTE_NAME_" + attribute.key], cc.macro["VERTEX_ATTRIB_" + attribute.key]);
			}
			linked = this._program.link();
		}

		if (linked) {
			this._program.updateUniforms();

			if (cc.sys.isNative) {
			} else {
				this.uniformLocation["resolution"] = this._program.getUniformLocationForName( "resolution" );
				this.uniformLocation["time"] = this._program.getUniformLocationForName( "time" );
				this.uniformLocation["mouse_touch"] = this._program.getUniformLocationForName( "mouse_touch" );
			}

			this.setProgram(this.node._sgNode, this._program);
		} else {
			Editor.error("Could't link custom shader; using the default one.");
			this.setProgram(this.node._sgNode, cc.shaderCache.programForKey("ShaderPositionTextureColor"));
		}

        cc.director.visit(cc.director._deltaTime);
		cc.director.render(cc.director._deltaTime);
		cc.game.emit(cc.game.EVENT_HIDE, cc.game);
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
	},
	update: function(dt) {
        if(this._program){
            this.updateGLParameters();
            if(cc.sys.isNative){
                var glProgram_state = cc.GLProgramState.getOrCreateWithGLProgram(this._program);
                glProgram_state.setUniformVec2( "resolution", this.parameters.resolution );
                glProgram_state.setUniformFloat( "time", this.parameters.time );    
                glProgram_state.setUniformVec2( "mouse_touch" , this.parameters.mouse_touch );
            }else{
                this._program.setUniformLocationWith2f( this.uniformLocation["resolution"], this.parameters.resolution[0], this.parameters.resolution[1] );
                this._program.setUniformLocationWith1f( this.uniformLocation["time"], this.parameters.time );
                this._program.setUniformLocationWith2f( this.uniformLocation["mouse_touch"], this.parameters.mouse_touch[0], this.parameters.mouse_touch[1] );
            }
        }
	}
});

cc._RFpop();
