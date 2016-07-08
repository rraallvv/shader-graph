varying vec2 v_texCoord;

void main(void)
{
	float value2;
	float u3;
	float v3;
	float out6;
	float value4;
	float out7;
	float y8;
	float y9;
	float value5;
	float value11;
	vec4 out10;
	{ // node 2, value
		value2 = 70.0;
	}
	{ // node 3, uv
		u3 = v_texCoord.x;
		v3 = v_texCoord.y;
	}
	{ // node 6, multiply
		out6 = value2*u3;
	}
	{ // node 4, value
		value4 = 35.0;
	}
	{ // node 7, multiply
		out7 = v3*value4;
	}
	{ // node 8, cos
		y8 = cos(out6);
	}
	{ // node 9, sin
		y9 = sin(out7);
	}
	{ // node 5, value
		value5 = 0.5;
	}
	{ // node 11, value
		value11 = 2.0;
	}
	{ // node 10, append
		out10 = vec4(y8,y9,value5,value11);
	}
	{
		gl_FragColor = out10;
	}
}
