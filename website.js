/*
 * A speed-improved perlin and simplex noise algorithms for 2D.
 *
 * Based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 * Converted to Javascript by Joseph Gentle.
 *
 * Version 2012-03-09
 *
 * This code was placed in the public domain by its original author,
 * Stefan Gustavson. You may use it as you see fit, but
 * attribution is appreciated.
 *
 */

(function(global) {
  var module = global.noise = {};

  function Grad(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  Grad.prototype.dot2 = function(x, y) {
    return this.x * x + this.y * y;
  };

  Grad.prototype.dot3 = function(x, y, z) {
    return this.x * x + this.y * y + this.z * z;
  };

  var grad3 = [new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
    new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
    new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)
  ];

  var p = [151, 160, 137, 91, 90, 15,
    131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
  ];
  // To remove the need for index wrapping, double the permutation table length
  var perm = new Array(512);
  var gradP = new Array(512);

  // This isn't a very good seeding function, but it works ok. It supports 2^16
  // different seed values. Write something better if you need more seeds.
  module.seed = function(seed) {
    if (seed > 0 && seed < 1) {
      // Scale the seed out
      seed *= 65536;
    }

    seed = Math.floor(seed);
    if (seed < 256) {
      seed |= seed << 8;
    }

    for (var i = 0; i < 256; i++) {
      var v;
      if (i & 1) {
        v = p[i] ^ (seed & 255);
      } else {
        v = p[i] ^ ((seed >> 8) & 255);
      }

      perm[i] = perm[i + 256] = v;
      gradP[i] = gradP[i + 256] = grad3[v % 12];
    }
  };

  module.seed(0);

  /*
   for(var i=0; i<256; i++) {
   perm[i] = perm[i + 256] = p[i];
   gradP[i] = gradP[i + 256] = grad3[perm[i] % 12];
   }*/

  // Skewing and unskewing factors for 2, 3, and 4 dimensions
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;

  var F3 = 1 / 3;
  var G3 = 1 / 6;

  // 2D simplex noise
  module.simplex2 = function(xin, yin) {
    var n0, n1, n2; // Noise contributions from the three corners
    // Skew the input space to determine which simplex cell we're in
    var s = (xin + yin) * F2; // Hairy factor for 2D
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var t = (i + j) * G2;
    var x0 = xin - i + t; // The x,y distances from the cell origin, unskewed.
    var y0 = yin - j + t;
    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
    if (x0 > y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
      i1 = 1;
      j1 = 0;
    } else { // upper triangle, YX order: (0,0)->(0,1)->(1,1)
      i1 = 0;
      j1 = 1;
    }
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
    var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
    var y2 = y0 - 1 + 2 * G2;
    // Work out the hashed gradient indices of the three simplex corners
    i &= 255;
    j &= 255;
    var gi0 = gradP[i + perm[j]];
    var gi1 = gradP[i + i1 + perm[j + j1]];
    var gi2 = gradP[i + 1 + perm[j + 1]];
    // Calculate the contribution from the three corners
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot2(x0, y0); // (x,y) of grad3 used for 2D gradient
    }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot2(x1, y1);
    }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot2(x2, y2);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70 * (n0 + n1 + n2);
  };

  // 3D simplex noise
  module.simplex3 = function(xin, yin, zin) {
    var n0, n1, n2, n3; // Noise contributions from the four corners

    // Skew the input space to determine which simplex cell we're in
    var s = (xin + yin + zin) * F3; // Hairy factor for 2D
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var k = Math.floor(zin + s);

    var t = (i + j + k) * G3;
    var x0 = xin - i + t; // The x,y distances from the cell origin, unskewed.
    var y0 = yin - j + t;
    var z0 = zin - k + t;

    // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
    // Determine which simplex we are in.
    var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
    var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }
    // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
    // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
    // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
    // c = 1/6.
    var x1 = x0 - i1 + G3; // Offsets for second corner
    var y1 = y0 - j1 + G3;
    var z1 = z0 - k1 + G3;

    var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
    var y2 = y0 - j2 + 2 * G3;
    var z2 = z0 - k2 + 2 * G3;

    var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
    var y3 = y0 - 1 + 3 * G3;
    var z3 = z0 - 1 + 3 * G3;

    // Work out the hashed gradient indices of the four simplex corners
    i &= 255;
    j &= 255;
    k &= 255;
    var gi0 = gradP[i + perm[j + perm[k]]];
    var gi1 = gradP[i + i1 + perm[j + j1 + perm[k + k1]]];
    var gi2 = gradP[i + i2 + perm[j + j2 + perm[k + k2]]];
    var gi3 = gradP[i + 1 + perm[j + 1 + perm[k + 1]]];

    // Calculate the contribution from the four corners
    var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot3(x0, y0, z0); // (x,y) of grad3 used for 2D gradient
    }
    var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
    }
    var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
    }
    var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) {
      n3 = 0;
    } else {
      t3 *= t3;
      n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 32 * (n0 + n1 + n2 + n3);

  };

  // ##### Perlin noise stuff

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a, b, t) {
    return (1 - t) * a + t * b;
  }

  // 2D Perlin Noise
  module.perlin2 = function(x, y) {
    // Find unit grid cell containing point
    var X = Math.floor(x),
        Y = Math.floor(y);
    // Get relative xy coordinates of point within that cell
    x = x - X;
    y = y - Y;
    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255;
    Y = Y & 255;

    // Calculate noise contributions from each of the four corners
    var n00 = gradP[X + perm[Y]].dot2(x, y);
    var n01 = gradP[X + perm[Y + 1]].dot2(x, y - 1);
    var n10 = gradP[X + 1 + perm[Y]].dot2(x - 1, y);
    var n11 = gradP[X + 1 + perm[Y + 1]].dot2(x - 1, y - 1);

    // Compute the fade curve value for x
    var u = fade(x);

    // Interpolate the four results
    return lerp(
      lerp(n00, n10, u),
      lerp(n01, n11, u),
      fade(y));
  };

  // 3D Perlin Noise
  module.perlin3 = function(x, y, z) {
    // Find unit grid cell containing point
    var X = Math.floor(x),
        Y = Math.floor(y),
        Z = Math.floor(z);
    // Get relative xyz coordinates of point within that cell
    x = x - X;
    y = y - Y;
    z = z - Z;
    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255;
    Y = Y & 255;
    Z = Z & 255;

    // Calculate noise contributions from each of the eight corners
    var n000 = gradP[X + perm[Y + perm[Z]]].dot3(x, y, z);
    var n001 = gradP[X + perm[Y + perm[Z + 1]]].dot3(x, y, z - 1);
    var n010 = gradP[X + perm[Y + 1 + perm[Z]]].dot3(x, y - 1, z);
    var n011 = gradP[X + perm[Y + 1 + perm[Z + 1]]].dot3(x, y - 1, z - 1);
    var n100 = gradP[X + 1 + perm[Y + perm[Z]]].dot3(x - 1, y, z);
    var n101 = gradP[X + 1 + perm[Y + perm[Z + 1]]].dot3(x - 1, y, z - 1);
    var n110 = gradP[X + 1 + perm[Y + 1 + perm[Z]]].dot3(x - 1, y - 1, z);
    var n111 = gradP[X + 1 + perm[Y + 1 + perm[Z + 1]]].dot3(x - 1, y - 1, z - 1);

    // Compute the fade curve value for x, y, z
    var u = fade(x);
    var v = fade(y);
    var w = fade(z);

    // Interpolate
    return lerp(
      lerp(
        lerp(n000, n100, u),
        lerp(n001, n101, u), w),
      lerp(
        lerp(n010, n110, u),
        lerp(n011, n111, u), w),
      v);
  };

})(this);

var container;

var camera, scene, sceneBG, meshBG, renderer, composer;

var texture;
var waveGroup;

var clock;
var newTime = {
  currentTime: 0,
  futureTime: 0
};
var isSpeedingUp = isTweening = false;
var speed = 20,
    speedTime = 2;

var dpr, renderModel, effectFXAA, effectBloom, effectCopy;

var width = window.innerWidth,
    height = window.innerHeight;

var planeWidth = 220,
    planeHeight = 20,
    planeWSegs = 100,
    planeHSegs = 20;

var postProcess = true;
var bloomStrength = 0.65,
    bloomKernel = 30,
    bloomSigma = 16;
var wireframe = false;

var WaveGroup = function() {
  this.waveCount = 2;
  this.waves = [];
  // scale, frequency, magnitude vals for each wave
  this.waveVals = [
    {'scale': 40, 'frequency': 0.06, 'magnitude': 10},
    {'scale': 30, 'frequency': 0.09, 'magnitude': 12},
    {'scale': 35, 'frequency': 0.05, 'magnitude': 8}
  ];
  this.waveHolder = new THREE.Object3D();
  this.isChanging = false;
};

WaveGroup.prototype.init = function() {
  for (var i = 0; i < this.waveCount; i++) {
    this.waves.push(new Wave(i, this));
    this.waveHolder.add(this.waves[i].mesh);
  }
  scene.add(this.waveHolder);
};

WaveGroup.prototype.update = function(time) {
  if (!this.isChanging) {
    for (var i = 0; i < this.waveCount; i++) {
      this.waves[i].update(this.waveVals[i], time);
    }
  }
};

WaveGroup.prototype.destroy = function() {
  this.waves = [];
  scene.remove(this.waveHolder.children);
  this.waveHolder.children = [];
};

var Wave = function(count) {
  this.count = count;

  this.material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    wireframe: wireframe,
    depthWrite: false,
    depthTest: false,
    map: texture
  });

  this.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, planeWSegs, planeHSegs);
  this.geometry.dynamic = true;

  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.rotation.x = -0.5 * Math.PI;
  this.mesh.position.set(0, 0, -(count * planeHeight) / 2);

  /*for (var i = 0, l = this.mesh.geometry.vertices.length; i < l; i++) {
   var vertex = this.mesh.geometry.vertices[i];
   vertex.y = 1 * Math.pow(2, 0.2 * vertex.y);
   }*/
};

Wave.prototype.update = function(waveVals, time) {
  this.waveVals = waveVals;

  var nValues = [];

  var scale = this.waveVals.scale,
      frequency = this.waveVals.frequency,
      magnitude = this.waveVals.magnitude;

  // loop through and get random perlin noise values
  for (var x = 0; x <= planeHSegs; x++) {
    for (var y = 0; y <= planeWSegs; y++) {
      nValues.push(noise.simplex2(-x / scale + time * frequency, -y / scale + time * frequency) * magnitude);
    }
  }

  // loop through all individual vertices and set z to noise value
  for (var i = 0, l = this.mesh.geometry.vertices.length; i < l; i++) {
    var vertex = this.mesh.geometry.vertices[i];
    vertex.z = nValues[i];
    //vertex.y = 1 * Math.pow(2, 0.7 * vertex.y);
  }

  // set update flag
  this.mesh.geometry.verticesNeedUpdate = true;

  // color loop
  var h = ((time * 8 % 360 / 360) + (this.count * 0.25)) % 1;
  this.mesh.material.color.setHSL(h, 1, 0.5);
};

// check for webgl
if (document.documentElement.classList.contains('no-webgl')) {
  document.getElementById('container').innerHTML = "";
} else {
  clock = new THREE.Clock();

  init();
  animate();
}

function init() {
  container = document.getElementById('container');

  // set up scenes
  scene = new THREE.Scene();
  sceneBG = new THREE.Scene();

  // main camera
  camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
  camera.position.z = 50;
  camera.lookAt(scene.position);
  scene.add(camera);

  // generate texture for waves
  THREE.ImageUtils.crossOrigin = '';
  texture = THREE.ImageUtils.loadTexture('http://i.imgur.com/pZJ70Zq.png');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  // background
  var map = THREE.ImageUtils.loadTexture('http://i.imgur.com/yU1t4dp.jpg');
  var geometry = new THREE.PlaneGeometry(512, 256, 10, 10);
  var material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.20,
    side: THREE.FrontSide,
    map: map,
    wireframe: false,
    blending: THREE.AdditiveBlending
  });
  meshBG = new THREE.Mesh(geometry, material);
  meshBG.position.set(0, -20, -120);
  sceneBG.add(meshBG);

  // generate new random seed
  noise.seed(Math.random() * 1000);

  // set speed up interval
  setInterval(function() {
    isSpeedingUp = true;
  }, Math.max(14000 * Math.random(), 8000));

  try {
    // WebGL Renderer
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      sortObjects: true
    });
    renderer.setClearColor(0x000000, 1);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    // set to container
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
  } catch (e) {
    console.log(e);
  }

  // initialize wavegroup
  waveGroup = new WaveGroup();
  waveGroup.init();

  renderer.autoClear = false;

  // postprocess
  if (postProcess) {
    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    //var renderBackground = new THREE.RenderPass(sceneBG, camera);
    renderModel = new THREE.RenderPass(scene, camera);
    //renderModel.clear = false;

    effectBloom = new THREE.BloomPass(bloomStrength, bloomKernel, bloomSigma);
    effectCopy = new THREE.ShaderPass(THREE.CopyShader);

    // pixel ratio
    dpr = 1;
    if (window.devicePixelRatio !== undefined) {
      dpr = window.devicePixelRatio;
    }

    effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));

    effectCopy.renderToScreen = true;

    var rtParameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
      stencilBuffer: true
    };
    composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(width, height, rtParameters));
    composer.setSize(width * dpr, height * dpr);

    composer.addPass(renderModel);
    composer.addPass(effectFXAA);
    composer.addPass(effectBloom);
    composer.addPass(effectCopy);
  }

  // orbit controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // window resize
  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  // threex window resize
  var rendererSize = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  // notify the renderer of the size change
  renderer.setSize(rendererSize.width, rendererSize.height);
  // update the camera
  camera.aspect = rendererSize.width / rendererSize.height;
  camera.updateProjectionMatrix();

  // set post process to drp resolution
  if (postProcess) {
    effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));
    composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
  }
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  var time = clock.getElapsedTime(),
      delta = clock.getDelta();

  if (isSpeedingUp) {
    if (!isTweening) {
      isTweening = true;

      var newSpeed = newTime.futureTime + speed;
      newTime.currentTime = time;
      TweenMax.to(newTime, speedTime, {
        futureTime: newSpeed,

        onUpdate: function() {
          waveGroup.update(newTime.futureTime);
        },

        onComplete: function() {
          waveGroup.update(newTime.futureTime);

          newTime.currentTime = newTime.futureTime - time - speedTime;
          isSpeedingUp = isTweening = false;
        },
        ease: Circ.easeInOut
      });
    }
  } else {
    waveGroup.update(newTime.currentTime + time);
    newTime.futureTime = newTime.currentTime + time;
  }

  // bg color loop
  var h = time * 8 % 360 / 360;
  meshBG.material.color.setHSL(h, 1, 0.5);

  // postprocess check
  if (postProcess) {
    renderer.clear();
    composer.render(delta);
    renderer.clearDepth();
    renderer.render(sceneBG, camera);
  } else {
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(sceneBG, camera);
  }
}
