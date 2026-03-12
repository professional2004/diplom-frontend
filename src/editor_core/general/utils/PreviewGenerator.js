import * as THREE from 'three'

export class PreviewGenerator {
  /**
   * Генерирует PNG-превью сцены в формате Base64.
   * @param {Object} sceneSystem - экземпляр SceneSystem3D
   * @returns {string|null} - Base64 строка (без data:image префикса) для бэкенда
   */
  static generate(sceneSystem) {
    if (!sceneSystem || !sceneSystem.scene) return null;

    const scene = sceneSystem.scene;

    // 1. Сохраняем оригинальные настройки сцены
    const originalBackground = scene.background;
    const originalGridVisible = sceneSystem.grid ? sceneSystem.grid.visible : false;
    const originalGroundVisible = sceneSystem.ground ? sceneSystem.ground.visible : false;

    // 2. Скрываем фон, сетку и землю для прозрачного PNG
    scene.background = null; 
    if (sceneSystem.grid) sceneSystem.grid.visible = false;
    if (sceneSystem.ground) sceneSystem.ground.visible = false;

    // 3. Создаем временный рендерер с поддержкой прозрачности (alpha: true)
    const width = 800;
    const height = 600;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1); // Фиксированный pixel ratio для одинакового результата на всех экранах

    // 4. Создаем временную камеру
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    // 5. Умный расчет ракурса (по центру спереди и чуть сверху)
    const box = new THREE.Box3();
    let hasObjects = false;

    // Ищем все 3D-фигуры на сцене, чтобы рассчитать их габариты
    scene.children.forEach(child => {
      if (child.isMesh && child.userData?.shapeType) {
        box.expandByObject(child);
        hasObjects = true;
      }
    });

    if (hasObjects && !box.isEmpty()) {
      // Если есть фигуры: центрируем камеру по ним
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      const fovRad = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fovRad / 2));
      cameraZ *= 1.8; // Добавляем отступ, чтобы фигуры точно влезли в кадр

      camera.position.set(center.x, center.y + maxDim * 0.5, center.z + cameraZ);
      camera.lookAt(center);
    } else {
      // Если сцена пустая: ориентируемся на размер сетки
      const gridSize = sceneSystem.grid?.userData?.gridSize || 20;
      camera.position.set(0, gridSize * 0.5, gridSize * 1.5);
      camera.lookAt(0, 0, 0);
    }

    // 6. Рендерим кадр
    renderer.render(scene, camera);

    // 7. Получаем картинку в формате Base64
    const dataUrl = renderer.domElement.toDataURL('image/png');
    // Убираем служебный префикс, чтобы Java/Spring Boot смог корректно распарсить это в byte[]
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

    // 8. Восстанавливаем оригинальные настройки сцены
    scene.background = originalBackground;
    if (sceneSystem.grid) sceneSystem.grid.visible = originalGridVisible;
    if (sceneSystem.ground) sceneSystem.ground.visible = originalGroundVisible;

    // 9. Очищаем память
    renderer.dispose();

    return base64Data;
  }
}