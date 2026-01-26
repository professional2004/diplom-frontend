<script setup>
import SceneViewport from './SceneViewport.vue'
import EditorToolbar from './EditorToolbar.vue'
import ViewCube from './ViewCube.vue'
import UnfoldViewport from './UnfoldViewport.vue'
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
</style>


