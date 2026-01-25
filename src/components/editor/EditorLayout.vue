<script setup>
import SceneViewport from './SceneViewport.vue'
import EditorToolbar from './EditorToolbar.vue'
import ViewCube from './ViewCube.vue';
</script>


<template>
  <div class="layout">
    <EditorToolbar class="ui-layer" />
    <div class="cube-wrapper ui-layer">
      <ViewCube />
    </div>
    <SceneViewport class="scene-layer" />
  </div>
</template>


<style scoped>
.layout {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #e2e2e2;
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