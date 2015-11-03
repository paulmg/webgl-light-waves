import Config from './config';
import Wave from './wave';

class WaveGroup {
  constructor(scene) {
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
  }

  init() {
    for (let i = 0; i < this.waveCount; i++) {
      this.waves.push(new Wave(i, this));
      this.waveHolder.add(this.waves[i].mesh);
    }
    guiWaves(this.scene, this);
    this.scene.add(this.waveHolder);
  };

  update(time) {
    if(!this.isChanging) {
      for(let i = 0; i < this.waveCount; i++) {
        this.waves[i].update(this.waveVals[i], time);
      }
    }
  }

  destroy() {
    this.waves = [];
    this.scene.remove(this.waveHolder.children);
    this.waveHolder.children = [];
  };
}

function guiWaves(scene, waveGroup) {
  let folder = Config.gui.addFolder('Waves');

  folder.add(waveGroup, 'waveCount').min(1).max(3).step(1).onChange(function() {
    waveGroup.isChanging = true;
  }).onFinishChange(function() {
    waveGroup.isChanging = true;

    waveGroup.destroy();

    for (let i = 0; i < waveGroup.waveCount; i++) {
      waveGroup.waves.push(new Wave(i));
      waveGroup.waveHolder.add(waveGroup.waves[i].mesh);
      scene.add(waveGroup.waveHolder)
    }

    waveGroup.isChanging = false;
  });

  folder.add(Config, 'wireframe').onChange(function(useWireframe) {
    if (useWireframe) {
      for (let i = 0; i < waveGroup.waveCount; i++) {
        waveGroup.waves[i].material.wireframe = true;
      }
    } else {
      for (let i = 0; i < waveGroup.waveCount; i++) {
        waveGroup.waves[i].material.wireframe = false;
      }
    }
  });
}

export default WaveGroup;
