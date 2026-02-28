<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { ViewCubeGizmo } from '@/editor_core/3D_editor/utils/ViewCubeGizmo'

const containerRef = ref(null)
const store = useEditorStore()
let gizmo = null
let raf = null

onMounted(() => {
  const init = () => {
    if (store.engine3D && containerRef.value) {
      const mainCamera = store.engine3D.cameraSystem3D.camera
      const mainControls = store.engine3D.cameraSystem3D.controls

      gizmo = new ViewCubeGizmo(
        containerRef.value,
        mainCamera,
        mainControls,
        (direction) => {
          // flyTo через cameraSystem
          store.engine3D.cameraSystem3D.flyTo(direction)
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