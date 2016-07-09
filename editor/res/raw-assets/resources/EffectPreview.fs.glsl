varying vec2 v_texCoord;
uniform sampler2D texture3;

void main () {
	vec4 color = texture2D (texture3, v_texCoord);
	gl_FragColor = color;
}
