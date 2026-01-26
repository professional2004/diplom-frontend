import * as THREE from 'three'

export class AddCubeCommand {
  constructor(scene) {
    this.scene = scene
    this.cube = null
  }

  execute() {
    if (!this.cube) {
      // Создаем куб только первый раз, при Redo используем тот же объект
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      this.cube = new THREE.Mesh(geometry, material)
      // Сдвинем немного, чтобы не появлялся внутри других, если их много (рандом для примера)
      this.cube.position.set((Math.random() - 0.5) * 5, 1, (Math.random() - 0.5) * 5)
      
      // Помечаем, что этот объект можно выбрать (для InteractionSystem)
      this.cube.userData.selectable = true 
    }
    
    this.scene.add(this.cube)
    console.log('Command: Add Cube Executed')
  }

  undo() {
    if (this.cube) {
      this.scene.remove(this.cube)
      console.log('Command: Add Cube Undone')
    }
  }
}