export class HistorySystem {
  constructor() {
    console.log('[->] HistorySystem: constructor')
    this.history = []
    this.index = -1
  }

  execute(command) {
    console.log('[->] HistorySystem: execute()')
    // Защита: иногда instance может быть не полностью инициализирован
    if (!Array.isArray(this.history)) {
      this.history = []
      this.index = -1
    }

    if (!command || typeof command.execute !== 'function') {
      console.warn('HistorySystem.execute: invalid command passed', command)
      return
    }

    if (this.index < this.history.length - 1) {
      // Отсекаем "redo" ветку
      this.history = this.history.slice(0, this.index + 1)
    }

    try {
      command.execute()
      this.history.push(command)
      this.index++
    } catch (err) {
      console.error('HistorySystem.execute: command execution failed', err)
      // По желанию не пушим команду, если она упала
    }
  }

  
  undo() {
    console.log('[->] HistorySystem: undo()')
    if (!Array.isArray(this.history)) return
    if (this.index >= 0) {
      const command = this.history[this.index]
      try {
        command.undo && command.undo()
      } catch (err) {
        console.error('HistorySystem.undo: undo failed', err)
      }
      this.index--
    }
  }

  redo() {
    console.log('[->] HistorySystem: redo()')
    if (!Array.isArray(this.history)) return
    if (this.index < this.history.length - 1) {
      this.index++
      const command = this.history[this.index]
      try {
        command.execute && command.execute()
      } catch (err) {
        console.error('HistorySystem.redo: redo failed', err)
      }
    }
  }

  clear() {
    console.log('[->] HistorySystem: clear()')
    this.history = []
    this.index = -1
  }
}
