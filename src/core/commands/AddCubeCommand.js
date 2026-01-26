import * as THREE from 'three'

export class AddCubeCommand {
  constructor(sceneSystem) {
    this.sceneSystem = sceneSystem
    this.mesh = null
  }

  execute() {
    if (!this.mesh) {
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      this.mesh = new THREE.Mesh(geometry, material)
      this.mesh.position.set((Math.random() - 0.5) * 5, 1, (Math.random() - 0.5) * 5)
      this.mesh.userData.selectable = true
    }
    this.sceneSystem.add(this.mesh)
  }

  undo() {
    if (this.mesh) {
      this.sceneSystem.remove(this.mesh)
    }
  }
}
