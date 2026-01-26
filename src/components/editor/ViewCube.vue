<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { ViewCubeGizmo } from '@/core/utils/ViewCubeGizmo'

const containerRef = ref(null)
const store = useEditorStore()
let gizmo = null
let raf = null

onMounted(() => {
  const init = () => {
    if (store.engine && containerRef.value) {
      const mainCamera = store.engine.cameraSystem.camera
      const mainControls = store.engine.cameraSystem.controls

      gizmo = new ViewCubeGizmo(
        containerRef.value,
        mainCamera,
        mainControls,
        (direction) => {
          // flyTo через cameraSystem
          store.engine.cameraSystem.flyTo(direction)
        }
      )

      const animate = () => {
        gizmo.update()
        raf = requestAnimationFrame(animate)
      }
      animate()
    } else {
      setTimeout(init, 100)
    }
  }
  init()
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  gizmo?.dispose()
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