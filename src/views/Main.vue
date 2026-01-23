<script setup>
import Scene from '@/components/editor/Scene.vue';
</script>


<template>
  <h1>Главная страница</h1>

  <p>3D-редактор</p>
  <div class="editor-wrapper">
    <Scene/>      
  </div>

</template>


<style scoped>
.editor-wrapper {
  width: 100%;
  height: 70vh;
}
</style>