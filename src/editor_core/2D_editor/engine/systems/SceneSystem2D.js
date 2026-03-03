import * as THREE from 'three'

export class SceneSystem2D {
  constructor() {
    console.log('[->] SceneSystem2D: constructor')
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    // По-умолчанию сетка 2D
    this.grid = null
    // Группа для деталей развертки (нужна для легкой очистки всей сцены без удаления сетки)
    this.unfoldObjects = new THREE.Group()
    this.scene.add(this.unfoldObjects)
  }


  matchGridFrom(gridHelper3D) {
    console.log('[->] SceneSystem2D: matchGridFrom()')
    if (!gridHelper3D) return

    const size = gridHelper3D.userData?.gridSize ?? 100
    const divisions = gridHelper3D.userData?.gridDivisions ?? 50

    // Если сетка уже такая же, ничего не перестраиваем
    if (this.grid && 
        this.grid.userData.gridSize === size && 
        this.grid.userData.gridDivisions === divisions) {
      return
    }

    this._createGrid(size, divisions)
  }


  _createGrid(size, divisions) {
    console.log('[->] SceneSystem2D: _createGrid()')
    // Очистка старой сетки
    if (this.grid) {
      this.scene.remove(this.grid)
      if (this.grid.geometry) this.grid.geometry.dispose()
      if (this.grid.material) this.grid.material.dispose()
    }

    // Создание новой
    // Используем более светлые цвета для 2D (под текстиль)
    this.grid = new THREE.GridHelper(size, divisions, 0xcccccc, 0x000000)
    
    // Поворачиваем сетку, чтобы она лежала в плоскости XY (вид сверху)
    this.grid.rotation.x = -Math.PI / 2
    
    // Сохраняем параметры для последующих проверок
    this.grid.userData = { gridSize: size, gridDivisions: divisions }
    
    this.scene.add(this.grid)
  }


  add(obj) { 
    console.log('[->] SceneSystem2D: add()')
    this.unfoldObjects.add(obj) 
  }

  remove(obj) { 
    console.log('[->] SceneSystem2D: remove()')
    this.unfoldObjects.remove(obj) 
  }
  
  clearUnfolds() {
    console.log('[->] SceneSystem2D: clearUnfolds()')
    // Очищаем только детали, оставляя сетку и свет
    while (this.unfoldObjects.children.length > 0) {
      const child = this.unfoldObjects.children[0]
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
      this.unfoldObjects.remove(child)
    }
  }

dispose() {
    console.log('[->] SceneSystem2D: dispose()')
    this.clearUnfolds()
    if (this.grid) {
      this.grid.geometry.dispose()
      this.grid.material.dispose()
    }
    this.scene.clear()
  }
}