export class SelectionSystem {
  constructor() {
    this.selected = null
  }

  set(object) {
    this.selected = object
    console.log('Selected:', object)
    // Здесь можно эмитить событие или обновлять визуализацию (highlight)
    // console.log('SelectionSystem: selected ->', object)
  }

  update() {
    // пассивно — пока оставляем пустым
  }
}
