<script setup>
import Scene3DViewport from './scenes/Scene3DViewport.vue'
import Scene2DViewport from './scenes/Scene2DViewport.vue'
import ViewCubeGizmo from './utils/ViewCubeGizmo.vue'
import ToolbarPanel3D from './panels/ToolbarPanel3D.vue'
import ToolbarPanel2D from './panels/ToolbarPanel2D.vue'
import ToolbarBoard from './boards/ToolbarBoard.vue'
import ShapeChangeBoard from './boards/ShapeChangeBoard.vue' 
import { useEditorStore } from '@/stores/editorStore'

const store = useEditorStore()
</script>


<template>
  <div class="vertical-layout">

    <div class="wrapper in-height">
      <ToolbarBoard class="ui-layer" />
    </div>
    <div class="horizontal-layout">
      <div class="wrapper">
        <Scene3DViewport class="scene-layer" />
        <div class="cube-wrapper ui-layer">
          <ViewCubeGizmo />
        </div>
        <div class="ui-layer">
          <ToolbarPanel3D />
        </div>
      </div>
      <div class="wrapper">
        <Scene2DViewport />
        <div class="ui-layer">
          <ToolbarPanel2D />
        </div>
      </div>
      <div class="wrapper scrolled">
        <div class="ui-layer" v-if="store.selectedShape">
          <ShapeChangeBoard />
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
@import '@/styles/main.css'; 


.vertical-layout {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.horizontal-layout {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
}

.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  border: 1px solid #222222;
}

.wrapper.in-height {
  height: fit-content;
  min-height: fit-content;
}

.wrapper.scrolled {
  overflow: auto;
}

canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.ui-layer {
  z-index: 10;
  pointer-events: none;
}

.ui-layer :deep(*) {
  pointer-events: auto;
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