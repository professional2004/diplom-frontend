<script setup>
import SceneViewport from './SceneViewport.vue'
import EditorToolbar from './EditorToolbar.vue'
import ViewCube from './ViewCube.vue'
import UnfoldViewport from './UnfoldViewport.vue'
import CurveEditor from './CurveEditor.vue'
import StripContourEditor from './StripContourEditor.vue' // [!] Импорт
import { useEditorStore } from '@/stores/editorStore'
import { computed } from 'vue'

const store = useEditorStore()

// Условия отображения
const showCurveEditor = computed(() => {
  if (!store.selectedSurface) return false
  const type = store.selectedSurface.userData.surfaceType
  return type === 'cylindrical-strip' || type === 'conical-strip' ||
         type === 'cylindrical' || type === 'conical'
})

const showStripEditor = computed(() => {
  if (!store.selectedSurface) return false
  const type = store.selectedSurface.userData.surfaceType
  return type === 'cylindrical-strip' || type === 'conical-strip'
})

const selectedSurfaceType = computed(() => {
  return store.selectedSurface?.userData.surfaceType || 'unknown'
})

// [!] Вычисляемое свойство для контура развертки (серый фон)
const stripOutline = computed(() => {
  return store.getSelectedStripOutlinePoints() || []
})

function handleCurveUpdate(newCurve) {
  store.setSelectedSurfaceBaseCurve(newCurve)
}

function handleStripContourUpdate(newContour) {
  store.setSelectedStripContour(newContour)
}
</script>

<template>
  <div class="layout">
    <EditorToolbar class="ui-layer" />
    
    <div class="main-container">
      <div class="viewport-wrapper">
        <SceneViewport class="scene-layer" />
        <div class="cube-wrapper ui-layer">
          <ViewCube />
        </div>
      </div>
      <div class="viewport-wrapper">
        <UnfoldViewport />
      </div>
    </div>

    <div v-if="showCurveEditor || showStripEditor" class="editors-panel">
      
      <div v-if="showCurveEditor" class="editor-col" :class="{ 'half-width': showStripEditor }">
        <CurveEditor
          :curve="store.getSelectedSurfaceBaseCurve()"
          :title="`Base Shape (${selectedSurfaceType})`"
          @update:curve="handleCurveUpdate"
        />
      </div>

      <div v-if="showStripEditor" class="editor-col half-width">
        <StripContourEditor
          :contour="store.getSelectedStripContour()"
          :unfoldOutlinePoints="stripOutline"
          title="Cut Shape (Strip Pattern)"
          @update:contour="handleStripContourUpdate"
        />
      </div>

    </div>
  </div>
</template>

<style scoped>
.layout { position: relative; width: 100vw; height: 100vh; display: flex; flex-direction: column; }
.main-container { flex: 1; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }
.viewport-wrapper { position: relative; height: 100%; }
.ui-layer { position: absolute; z-index: 10; pointer-events: none; }
.ui-layer :deep(*) { pointer-events: auto; }
.layout > .ui-layer:first-child { top: 0; left: 0; }
.cube-wrapper { top: 10px; right: 10px; }
.scene-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }

.editors-panel {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white; border-top: 2px solid #e5e7eb;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 20; height: 300px;
  display: flex; gap: 1px; background-color: #e5e7eb;
  animation: slideUp 0.3s ease-out;
}
.editor-col { flex: 1; background: white; height: 100%; overflow: hidden; }
.editor-col.half-width { width: 50%; flex: none; }
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>