//Adam Hume - Lab #2
/*
This built heavily upon "https://webgl2fundamentals.org/webgl/lessons/webgl-instanced-drawing.html"
adding in a function for the creation of shaders and matrices as well as adding an array for draw types
The transformation matrix functions were all by me.

This uses no external libraries, though it is a bit late because I got a bit tripped up with all the formatting that was required.
*/

// Degree Sine/Cosine functions (not used in this project)
Math.dsin = function(degrees) {
    return Math.sin(degrees * Math.PI / 180);
};
Math.dcos = function(degrees) {
    return Math.cos(degrees * Math.PI / 180);
};
function mod(num, mod) {
	return ((num % mod) + mod) % mod;
}

//moving object variables
var mx = 0; // x direction of motion
var my = 0; // y direction of motion
var vx = 0;
var vy = 0;
var va = 0;
var xpos=0; // x postion
var ypos=0; // y postion
var rot = false; // is it rotating?
var ang = 0; // object angle
var spd = 1; // move/rotation speed

//webgl canvas element
const canvas = document.getElementById("Canvas");

//get canvas to draw to
const gl = canvas.getContext("webgl2");

//enable transparency (not utilized in this program)
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

//function to handle shader creation and errors
function createShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error("Shader compile error:", gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}
          
//get raw text for each shader from script
//const vSource = document.getElementById('vertex-shader').text.trim();
//const fSource = document.getElementById('fragment-shader').text.trim();

// Shaders inside script for testing. 
// Separate shader files will be used when there are more than 2 shaders.

//vertex shader source
const vSource = `#version 300 es
in vec4 position;
in vec4 color;
in mat4 matrix;
in vec2 inTexCoord;
out vec4 inColor;
out vec2 outTexCoord;

void main() {
	gl_Position = matrix * position;
	inColor = color;
	outTexCoord = inTexCoord;
}
`;

//fragment shader source
const fSource = `#version 300 es
precision highp float;
in vec2 outTexCoord;
uniform sampler2D u_image;
in vec4 inColor;
out vec4 outColor;
 
void main() {
	outColor = texture(u_image, outTexCoord) * inColor;
}
`;

//creating shaders from source
const vShader = createShader(gl, gl.VERTEX_SHADER, vSource);
const fShader = createShader(gl, gl.FRAGMENT_SHADER, fSource);

//building/linking shader program
const program = gl.createProgram();
gl.attachShader(program, vShader);
gl.attachShader(program, fShader);
gl.linkProgram(program);

//Setting all attribute locations
const posLoc = gl.getAttribLocation(program, 'position');
const colLoc = gl.getAttribLocation(program, 'color');
const matLoc = gl.getAttribLocation(program, 'matrix');
const texLoc = gl.getAttribLocation(program, "inTexCoord");

// Create & bind vertex array object
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// buffer for position data //////////////////////////////////////////////////
const pb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pb);
const numVertices = 4;
var verts = new Float32Array([
   -0.25, -0.25, 
    0,     0.25, 
    0,     -0.1, 
    0.25, -0.25

]);

gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

// position attribute setup
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

const numInstances = 1;

// buffer for matrix data //////////////////////////////////////////////////
const mb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, mb);
const matDat = new Float32Array(numInstances * 16);
gl.bufferData(gl.ARRAY_BUFFER, matDat.byteLength, gl.DYNAMIC_DRAW);

const bytesPerMatrix = 4 * 16;
for (let i = 0; i < 4; ++i) {
	const loc = matLoc + i;
	gl.enableVertexAttribArray(loc);
	const offset = i * 16;  // 4 floats per row, 4 bytes per float
	gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, offset);
	gl.vertexAttribDivisor(loc, 1);
}

// function for creating matrices from scratch (for translation, scaling, & rotation)
function createMat(x, y, z, sx, sy, angle) {
const c = Math.cos(angle);
const s = Math.sin(angle);
const tMat = new Float32Array([
	c * sx,	s * sx,	0,		0,
   -s * sy,	c * sy,	0,		0,
    0,		0,		1,		0,
    x,		y,		z,		1
]);
return tMat;
}

// buffer for color data //////////////////////////////////////////////////
const cb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cb);
gl.bufferData(gl.ARRAY_BUFFER,
	new Float32Array([
		1, 0.5, 0, 1,// orange
		1, 1, 0, 1,  // yellow
		1, 0, 0, 1,  // red
		0, 1, 0, 1,  // green
		0, 0, 1, 1,  // blue
		1, 0, 1, 1,  // magenta
		0, 1, 1, 1,  // cyan
	]),
	gl.STATIC_DRAW);
gl.enableVertexAttribArray(colLoc);
gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(colLoc, 1);

// buffer for texture data (not used in this lab) /////////////////////////
const tb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, tb);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		0,   0.5,
		0.3, 0.7,
		0.3, 0.3,
		0.5, 1,
		0.5, 0,
		0.7, 0.7,
		0.7, 0.3,
		1,   0
	]), gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(texLoc);
gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

gl.texImage2D(
	gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
	gl.RGBA, gl.UNSIGNED_BYTE,
	new Uint8Array([255, 255, 255, 255])
);

const image = new Image();
//image.crossOrigin = "anonymous"; 
image.src = "atlas.png"; // Replace with your local path/PNG file
image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // WebGL2 can automatically generate mipmaps for any image dimensions
    gl.generateMipmap(gl.TEXTURE_2D);
    
    // Trigger render after image loads
    render();
};

//Rendering function
function render(time) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	time *= 0.001; // seconds
	score.value=Math.round(time);
	
	vx+=my*Math.sin(-ang)*0.1;
	vy+=my*Math.cos(-ang)*0.1;
	//va+=mx*0.1;
	xpos+=vx*0.005;
	ypos+=vy*0.005;
	ang -=mx*0.05;
	xpos = mod(xpos+1,2)-1;
	ypos = mod(ypos-1,2)-1;
 
	// Convert clip space to pixels
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.useProgram(program);

	gl.bindVertexArray(vao);

	for(i = 0; i<numInstances; i++) {
		matDat.set(createMat(xpos, ypos, 0, 0.5, 0.5, ang*(i+1)), i*16)
	};
	gl.bindBuffer(gl.ARRAY_BUFFER, mb);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, matDat);

	gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, numVertices, numInstances);
 
	requestAnimationFrame(render);
}
requestAnimationFrame(render);


//WASD Controls
document.addEventListener('keydown', (event) => {
	console.log(`Key pressed: ${event.key} | Code: ${event.code}`);
	switch(event.key) {
		case 'w': //up
		if (my!=1) my+=1;
		break;
		case 'a': //left
		if (mx!=-1) mx-=1;
		break;
		case 's': //down
		if (my!=-1) my-=1;
		break;
		case 'd': //right
		if (mx!=1) mx+=1;
		break;
	}
});
document.addEventListener('keyup', (event) => {
	console.log(`Key released: ${event.key} | Code: ${event.code}`);
	switch(event.key) {
		case 'w': //up
		if (my!=-1) my-=1;
		break;
		case 'a': //left
		if (mx!=1) mx+=1;
		break;
		case 's': //down
		if (my!=1) my+=1;
		break;
		case 'd': //right
		if (mx!=-1) mx-=1;
		break;
	}
});

//Mouse Controls
document.addEventListener('click', (event) => {
	const rect = canvas.getBoundingClientRect();
	const nx=(event.pageX-window.scrollX - rect.left)/320-1;
	const ny=((-event.pageY-window.scrollY+15) - rect.top)/320+1;
	if (Math.abs(nx)<1 && Math.abs(ny)<1) {
		xpos = nx;
		ypos = ny;
	}
});
