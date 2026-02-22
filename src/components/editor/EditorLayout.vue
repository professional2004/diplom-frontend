<script setup>
import Scene3D from './scenes/Scene3DViewport.vue'
import Scene2D from './scenes/Scene2DViewport.vue'
import ViewCube from './utils/ViewCubeGizmo3D.vue'
import EditorToolbar from './panels/EditorToolbar.vue'
import ParamPanel from './panels/ParamPanel.vue'
</script>


<template>
  <div class="layout">
    <EditorToolbar class="ui-layer" />
    
    <div class="main-container">
      <div class="viewport-wrapper">
        <Scene3D class="scene-layer" />
        <div class="cube-wrapper ui-layer">
          <ViewCube />
        </div>
        <div class="param-panel-wrapper ui-layer" style="left:10px; bottom:10px;">
          <ParamPanel />
        </div>
      </div>

      <div class="viewport-wrapper">
        <Scene2D />
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
}


.viewport-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
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
</style>


