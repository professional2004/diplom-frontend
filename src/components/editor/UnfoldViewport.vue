<script setup>
import { ref, onMounted, onBeforeUnmount, watchEffect } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { UnfoldManager } from '@/core/unfold/UnfoldManager'

const containerRef = ref(null)
const store = useEditorStore()
let manager = null
let animFrame = null

onMounted(() => {
  if (containerRef.value) {
    manager = new UnfoldManager(containerRef.value)
    
    const loop = () => {
      // Синхронизируем 2D проекцию с основной 3D сценой стора [cite: 289]
      if (store.sceneManager?.scene) {
        manager.sync(store.sceneManager.scene)
      }
      manager.render()
      animFrame = requestAnimationFrame(loop)
    }
    loop()
  }
})

onBeforeUnmount(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
  manager?.renderer.dispose()
})
</script>

<template>
  <div class="unfold-viewport" ref="containerRef">
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