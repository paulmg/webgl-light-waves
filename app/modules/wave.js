var Config = require('./config');
var Noise = require('./noise');

var noise = Noise();

// generate new random seed
noise.seed(Math.random() * 1000);

// generate texture for waves
THREE.ImageUtils.crossOrigin = '';
texture = THREE.ImageUtils.loadTexture('http://i.imgur.com/pZJ70Zq.png');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

var Wave = function(count) {
  this.count = count;

  this.material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    wireframe: false,
    depthWrite: false,
    depthTest: false,
    map: texture
  });

  this.geometry = new THREE.PlaneGeometry(Config.planeWidth, Config.planeHeight, Config.planeWSegs, Config.planeHSegs);
  this.geometry.dynamic = true;

  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.mesh.rotation.x = -0.5 * Math.PI;
  this.mesh.position.set(0, 0, -(count * Config.planeHeight) / 2);
};

Wave.prototype.update = function(waveVals, time) {
  this.waveVals = waveVals;

  var nValues = [];

  var scale = this.waveVals.scale,
      frequency = this.waveVals.frequency,
      magnitude = this.waveVals.magnitude;

  // loop through and get random perlin noise values
  for (var x = 0; x <= Config.planeHSegs; x++) {
    for (var y = 0; y <= Config.planeWSegs; y++) {
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

module.exports = Wave;
