var Config = require('./config');
var Wave = require('./wave');

var WaveGroup = function(scene) {
  this.scene = scene;
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
  guiWaves(this.scene, this);
  this.scene.add(this.waveHolder);
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
  this.scene.remove(this.waveHolder.children);
  this.waveHolder.children = [];
};

function guiWaves(scene, waveGroup) {
  var folder = Config.gui.addFolder('Waves');

  folder.add(waveGroup, 'waveCount').min(1).max(3).step(1).onChange(function() {
    waveGroup.isChanging = true;
  }).onFinishChange(function() {
    waveGroup.isChanging = true;

    waveGroup.destroy();

    for (var i = 0; i < waveGroup.waveCount; i++) {
      waveGroup.waves.push(new Wave(i));
      waveGroup.waveHolder.add(waveGroup.waves[i].mesh);
      scene.add(waveGroup.waveHolder)
    }

    waveGroup.isChanging = false;
  });

  //folder.add(window, 'wireframe').onChange(function(useWireframe) {
  //  if (useWireframe) {
  //    for (i = 0; i < waveGroup.waveCount; i++) {
  //      waveGroup.waves[i].material.wireframe = true;
  //    }
  //  } else {
  //    for (i = 0; i < waveGroup.waveCount; i++) {
  //      waveGroup.waves[i].material.wireframe = false;
  //    }
  //  }
  //});
}

module.exports = WaveGroup;
