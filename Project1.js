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
// modulo function
function mod(num, mod) {
	return ((num % mod) + mod) % mod;
}
function checkdist(x1, y1, x2, y2, dist) {
	console.log(((x1-x2)**2+(y1-y2)**2)-dist**2);
	return (((x1-x2)**2+(y1-y2)**2)<=dist**2);
}
function getangle(x1, y1, x2, y2) {
	return (Math.atan2(x1-x2,y1-y2));
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

//moving object variables
var mx = 0; // x direction of motion
var my = 0; // y direction of motion
var ms = 0; // whether to try and shoot
var vx = 0;
var vy = 0;
var va = 0;
var xpos=0; // x postion
var ypos=0; // y postion
var rot = false; // is it rotating?
var ang = 0; // object angle
var spd = 1; // move/rotation speed

const sndMusic = new Audio('Music.wav');
sndMusic.loop = true;
sndMusic.volume = 0.5;
const sndCool = new Audio('poweroff.wav');
const sndBreak = new Audio('bam.wav');
const sndOnline = new Audio('Online.wav');
const sndShoot = new Audio('Pew.wav');
const sndGet = new Audio('Get.wav');

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
in mat4 matrix;
//in vec2 inTexCoord;
out vec4 inColor;
out vec2 outTexCoord;

void main() {
	gl_Position = matrix * position;
//	outTexCoord = inTexCoord;
}
`;

//fragment shader source
const fSource = `#version 300 es
precision highp float;
//in vec2 outTexCoord;
uniform sampler2D u_image;
uniform vec4 color;
out vec4 outColor;
 
void main() {
	outColor = color;// * texture(u_image, outTexCoord);
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

objs=[[],[],[],[],[],[],[],[],[]]; //call length to get the number of objects to draw for an instance

class PhyObj {
	constructor(x, y, a, vx, vy, va, type, col) {
		this.x=x;
		this.y=y;
		this.a=a;
		this.vx=vx;
		this.vy=vy;
		this.va=va;
		this.type=type;//types: Ship=0, bullet=1, blast=2, tri=3, quad=4, pent=5, hex=6, sept=7, oct=8
		this.col=col;
		this.time=0;
		objs[type].push(this);
	}
	step() {
		this.time *= 0.001; // seconds

		this.x+=this.vx*0.003125;
		this.y+=this.vy*0.003125;
		this.a-=this.va*0.05;

	}
	delete() {
		objs[this.type].splice(objs[this.type].indexOf(this), 1);
	}
}
class Ship extends PhyObj {
	constructor(x, y) {
		super(x, y, 0, 0, 0, 0, 0, [0.0, 1.0, 1.0, 1.0]);
		this.s=0.1;
		this.cool=0;
	}
	step() {
		var coolrat=this.cool/4;
		if (this.cool>0) {
			this.cool-=0.0167;
			this.col=[coolrat, 1-coolrat, 1-coolrat, 1-0.5*coolrat];
		}
		else this.col = [0, 1, 1, 1];
		if (this.cool<0) {sndOnline.play(); this.cool=0;}


		super.step()

		if (my>=0) {
			this.vx+=my*Math.sin(-this.a)*0.1;
			this.vy+=my*Math.cos(-this.a)*0.1;
		}
		else {
			this.vx*=0.9;
			this.vy*=0.9;
		}
		this.a-=mx*0.05;

		this.x = mod(this.x+1,2)-1;
		this.y = mod(this.y-1,2)-1;

		if (this.cool<=0 && ms && objs[1].length<1) new Bullet(this.x, this.y, this.a, this.vx+Math.sin(-this.a)*10, this.vy+Math.cos(-this.a)*10, 0)
	}
}
class Bullet extends PhyObj {
	constructor(x, y, a, vx, vy, va) {
		sndShoot.currentTime = 0; 
		sndShoot.play();
		super(x, y, a, vx, vy, va, 1, [1.0, 0.0, 0.0, 1.0]);
		this.s=0.02;
	}
	step() {
		super.step()

		if (this.x <= -1 || this.x >= 1 || this.y <= -1 || this.y >= 1) super.delete();
	}
}
class Blast extends PhyObj {
	constructor(x, y, a, vx, vy, va, siz, col) {
		super(x, y, a, vx, vy, va, 2, col);
		this.siz=siz;
		this.s=siz;
		this.life=10;
	}
	step() {
		this.life--;
		super.step()

		this.s=this.siz*this.life/10;
		if (this.life<=0) super.delete();

		//just an animation
	}
}
class Asteroid extends PhyObj {
	constructor(x, y, a, vx, vy, va, type) {
		var colr = [
			[1.0, 0.0, 0.0, 1.0],//tri
			[1.0, 0.5, 0.0, 1.0],//quad
			[1.0, 1.0, 0.0, 1.0],//pent
			[0.5, 1.0, 0.0, 1.0],//hex
			[0.0, 1.0, 0.0, 1.0],//sept
			[0.0, 1.0, 0.5, 1.0],//oct
			];
		var scale = [
			0.05,//tri
			0.1,//quad
			0.2,//pent
			0.3,//hek
			0.4,//sept
			0.5 //oct
		];
		super(x, y, a, vx, vy, va, type, colr[type-3]);
		this.s = scale[type-3];
	}
	step() {
		super.step()

		this.x = mod(this.x+1,2)-1;
		this.y = mod(this.y-1,2)-1;

		const crumble = (ang) => {
			super.delete();
			if (this.type==8) sndMusic.play();
			if (this.type>3) {
				sndBreak.currentTime = 0; 
				sndBreak.play();
				new Blast(this.x, this.y, this.a, this.vx, this.vy, this.va+4, this.s, [1, 0, 0, 1]);
				new Blast(this.x, this.y, this.a, this.vx, this.vy, this.va-4, this.s, [1, 0, 1, 1]);
				ang+=45;
				new Asteroid(this.x, this.y, this.a, this.vx+Math.sin(ang)*(3-2*this.s), this.vy+Math.cos(ang)*(3-2*this.s), this.va+0.3, this.type-1);
				ang-=90;
				new Asteroid(this.x, this.y, this.a, this.vx+Math.sin(ang)*(3-2*this.s), this.vy+Math.cos(ang)*(3-2*this.s), this.va-0.3, this.type-1);
			}
    	};

		if (objs[0][0].cool<=0 && checkdist(this.x,this.y,objs[0][0].x,objs[0][0].y, this.s+0.05)) {
			crumble(getangle(this.x,this.y,objs[0][0].x,objs[0][0].y));
			if (this.type==3) {clock++; sndGet.currentTime = 0; sndGet.play();}
			else {
				objs[0][0].cool=this.type;
				sndCool.play();
			}
		}
		if (objs[1][0]) {
			if (checkdist(this.x,this.y,objs[1][0].x,objs[1][0].y, this.s)) {
				crumble(getangle(this.x,this.y,objs[1][0].x,objs[1][0].y));
				objs[1][0].delete();
			}
		}
	}
}
function makepoly(s) {
	arr = new Float32Array(s*2);
	var sign=1;
	var ang=0;
	var inc=360/s;
	for (var i = 0; i<s; i++) {
		sign=-sign;
		ang+=i*sign*inc;
		arr[i*2]  =Math.dsin(ang);
		arr[i*2+1]=Math.dcos(ang);
	}
	return arr;
}
const vstar = new Float32Array([
   -1,     0, 
   -0.4,   0.4, 
   -0.4,  -0.4, 
	0,     1,
	0,    -1,
	0.4,   0.4, 
	0.4,  -0.4, 
	1,     0
]);
const vship = new Float32Array([
   -1, -1, 
    0,  1, 
    0, -0.4, 
    1, -1
]);
const vp3 = makepoly(3);
const vp4 = makepoly(4);
const vp5 = makepoly(5);
const vp6 = makepoly(6);
const vp7 = makepoly(7);
const vp8 = makepoly(8);

//create 

//start here

//Setting all attribute locations
const posLoc = gl.getAttribLocation(program, 'position');
const colLoc = gl.getUniformLocation(program, 'color');
const matLoc = gl.getAttribLocation(program, 'matrix');
//const texLoc = gl.getAttribLocation(program, "inTexCoord");

const matDat = new Float32Array(32 * 16);//FIXME
const mb = gl.createBuffer();
//fromhere
const verts=[vship, vp5, vstar, vp3, vp4, vp5, vp6, vp7, vp8];
const vao = [];
const pb = [];
for (i of objs.keys()) {
// Create & bind vertex array object
vao.push(gl.createVertexArray());
gl.bindVertexArray(vao[i]);

// buffer for position data //////////////////////////////////////////////////
pb.push(gl.createBuffer());
gl.bindBuffer(gl.ARRAY_BUFFER, pb[i]);
//const numVertices = verts[i].length/2;
/*
var verts = new Float32Array([
   -0.25, -0.25, 
    0,     0.25, 
    0,     -0.1, 
    0.25, -0.25

]);
*/

gl.bufferData(gl.ARRAY_BUFFER, verts[i], gl.STATIC_DRAW);

// position attribute setup
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);


// buffer for matrix data //////////////////////////////////////////////////
gl.bindBuffer(gl.ARRAY_BUFFER, mb);
gl.bufferData(gl.ARRAY_BUFFER, matDat.byteLength, gl.DYNAMIC_DRAW);

const bytesPerMatrix = 4 * 16;
for (let i = 0; i < 4; ++i) {
	const loc = matLoc + i;
	gl.enableVertexAttribArray(loc);
	const offset = i * 16;  // 4 floats per row, 4 bytes per float
	gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, offset);
	gl.vertexAttribDivisor(loc, 1);
}

}


// buffer for color data //////////////////////////////////////////////////

/*
const cb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cb);
gl.bufferData(gl.ARRAY_BUFFER,
	new Float32Array([
		1, 0.5, 0, 0.1,// orange
		1, 1, 0, 0.1,  // yellow
		1, 0, 0, 0.1,  // red
		0, 1, 0, 0.1,  // green
		0, 0, 1, 0.1,  // blue
		1, 0, 1, 0.1,  // magenta
		0, 1, 1, 0.1,  // cyan
		1, 0.5, 0, 0.1,// orange
		1, 1, 0, 0.1,  // yellow
	]),
	gl.STATIC_DRAW);
gl.enableVertexAttribArray(colLoc);
gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(colLoc, 1);
*/

/*
// buffer for texture data (not used in this lab) /////////////////////////
const tb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, tb);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		0,   0.5,
		0.3, 0.7,
		0.3, 0.3,
		0.5, 1
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
*/
var player = new Ship(0, -0.5);
var asteroid = new Asteroid(0, 0.5, 0, 0, 0, 0, 8);
var clock = 60;
var win = 0;
var lose = 0;
//Rendering function
function render(time) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	time *= 0.001; // seconds
	if (objs[8].length) clock+=0.0167;
	if (!win&&!lose) score.value=Math.round(clock-time);
	else sndMusic.pause();
	if (!lose) rocks.value=objs[3].length+objs[4].length*2+objs[5].length*4+objs[6].length*8+objs[7].length*16+objs[8].length*32;
	if (rocks.value<=0) {rocks.value='You Win!'; win = 1};
	if (score.value<=0) {rocks.value='You Lose!'; lose = 1};
	
	/*
	vx+=my*Math.sin(-ang)*0.1;
	vy+=my*Math.cos(-ang)*0.1;
	ang -=mx*0.05;
	//va+=mx*0.1;
	xpos+=vx*0.003125;
	ypos+=vy*0.003125;
	xpos = mod(xpos+1,2)-1;
	ypos = mod(ypos-1,2)-1;
	*/
 
	// Convert clip space to pixels
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.useProgram(program);
	//gl.uniform4f(colLoc, ...[1.0, 0.0, 0.0, 0.2]);
	for(i of Object.keys(objs).reverse()) {
		gl.bindVertexArray(vao[i]);
		//if (objs[i].length==0) {continue; alert('none')}
		//gl.uniform4f(colLoc, ...(objs[i][0].col));
		for(ii of Object.keys(objs[i]).reverse()) {
			var obj=objs[i][ii];
			obj.step();
			gl.uniform4f(colLoc, ...obj.col);
			matDat.set(createMat(obj.x, obj.y, 0, obj.s, obj.s, obj.a), ii*16)
		};
		gl.bindBuffer(gl.ARRAY_BUFFER, mb);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, matDat);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, verts[i].length/2, objs[i].length);
	}
 
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
		case ' ': //space
		ms=1;
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
		case ' ': //space
		ms=0;
		break;
	}
});

//Mouse Controls
document.addEventListener('click', (event) => {
	const rect = canvas.getBoundingClientRect();
	const nx=(event.pageX-window.scrollX - rect.left)/320-1;
	const ny=((-event.pageY-window.scrollY+45) - rect.top)/320+1;
	if (Math.abs(nx)<1 && Math.abs(ny)<1 && objs[0][0].cool<=0) {
		objs[0][0].x = nx;
		objs[0][0].y = ny;
		objs[0][0].cool=1.2;
		sndCool.play();
		new Blast(nx, ny, 0, objs[0][0].vx, objs[0][0].vy, 4, 0.2, [1, 0, 1, 1]);
	}
});
