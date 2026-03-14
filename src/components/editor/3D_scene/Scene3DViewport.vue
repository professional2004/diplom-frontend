<script setup>
import { ref, onMounted } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import ViewCubeGizmo from '@/components/editor/3D_scene/ViewCubeGizmo.vue'
import ToolbarPanel3D from '@/components/editor/3D_scene/ToolbarPanel3D.vue'

const canvasRef = ref(null)
const editorStore = useEditorStore()

onMounted(() => {
  if (canvasRef.value) {
    editorStore.init3D(canvasRef.value)
  }
})
</script>

<template>
  <div class="scene3d-viewport">
    <div ref="canvasRef" class="viewport"></div>
    <div class="cube-wrapper ui-layer">
      <ViewCubeGizmo />
    </div>
    <div class="ui-layer">
      <ToolbarPanel3D />
    </div>
  </div>
</template>

<style scoped>
.viewport { width:100%; height:100%; overflow:hidden; }
</style>
