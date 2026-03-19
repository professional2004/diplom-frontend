import * as THREE from 'three'

export class GeneratePreviewHelper {
  static do(sceneSystem3D) {
    const scene3D = sceneSystem3D.scene;

    // Сохраняем оригинальные настройки сцены
    const originalBackground = scene3D.background;
    const originalGridVisible = sceneSystem3D.grid ? sceneSystem3D.grid.visible : false;
    const originalGroundVisible = sceneSystem3D.ground ? sceneSystem3D.ground.visible : false;

    // Скрываем фон, сетку и землю для прозрачного PNG
    scene3D.background = null; 
    if (sceneSystem3D.grid) sceneSystem3D.grid.visible = false;
    if (sceneSystem3D.ground) sceneSystem3D.ground.visible = false;

    // Создаем временный рендерер с поддержкой прозрачности
    const width = 800;
    const height = 600;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);

    // Создаем временную камеру
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    // Умный расчет ракурса (по центру спереди и чуть сверху)
    const box = new THREE.Box3();
    let hasObjects = false;

    // Ищем все 3D-фигуры на сцене, чтобы рассчитать их габариты
    scene3D.children.forEach(child => {
      if (child.isMesh) {
        box.expandByObject(child);
        hasObjects = true;
      }
    });

    if (hasObjects && !box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxdir = Math.max(size.x, size.y, size.z);
      
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxdir / 2 / Math.tan(fov / 2));
      cameraZ *= 1.8; // отступ, чтобы фигуры точно влезли в кадр

      camera.position.set(center.x, center.y + maxdir * 0.5, center.z + cameraZ);
      camera.lookAt(center);
    } else {
      // Если сцена пустая, ориентируемся на размер сетки
      const gridSize = sceneSystem3D.grid?.userData?.gridSize || 20;
      camera.position.set(0, gridSize * 0.5, gridSize * 1.5);
      camera.lookAt(0, 0, 0);
    }

    // Рендерим кадр
    renderer.render(scene3D, camera);

    // Получаем картинку в формате Base64
    const dataUrl = renderer.domElement.toDataURL('image/png');
    // Убираем служебный префикс, чтобы Java Spring Boot смог корректно распарсить это в byte[]
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

    // Восстанавливаем оригинальные настройки сцены
    scene3D.background = originalBackground;
    if (sceneSystem3D.grid) sceneSystem3D.grid.visible = originalGridVisible;
    if (sceneSystem3D.ground) sceneSystem3D.ground.visible = originalGroundVisible;

    // Очищаем память
    renderer.dispose();

    return base64Data;
  }
}