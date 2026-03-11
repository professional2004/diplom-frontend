<script setup>
import { ref, onMounted } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import ToolbarPanel2D from '@/components/editor/2D_scene/ToolbarPanel2D.vue'

const containerRef = ref(null)
const store = useEditorStore()

onMounted(() => {
  if (!containerRef.value) return
  store.init2D(containerRef.value)
})
</script>

<template>
  <div class="scene2d-viewport">
    <div ref="containerRef" class="viewport"></div>
    <div class="ui-layer">
      <ToolbarPanel2D />
    </div>
  </div>
</template>

<style scoped>
.viewport { 
  width: 100%;
  height: 100%; 
  overflow: hidden;
}

</style>