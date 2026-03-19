export class Project {
  constructor() {
    this.project_data = [] 
  }

  // десериализация данных проекта
  deserialize(jsonData) {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      this.project_data = parsed?.project_data || []
    } catch (error) {
      console.error('Ошибка десериализации проекта:', error)
      this.project_data = []
    }
  }

  // сериализация данных проекта
  serialize() {
    return JSON.stringify({
      project_data: this.project_data
    })
  }
}