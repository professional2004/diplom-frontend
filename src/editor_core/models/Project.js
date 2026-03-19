export class Project {
  constructor() {
    this.data = [] 
  }

  // десериализация данных проекта
  deserialize(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      this.data = parsed?.data || []
    } catch (error) {
      console.error('Ошибка десериализации проекта:', error)
      this.data = []
    }
  }

  // сериализация данных проекта
  serialize() {
    return JSON.stringify({
      data: this.data
    })
  }
}