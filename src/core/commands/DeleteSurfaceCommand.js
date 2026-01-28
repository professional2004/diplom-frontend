import { SurfaceRegistry } from '@/core/surfaces/SurfaceRegistry'

/**
 * Команда для удаления поверхности со сцены
 */
export class DeleteSurfaceCommand {
  constructor(sceneSystem, selectionSystem, mesh, store = null) {
    this.sceneSystem = sceneSystem
    this.selectionSystem = selectionSystem
    this.store = store
    this.mesh = mesh

    // Сохраняем данные поверхности для восстановления
    this.surfaceType = mesh.userData.surfaceType
    this.params = mesh.userData.params ? { ...mesh.userData.params } : {}
    this.position = mesh.position.clone()
    this.rotation = mesh.rotation.clone()
    this.scale = mesh.scale.clone()
    this.materialColor = mesh.material?.color?.getHex?.() || 0xffffff
  }

  execute() {
    // Удаляем поверхность со сцены
    this.sceneSystem.remove(this.mesh)

    // Очищаем выделение если удаляемая поверхность была выбрана
    if (this.selectionSystem.getSelected() === this.mesh) {
      this.selectionSystem.clear()

      // Обновляем store для реактивности UI
      if (this.store) {
        this.store.updateSelectedSurface(null)
      }
    }
  }

  undo() {
    // Восстанавливаем поверхность со сцены
    this.sceneSystem.add(this.mesh)

    // Восстанавливаем трансформацию
    this.mesh.position.copy(this.position)
    this.mesh.rotation.copy(this.rotation)
    this.mesh.scale.copy(this.scale)
  }
}
