<script setup>
import SceneViewport from './SceneViewport.vue'
import EditorToolbar from './EditorToolbar.vue'
</script>

<template>
  <div class="layout">
    <EditorToolbar class="ui-layer" />
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
  top: 0;
  left: 0;
  z-index: 10;
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