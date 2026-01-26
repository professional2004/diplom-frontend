import * as THREE from 'three';
import { BoxUnfoldStrategy } from './strategies/BoxUnfoldStrategy';

export class UnfoldManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.OrthographicCamera(-15 * aspect, 15 * aspect, 15, -15, 0.1, 1000);
    this.camera.position.set(0, 0, 50);

    // Реестр стратегий по типу геометрии
    this.strategies = {
      'BoxGeometry': new BoxUnfoldStrategy(),
      // 'CylinderGeometry': new CylinderUnfoldStrategy(), // Для будущего
    };

    this.unfoldMap = new Map(); // 3D Mesh -> 2D Group
  }

  sync(mainScene) {
    // 1. Очистка удаленных объектов [cite: 187, 287]
    for (const [sourceMesh, unfoldGroup] of this.unfoldMap.entries()) {
      if (!this.isObjectInScene(mainScene, sourceMesh)) {
        this.scene.remove(unfoldGroup);
        this.unfoldMap.delete(sourceMesh);
      }
    }

    // 2. Добавление и обновление существующих
    mainScene.traverse((obj) => {
      if (obj.isMesh && obj.userData.selectable) {
        const type = obj.geometry.type;
        const strategy = this.strategies[type];

        if (strategy) {
          let unfoldGroup = this.unfoldMap.get(obj);
          if (!unfoldGroup) {
            unfoldGroup = strategy.generate(obj);
            this.scene.add(unfoldGroup);
            this.unfoldMap.set(obj, unfoldGroup);
          }
          strategy.update(unfoldGroup, obj);
        }
      }
    });
  }

  isObjectInScene(scene, object) {
    let found = false;
    scene.traverse(child => { if(child === object) found = true; });
    return found;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    const aspect = w / h;
    this.camera.left = -15 * aspect;
    this.camera.right = 15 * aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}