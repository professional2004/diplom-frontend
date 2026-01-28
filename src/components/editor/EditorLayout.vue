<script setup>
import SceneViewport from './SceneViewport.vue'
import EditorToolbar from './EditorToolbar.vue'
import ViewCube from './ViewCube.vue'
import UnfoldViewport from './UnfoldViewport.vue'
import CurveEditor from './CurveEditor.vue'
import { useEditorStore } from '@/stores/editorStore'
import { computed } from 'vue'

const store = useEditorStore()

// Показываем редактор кривой если выбрана поверхность с основанием
const showCurveEditor = computed(() => {
  if (!store.selectedSurface) return false
  const type = store.selectedSurface.userData.surfaceType
  return type === 'cylindrical-strip' || type === 'conical-strip' ||
         type === 'cylindrical' || type === 'conical'
})

const selectedSurfaceType = computed(() => {
  return store.selectedSurface?.userData.surfaceType || 'unknown'
})

function handleCurveUpdate(newCurve) {
  store.setSelectedSurfaceBaseCurve(newCurve)
}
</script>

<template>
  <div class="layout">
    <EditorToolbar class="ui-layer" />
    
    <div class="main-container">
      <!-- 3D сцена (слева) -->
      <div class="viewport-wrapper">
        <SceneViewport class="scene-layer" />
        <div class="cube-wrapper ui-layer">
          <ViewCube />
        </div>
      </div>

      <!-- Развертки 2D (справа) -->
      <div class="viewport-wrapper">
        <UnfoldViewport />
      </div>
    </div>

    <!-- Редактор базовой кривой поверхности (внизу, опциональный) -->
    <div v-if="showCurveEditor" class="curve-editor-panel">
      <CurveEditor
        :curve="store.getSelectedSurfaceBaseCurve()"
        :title="`Base curve: ${selectedSurfaceType}`"
        @update:curve="handleCurveUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.layout {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.viewport-wrapper {
  position: relative;
  height: 100%;
}

.ui-layer {
  position: absolute;
  z-index: 10;
  pointer-events: none;
}

.ui-layer :deep(*) {
  pointer-events: auto;
}

.layout > .ui-layer:first-child {
  top: 0;
  left: 0;
}

.cube-wrapper {
  top: 10px;
  right: 10px;
}

.scene-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Панель редактора базовой кривой */
.curve-editor-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 2px solid #e5e7eb;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 20;
  height: 350px;
  max-height: 50vh;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 1200px) {
  .curve-editor-panel {
    height: 250px;
  }
}
</style>



