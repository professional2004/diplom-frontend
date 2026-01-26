<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { UnfoldManager } from '@/core/unfold/UnfoldManager'

const containerRef = ref(null)
const store = useEditorStore()
let manager = null
let raf = null

onMounted(() => {
  if (!containerRef.value) return
  manager = new UnfoldManager(containerRef.value)

  const loop = () => {
    if (store.engine?.sceneSystem?.scene) {
      manager.sync(store.engine.sceneSystem.scene)
    }
    manager.render()
    raf = requestAnimationFrame(loop)
  }
  loop()
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  manager?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="unfold-viewport">
    <div class="overlay-info">Проекция развертки (2D)</div>
  </div>
</template>

<style scoped>
.unfold-viewport { 
  width: 100%; 
  height: 100%; 
  background: #f0f0f0; 
  border-left: 2px solid #ddd;
  position: relative;
}
.overlay-info {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>