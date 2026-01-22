<script setup>
import { OrbitControls, Sky } from '@tresjs/cientos'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()
</script>

<template>
  <TresPerspectiveCamera :position="[10, 10, 10]"/>
  <OrbitControls/>

  <TresAmbientLight :intensity="0.5"/>
  <TresDirectionalLight :position="[5, 5, 5]" :intensity="1" cast-shadow/>
  <Sky/>

  <TresGridHelper :args="[20, 20]"/>
</template>