import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export class SceneManager {
  // Добавляем значение по умолчанию для settings
  constructor(container) {
    if (!container) return;
    
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe2e2e2);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(15, 15, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.initLights();
    
    // Сетка
    this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(this.grid);

    // Инициализация управления
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.animate();
    
    // Биндим контекст, чтобы не терять его при ресайзе
    this._onResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  onWindowResize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    this._animationFrame = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    cancelAnimationFrame(this._animationFrame);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.scene.clear();
  }
}