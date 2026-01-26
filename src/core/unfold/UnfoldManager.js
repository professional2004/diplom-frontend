import * as THREE from 'three'
import { BoxUnfoldStrategy } from '@/core/unfold/strategies/BoxUnfoldStrategy'

export class UnfoldManager {
  constructor(container) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf5f5f5)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.OrthographicCamera(-15 * aspect, 15 * aspect, 15, -15, 0.1, 1000)
    this.camera.position.set(0, 0, 50)

    this.strategies = {
      'BoxGeometry': new BoxUnfoldStrategy()
    }

    this.unfoldMap = new Map()
  }

  sync(mainScene) {
    // Удаляем удалённые
    for (const [src, group] of this.unfoldMap.entries()) {
      if (!this.isInScene(mainScene, src)) {
        this.scene.remove(group)
        this.unfoldMap.delete(src)
      }
    }

    mainScene.traverse(obj => {
      if (obj.isMesh && obj.userData.selectable) {
        const strategy = this.strategies[obj.geometry.type]
        if (!strategy) return
        let g = this.unfoldMap.get(obj)
        if (!g) {
          g = strategy.generate(obj)
          this.scene.add(g)
          this.unfoldMap.set(obj, g)
        }
        strategy.update(g, obj)
      }
    })
  }

  isInScene(scene, object) {
    let found = false
    scene.traverse(c => { if (c === object) found = true })
    return found
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  resize(w, h) {
    const aspect = w / h
    this.camera.left = -15 * aspect
    this.camera.right = 15 * aspect
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    this.renderer.dispose()
  }
}
