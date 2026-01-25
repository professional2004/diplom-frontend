import { markRaw } from 'vue' // Важно! Чтобы Vue не делал Three.js объекты реактивными
import { defineStore } from 'pinia'
import { SceneManager } from '@/core/SceneManager'
import { AddCubeCommand } from '@/core/commands/add/AddCubeCommand'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    sceneManager: null, // Ссылка на движок
    // UI State
    canUndo: false,
    canRedo: false,
  }),
  actions: {
    initScene(canvas) {
      if (this.sceneManager) return
      const manager = new SceneManager(canvas)
      // Подписка на изменение истории команд для обновления UI кнопок
      manager.commandManager.onUpdate = () => {
        this.canUndo = manager.commandManager.canUndo
        this.canRedo = manager.commandManager.canRedo
      }
      // markRaw нужен, чтобы Vue не вешал прокси на тяжелый объект Three.js
      this.sceneManager = markRaw(manager) 
    },
    disposeScene() {
      if (this.sceneManager) {
        this.sceneManager.dispose()
        this.sceneManager = null
      }
    },
    // --- Действия камеры ---
    zoomIn() { this.sceneManager?.camera.zoom(0.9) },
    zoomOut() { this.sceneManager?.camera.zoom(1.1) },
    resetView() { this.sceneManager?.camera.reset() },


    // --- Действия редактора (Примеры) ---
    
    // Пример добавления куба через паттерн Command
    addCube() {
      if (!this.sceneManager) return
      const command = new AddCubeCommand(this.sceneManager.scene)
      this.sceneManager.commandManager.execute(command)
    },

    undo() {
      this.sceneManager?.commandManager.undo()
    },

    redo() {
      this.sceneManager?.commandManager.redo()
    }
  }
})
