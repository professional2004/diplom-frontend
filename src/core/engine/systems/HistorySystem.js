/**
 * История команд для реализации undo/redo функциональности
 * Использует паттерн Command для управления историей изменений
 */
export class HistorySystem {
  constructor() {
    // Инициализируем историю сразу в конструкторе, избегая проверок
    this.history = []
    this.index = -1
  }

  /**
   * Выполняет команду и добавляет её в историю
   * @param {Object} cmd - команда с методами execute(), undo()
   */
  execute(cmd) {
    if (!cmd || typeof cmd.execute !== 'function') {
      console.warn('HistorySystem.execute: invalid command passed', cmd)
      return
    }

    // Если мы в середине истории (были отмены), отсекаем ветку redo
    if (this.index < this.history.length - 1) {
      this.history = this.history.slice(0, this.index + 1)
    }

    try {
      cmd.execute()
      this.history.push(cmd)
      this.index++
    } catch (err) {
      console.error('HistorySystem.execute: command execution failed', err)
    }
  }

  /**
   * Отменяет последнюю команду
   */
  undo() {
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

  /**
   * Повторяет отменённую команду
   */
  redo() {
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

  /**
   * Получает размер истории
   */
  getSize() {
    return this.history.length
  }

  /**
   * Получает текущий индекс в истории
   */
  getCurrentIndex() {
    return this.index
  }

  /**
   * Очищает историю (например, при новом проекте)
   */
  clear() {
    this.history = []
    this.index = -1
  }
}
