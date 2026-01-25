<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { ViewCubeGizmo } from '@/core/utils/ViewCubeGizmo'

const containerRef = ref(null)
const store = useEditorStore()
let gizmo = null
let animationFrame = null

onMounted(() => {
  // Ждем инициализации основной сцены
  const init = () => {
    if (store.sceneManager && containerRef.value) {
      
      const { camera: mainCamController } = store.sceneManager

      gizmo = new ViewCubeGizmo(
        containerRef.value,
        mainCamController.camera,
        mainCamController.controls,
        (direction) => {
          // При клике вызываем flyTo
          mainCamController.flyTo(direction)
        }
      )
      
      animate()
    } else {
      setTimeout(init, 100) // retry
    }
  }
  
  init()
})

const animate = () => {
  animationFrame = requestAnimationFrame(animate)
  if (gizmo) gizmo.update()
}

onBeforeUnmount(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (gizmo) gizmo.dispose()
})
</script>

<template>
  <div ref="containerRef" class="view-cube-container"></div>
</template>

<style scoped>
.view-cube-container {
  width: 120px;
  height: 120px;
  cursor: pointer;
}
</style>