export class HistorySystem {
  constructor() {
    this.stack = []
    this.index = -1
  }

  execute(cmd) {
    // Защита: иногда instance может быть не полностью инициализирован
    if (!Array.isArray(this.history)) {
      this.history = []
      this.index = -1
    }

    if (!cmd || typeof cmd.execute !== 'function') {
      console.warn('HistorySystem.execute: invalid command passed', cmd)
      return
    }

    if (this.index < this.history.length - 1) {
      // Отсекаем "redo" ветку
      this.history = this.history.slice(0, this.index + 1)
    }

    try {
      cmd.execute()
      this.history.push(cmd)
      this.index++
    } catch (err) {
      console.error('HistorySystem.execute: command execution failed', err)
      // По желанию не пушим команду, если она упала
    }
  }

  
  undo() {
    if (!Array.isArray(this.history)) return
    if (this.index >= 0) {
      const cmd = this.history[this.index]
      try {
        cmd.undo && cmd.undo()
      } catch (err) {
        console.error('HistorySystem.undo: undo failed', err)
      }
      this.index--
    }
  }

  redo() {
    if (!Array.isArray(this.history)) return
    if (this.index < this.history.length - 1) {
      this.index++
      const cmd = this.history[this.index]
      try {
        cmd.execute && cmd.execute()
      } catch (err) {
        console.error('HistorySystem.redo: redo failed', err)
      }
    }
  }
}
