export class UnfoldStrategy {
  // Метод должен возвращать группу мешей (лицо развертки)
  generate(sourceMesh) {
    throw new Error("Метод generate() должен быть реализован");
  }

  // Обновление трансформаций (масштаб, положение)
  update(unfoldGroup, sourceMesh) {
    throw new Error("Метод update() должен быть реализован");
  }
}