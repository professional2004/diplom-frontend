import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import * as THREE from 'three'
import { Engine } from '@/core/engine/Engine'
import { AddShapeCommand } from '@/core/commands/AddShapeCommand'
import { DeleteShapeCommand } from '@/core/commands/DeleteShapeCommand'
import { MoveShapeCommand } from '@/core/commands/MoveShapeCommand'
import { RotateShapeCommand } from '@/core/commands/RotateShapeCommand'
import { ScaleShapeCommand } from '@/core/commands/ScaleShapeCommand'
import { TransformCommand } from '@/core/commands/TransformCommand'
import { CubeShape } from '@/core/shapes/CubeShape'
import { RoundedPrismShape } from '@/core/shapes/RoundedPrismShape'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    engine: null,
    canUndo: false,
    canRedo: false,
    selectedShape: null  // Реактивное состояние для выбранной фигуры
  }),

  actions: {
    init(container) {
      if (this.engine) return
      const engine = new Engine(container)
      this.engine = markRaw(engine)
      
      // Передаем store в InputSystem для реактивности UI
      this.engine.inputSystem.setStore(this)
      
      this.updateUndoRedo()
      
      // Слушаем события от InputSystem
      window.addEventListener('deleteSelectedShape', () => this.deleteShape())
      window.addEventListener('undo', () => this.undo())
      window.addEventListener('redo', () => this.redo())
    },

    zoomIn() { this.engine?.cameraSystem.zoom(0.9) },
    zoomOut() { this.engine?.cameraSystem.zoom(1.1) },
    resetView() { this.engine?.cameraSystem.reset() },

    // УНИВЕРСАЛЬНЫЙ МЕТОД для добавления фигуры
    addShape(type) {
      if (!this.engine) return
      
      // Параметры можно брать из UI, пока дефолтные внутри команд/фигур
      const cmd = new AddShapeCommand(this.engine.sceneSystem, type)
      
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Удаление выбранной фигуры
    deleteShape() {
      if (!this.engine) return
      
      const selected = this.engine.selectionSystem.getSelected()
      if (!selected) return
      
      const cmd = new DeleteShapeCommand(
        this.engine.sceneSystem,
        this.engine.selectionSystem,
        selected,
        this  // Передаем store для обновления UI
      )
      
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Выбрать фигуру (обновляет реактивное состояние)
    selectShape(mesh) {
      if (!this.engine) return
      this.selectedShape = mesh
      this.engine.selectionSystem.setSelected(mesh)
    },

    // Получить текущую выбранную фигуру
    getSelectedShape() {
      return this.selectedShape
    },

    // Очистить выделение
    clearSelection() {
      if (!this.engine) return
      this.selectedShape = null
      this.engine.selectionSystem.clear()
    },

    // Обновить выделение (вызывается из InputSystem)
    updateSelectedShape(mesh) {
      this.selectedShape = mesh
    },

    // Обновить параметры выбранной фигуры
    updateShapeParams(mesh, newParams) {
      if (!mesh || !this.engine) return
      
      const shapeType = mesh.userData.shapeType
      
      // Получаем класс фигуры из registry
      const ShapeClass = this._getShapeClass(shapeType)
      if (!ShapeClass) return
      
      // Создаем экземпляр и вызываем updateMeshGeometry
      const shapeInstance = new ShapeClass(newParams)
      shapeInstance.updateMeshGeometry(mesh, newParams)
    },

    // Вспомогательный метод для получения класса фигуры
    _getShapeClass(shapeType) {
      if (shapeType === 'cube') {
        return CubeShape
      }
      if (shapeType === 'roundedPrism') {
        return RoundedPrismShape
      }
      return null
    },

    // Обновить позицию фигуры (с поддержкой undo/redo)
    updateShapePosition(mesh, x, y, z) {
      if (!mesh || !this.engine) return
      const newPos = new THREE.Vector3(x, y, z)
      const oldPos = mesh.position.clone()
      
      const cmd = new MoveShapeCommand(mesh, newPos, oldPos)
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Обновить поворот фигуры (в радианах, с поддержкой undo/redo)
    updateShapeRotation(mesh, rotX, rotY, rotZ) {
      if (!mesh || !this.engine) return
      const newRot = new THREE.Euler(rotX, rotY, rotZ)
      const oldRot = mesh.rotation.clone()
      
      const cmd = new RotateShapeCommand(mesh, newRot, oldRot)
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Обновить масштаб фигуры (с поддержкой undo/redo)
    updateShapeScale(mesh, scaleX, scaleY, scaleZ) {
      if (!mesh || !this.engine) return
      const newScale = new THREE.Vector3(scaleX, scaleY, scaleZ)
      const oldScale = mesh.scale.clone()
      
      const cmd = new ScaleShapeCommand(mesh, newScale, oldScale)
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    // Обновить все трансформирования объекта сразу (позиция, поворот, масштаб)
    // Это создаёт одну команду для всех изменений
    updateShapeTransform(mesh, position, rotation, scale) {
      if (!mesh || !this.engine) return
      
      const oldData = TransformCommand.captureTransform(mesh)
      const newData = {
        position: position || mesh.position.clone(),
        rotation: rotation || mesh.rotation.clone(),
        scale: scale || mesh.scale.clone(),
      }
      
      const cmd = new TransformCommand(mesh, newData, oldData)
      this.engine.historySystem.execute(cmd)
      this.updateUndoRedo()
    },

    undo() {
      if (!this.engine) return
      this.engine.historySystem.undo()
      this.updateUndoRedo()
    },

    redo() {
      if (!this.engine) return
      this.engine.historySystem.redo()
      this.updateUndoRedo()
    },

    updateUndoRedo() {
      const h = this.engine?.historySystem
      this.canUndo = !!(h && h.history && h.index >= 0)
      this.canRedo = !!(h && h.history && h.index < (h.history.length - 1))
    },

    dispose() {
      window.removeEventListener('deleteSelectedShape', () => this.deleteShape())
      window.removeEventListener('undo', () => this.undo())
      window.removeEventListener('redo', () => this.redo())
      this.engine?.dispose()
      this.engine = null
    }
  }
})