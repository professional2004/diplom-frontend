export class CommandManager {
  constructor() {
    this.history = []
    this.historyIndex = -1
  }

  execute(command) {
    // Если мы были в середине истории и сделали новое действие - хвост отрезается
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1)
    }
    
    command.execute()
    this.history.push(command)
    this.historyIndex++
  }

  undo() {
    if (this.historyIndex >= 0) {
      this.history[this.historyIndex].undo()
      this.historyIndex--
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++
      this.history[this.historyIndex].execute()
    }
  }
}