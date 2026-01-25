// src/threejs/commands/CommandManager.js
export class CommandManager {
  constructor() {
    this.history = []
    this.index = -1
    this.onUpdate = null 
  }

  // Геттеры должны возвращать актуальное состояние
  get canUndo() {
    return this.index >= 0
  }

  get canRedo() {
    return this.index < this.history.length - 1
  }

  execute(command) {
    if (this.index < this.history.length - 1) {
      this.history = this.history.slice(0, this.index + 1)
    }

    command.execute()
    this.history.push(command)
    this.index++
    
    this.notify()
  }

  undo() {
    if (this.canUndo) {
      this.history[this.index].undo()
      this.index--
      this.notify()
    }
  }

  redo() {
    if (this.canRedo) {
      this.index++
      this.history[this.index].execute()
      this.notify()
    }
  }

  notify() {
    console.log('CommandManager: вызываю notify. Текущий индекс:', this.index)
    if (this.onUpdate) {
      this.onUpdate()
    }
  }
}