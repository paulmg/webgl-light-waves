import Config from './modules/config';
import WaveGroup from './modules/waveGroup';

let container, stats, rendererStats;

let camera, controls, scene, sceneBG, meshBG, renderer, composer;

let waveGroup;

let clock;
let speedInterval;

let dpr, renderModel, effectFXAA, effectBloom, effectCopy;

const width  = window.innerWidth,
    height = window.innerHeight;

// check for webgl
if(document.documentElement.classList.contains('no-webgl')) {
  document.getElementById('container').innerHTML = "";
} else {
  clock = new THREE.Clock();

  init();
  animate();
}

function init() {
  container = document.getElementById('container');

  // datGUI
  Config.gui = new dat.GUI();

  // set up scenes
  scene = new THREE.Scene();
  sceneBG = new THREE.Scene();

  // main camera
  camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
  camera.position.z = 50;
  camera.lookAt(scene.position);
  scene.add(camera);

  // background
  let map = THREE.ImageUtils.loadTexture('http://i.imgur.com/yU1t4dp.jpg');
  let geometry = new THREE.PlaneGeometry(512, 256, 10, 10);
  let material = new THREE.MeshBasicMaterial({
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

  guiScene(scene, camera);

  // set speed up loop
  speedUpLoop();

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
  } catch(e) {
    console.log(e);
  }

  // initialize wavegroup
  waveGroup = new WaveGroup(scene);
  waveGroup.init();

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  container.appendChild(stats.domElement);

  //threex.renderstats
  rendererStats = new THREEx.RendererStats();
  rendererStats.domElement.style.position = 'absolute';
  rendererStats.domElement.style.left = '0px';
  rendererStats.domElement.style.bottom = '0px';
  document.body.appendChild(rendererStats.domElement);

  renderer.autoClear = false;

  // post process
  if(Config.postProcess) {
    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderModel = new THREE.RenderPass(scene, camera);

    effectBloom = new THREE.BloomPass(Config.bloomStrength, Config.bloomKernel, Config.bloomSigma);
    effectCopy = new THREE.ShaderPass(THREE.CopyShader);

    // pixel ratio
    dpr = 1;
    if(window.devicePixelRatio !== undefined) {
      dpr = window.devicePixelRatio;
    }

    effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));

    effectCopy.renderToScreen = true;

    let rtParameters = {
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

    guiPostProcess();
  }

  // orbit controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // window resize
  window.addEventListener('resize', onWindowResize, false);
}

function speedUpLoop() {
  let nextTime = Math.max(14000 * Math.random(), 8000);
  Config.isSpeedingUp = true;

  setTimeout(speedUpLoop, nextTime);
}

function onWindowResize() {
  // threex window resize
  let rendererSize = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  // notify the renderer of the size change
  renderer.setSize(rendererSize.width, rendererSize.height);
  // update the camera
  camera.aspect = rendererSize.width / rendererSize.height;
  camera.updateProjectionMatrix();

  // set post process to drp resolution
  if(postProcess) {
    effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));
    composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
  }
}

function animate() {
  requestAnimationFrame(animate);

  render();

  stats.update();
  rendererStats.update(renderer);
}

function render() {
  let time  = clock.getElapsedTime(),
      delta = clock.getDelta();

  if(Config.isSpeedingUp) {
    if(!Config.isTweening) {
      Config.isTweening = true;

      let newSpeed = Config.newTime.futureTime + Config.speed;
      Config.newTime.currentTime = time;
      TweenMax.to(Config.newTime, Config.speedTime, {
        futureTime: newSpeed,

        onUpdate: function() {
          waveGroup.update(Config.newTime.futureTime);
        },

        onComplete: function() {
          waveGroup.update(Config.newTime.futureTime);

          Config.newTime.currentTime = Config.newTime.futureTime - time - Config.speedTime;
          Config.isSpeedingUp = Config.isTweening = false;
        },
        ease: Circ.easeInOut
      });
    }
  } else {
    waveGroup.update(Config.newTime.currentTime + time);
    Config.newTime.futureTime = Config.newTime.currentTime + time;
  }

  // bg color loop
  let h = time * 8 % 360 / 360;
  meshBG.material.color.setHSL(h, 1, 0.5);

  // post process check
  if(Config.postProcess) {
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

function guiPostProcess() {
  let folder = Config.gui.addFolder('Post Process');

  folder.add(Config, 'postProcess');
  folder.add(Config, 'bloomStrength').min(0).max(3).onFinishChange(function() {
    composer.passes = [];
    effectBloom = new THREE.BloomPass(Config.bloomStrength, Config.bloomKernel, Config.bloomSigma);
    composer.addPass(renderModel);
    composer.addPass(effectFXAA);
    composer.addPass(effectBloom);
    composer.addPass(effectCopy);
  });
  folder.add(Config, 'bloomKernel').min(0).max(50).onFinishChange(function() {
    composer.passes = [];
    effectBloom = new THREE.BloomPass(Config.bloomStrength, Config.bloomKernel, Config.bloomSigma);
    composer.addPass(renderModel);
    composer.addPass(effectFXAA);
    composer.addPass(effectBloom);
    composer.addPass(effectCopy);
  });
  folder.add(Config, 'bloomSigma').min(0).max(48).step(8).onFinishChange(function() {
    composer.passes = [];
    effectBloom = new THREE.BloomPass(Config.bloomStrength, Config.bloomKernel, Config.bloomSigma);
    composer.addPass(renderModel);
    composer.addPass(effectFXAA);
    composer.addPass(effectBloom);
    composer.addPass(effectCopy);
  });
}

function guiScene(scene) {
  let folder = Config.gui.addFolder('Scene');

  let data = {
    background: "#000000"
  };

  let color = new THREE.Color();
  let colorConvert = handleColorChange(color);

  folder.addColor(data, "background").onChange(function(value) {
    colorConvert(value);
    renderer.setClearColor(color.getHex());
  });

  guiSceneFog(folder, scene);
}

function guiSceneFog(folder, scene) {
  let fogFolder = folder.addFolder('scene.fog');
  let fog = new THREE.Fog(0x3f7b9d, 0, 60);

  let data = {
    fog: {
      "THREE.Fog()": false,
      "scene.fog.color": fog.color.getHex()
    }
  };

  fogFolder.add(data.fog, 'THREE.Fog()').onChange(function(useFog) {
    if(useFog) {
      scene.fog = fog;
    } else {
      scene.fog = null;
    }
  });

  fogFolder.addColor(data.fog, 'scene.fog.color').onChange(handleColorChange(fog.color));
}

function handleColorChange(color) {
  return function(value) {
    if(typeof value === "string") {
      value = value.replace('#', '0x');
    }

    color.setHex(value);
  };
}

function needsUpdate(material, geometry) {
  return function() {
    material.shading = +material.shading; //Ensure number
    material.vertexColors = +material.vertexColors; //Ensure number
    material.side = +material.side; //Ensure number
    material.needsUpdate = true;
    geometry.verticesNeedUpdate = true;
    geometry.normalsNeedUpdate = true;
    geometry.colorsNeedUpdate = true;
  };
}

function updateTexture(material, materialKey, textures) {
  return function(key) {
    material[materialKey] = textures[key];
    material.needsUpdate = true;
  };
}
