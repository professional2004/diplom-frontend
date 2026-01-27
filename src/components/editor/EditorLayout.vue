<script setup>
import SceneViewport from './SceneViewport.vue'
import EditorToolbar from './EditorToolbar.vue'
import ViewCube from './ViewCube.vue'
import UnfoldViewport from './UnfoldViewport.vue'
import PropertiesPanel from './PropertiesPanel.vue'
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

      <div class="properties-wrapper ui-layer">
        <PropertiesPanel />
      </div>
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
  grid-template-columns: 1fr 1fr; /* Разделение 50/50 */
  overflow: hidden;
  position: relative;
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

/* Позиционирование тулбара */
.layout > .ui-layer:first-child {
  top: 0;
  left: 0;
}

/* Позиционирование куба */
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

/* Панель свойств справа */
.properties-wrapper {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 280px;
  max-height: 550px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>


