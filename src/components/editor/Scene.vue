<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { SceneManager } from '@/threejs/SceneManager'
import { useEditorStore } from '@/stores/editor'

const canvasRef = ref(null)
const store = useEditorStore()
let engine = null

onMounted(() => {
  // Проверяем, что DOM-элемент доступен
  if (canvasRef.value) {
    // Передаем настройки из Pinia в конструктор
    engine = new SceneManager(canvasRef.value)
    store.setInitialized(true)
  }
})

onBeforeUnmount(() => {
  if (engine) engine.dispose()
})

// Вместо ручного вызова syncSettings можно использовать watch
// watch(
//   () => [store.rotationSpeed, store.panSpeed, store.zoomSpeed]
// )
</script>


<template>
  <div class="editor-container">
    <div ref="canvasRef" class="canvas-wrapper"></div>
  </div>
</template>


<style scoped>
.editor-container,
.canvas-wrapper { 
  width: 100%; 
  height: 100%; 
}
.editor-container {
  position: relative;
}
</style>