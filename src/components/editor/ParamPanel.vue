<template>
  <div class="param-panel">
    <h3>Параметрические модели</h3>
    <div class="field"><label>Width</label><input type="number" v-model.number="params.width" /></div>
    <div class="field"><label>Height</label><input type="number" v-model.number="params.height" /></div>
    <div class="field"><label>Depth</label><input type="number" v-model.number="params.depth" /></div>
    <div class="field"><label>Radius</label><input type="number" v-model.number="params.radius" /></div>

    <div class="buttons">
      <button @click="add('cube')">Add Cube</button>
      <button @click="add('roundedPrism')">Add Rounded Prism</button>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const store = useEditorStore()

const params = reactive({ width: 2, height: 2, depth: 2, radius: 0.5 })

function add(type) {
  store.addShape(type, { ...params })
}
</script>

<style scoped>
.param-panel {
  background: rgba(255,255,255,0.95);
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  width: 220px;
}
.field {
  display:flex;
  justify-content:space-between;
  margin-bottom:6px;
}
.field label { margin-right:8px }
.buttons { display:flex; gap:8px; justify-content:flex-end }
button { padding:6px 8px }
</style>
