<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editorStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useNotificationStore } from '@/stores/notificationsStore'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const editorStore = useEditorStore()
const projectStore = useProjectsStore()
const notificationStore = useNotificationStore()

const projectId = route.params.id
const container2D = ref(null)
const container3D = ref(null)
const containerMini = ref(null)

const project = ref(null)
const projectData = ref(null)

const isLoading = ref(true);
const openedEditorSection = ref('project');

const materialNameMap = ref({})
const showColorPicker = ref(null)
const colorPickerStyle = ref({ top: '0px', left: '0px' })
const colorPickerHSV = reactive({ h: 0, s: 1, v: 1 })
const colorPickerPoint = reactive({ x: 0, y: 0 })
const isDraggingColorPoint = ref(false)
const colorPickerSize = { width: 160, height: 120 }

// переменные из store
const { is_unsaved } = storeToRefs(editorStore)
const { scene3DState, scene2DState, sceneMiniState } = storeToRefs(editorStore)
const { details } = storeToRefs(editorStore)
const { materials } = storeToRefs(editorStore)

const scene3DSelectionType = computed({
  get() {
    return editorStore.scene3DSettings?.selectingMode ?? 'detail'
  },
  set(mode) {
    editorStore.setScene3DSettings({
      ...editorStore.scene3DSettings,
      selectingMode: mode
    })
  }
})


onMounted(async () => {
  try {
    editorStore.createEngine(container2D.value, container3D.value, containerMini.value)
    project.value = await projectStore.fetchProject(projectId)
    let rawData = project.value.projectData
    if (rawData) {
      if (typeof rawData === 'string') {
        try {
          projectData.value = JSON.parse(rawData)
        } catch (e) {
          console.warn('Не удалось распарсить projectData, используем пустой проект', e)
          projectData.value = null
        }
      } else if (typeof rawData === 'object') {
        projectData.value = rawData
      }
    }
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка загрузки проекта'})
    router.push('/app')
  } finally {
    editorStore.deserializeProject({
      id: project.value.id,
      name: project.value.name,
      description: project.value.description,
      project_data: projectData.value,
      created_at: project.value.created_at,
      updated_at: project.value.updated_at,
      category_id: project.value.category_id,
      user_id: project.value.user_id
    })
    isLoading.value = false
  }
})


onUnmounted(() => {
  editorStore.disposeEngine()
})


const saveProject = async () => {
  try {
    const projectData = editorStore.serializeProject();
    const preview = editorStore.generateProjectPreview();
    await projectStore.saveProject(projectId, projectData, preview);
    editorStore.setIsUnsaved(false)
    notificationStore.show({type: 'success', message: 'Проект сохранен'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка сохранения проекта: ' + error})
    throw error
  }
}


const goBack = () => {
  router.push('/app');
}


// создать материал
const createMaterial = () => {
  editorStore.createMaterial()
}

const setMaterialName = (id, value) => {
  materialNameMap.value[id] = value
}

const onMaterialNameBlur = (material) => {
  const newName = materialNameMap.value[material.id]?.trim()
  if (newName && newName !== material.name) {
    renameMaterial(material.id, newName)
  }
}

// переименовать материал
const renameMaterial = (id, name) => {
  editorStore.renameMaterial(id, name)
}

const hexToRgb = (hex) => {
  const normalized = hex.replace(/^#/, '').padStart(6, '0').slice(0, 6)
  const num = parseInt(normalized, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

const rgbToHex = (r, g, b) => {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `${toHex(r)}${toHex(g)}${toHex(b)}`
}

const rgbToHsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return { h, s, v }
}

const hsvToRgb = (h, s, v) => {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r1 = 0, g1 = 0, b1 = 0
  if (h < 60) [r1, g1, b1] = [c, x, 0]
  else if (h < 120) [r1, g1, b1] = [x, c, 0]
  else if (h < 180) [r1, g1, b1] = [0, c, x]
  else if (h < 240) [r1, g1, b1] = [0, x, c]
  else if (h < 300) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  }
}

const updateColorFromHSV = (materialId) => {
  if (!materialId) return
  const { r, g, b } = hsvToRgb(colorPickerHSV.h, colorPickerHSV.s, colorPickerHSV.v)
  changeMaterialColor(materialId, rgbToHex(r, g, b))
}

const openColorPicker = (material, event) => {
  showColorPicker.value = material.id
  const rect = event.currentTarget.getBoundingClientRect()
  const parentRect = event.currentTarget.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 }
  colorPickerStyle.value = {
    left: `${rect.right - parentRect.left + 6}px`,
    top: `${rect.top - parentRect.top}px`
  }
  const rgb = hexToRgb(material.color)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  colorPickerHSV.h = hsv.h
  colorPickerHSV.s = hsv.s
  colorPickerHSV.v = hsv.v
  colorPickerPoint.x = hsv.s * colorPickerSize.width
  colorPickerPoint.y = (1 - hsv.v) * colorPickerSize.height
  isDraggingColorPoint.value = false
  setColorFromPicker(material.id)
}

const setColorFromPicker = (materialId) => {
  if (!materialId) return
  updateColorFromHSV(materialId)
}

const setColorFromPoint = (event, materialId) => {
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const x = Math.max(0, Math.min(colorPickerSize.width, event.clientX - rect.left))
  const y = Math.max(0, Math.min(colorPickerSize.height, event.clientY - rect.top))
  colorPickerPoint.x = x
  colorPickerPoint.y = y
  colorPickerHSV.s = x / colorPickerSize.width
  colorPickerHSV.v = 1 - y / colorPickerSize.height
  updateColorFromHSV(materialId)
}

const onColorMapMouseDown = (event, materialId) => {
  isDraggingColorPoint.value = true
  setColorFromPoint(event, materialId)
}

const onColorMapMouseMove = (event, materialId) => {
  if (!isDraggingColorPoint.value || showColorPicker.value !== materialId) return
  setColorFromPoint(event, materialId)
}

const onColorMapMouseUp = () => {
  isDraggingColorPoint.value = false
}

const closeColorPicker = () => {
  showColorPicker.value = null
  isDraggingColorPoint.value = false
}

// изменить цвет материала
const changeMaterialColor = (id, color) => {
  editorStore.changeMaterialColor(id, color)
}

// удалить материал
const deleteMaterial = (id) => {
  editorStore.deleteMaterial(id)
  if (materialNameMap.value[id]) delete materialNameMap.value[id]
  if (showColorPicker.value === id) showColorPicker.value = null
}



</script>

<template>
  <div style="display: flex; flex-direction: column; width: 100%;">
    <div class="loading-overlay" v-if="isLoading">
      Загрузка проекта...
    </div>

    <div>
      <div class="header">
        <div class="wrapper">
          <img class="image -logo" src="../materials/images/logo.svg"></img>
          <div class="text -project-name">Проект: {{ project?.name }}</div>
        </div>
        <div class="wrapper">
          <button :class="['button', '-save', { 'unsaved_changes': is_unsaved }]" @click="saveProject">Сохранить изменения</button>
          <button class="button" @click="editorStore.exportProjectUnfoldingsSVG()">Экспорт в SVG</button>
          <button class="button" @click="editorStore.exportProjectUnfoldingsPDF()">Экспорт в PDF</button>
          <button class="button -back" @click="goBack">Назад</button>
        </div>
      </div>

      <div class="project-menu">
        <label><input type="radio" value="project" name="radio-project-menu" v-model="openedEditorSection" checked/> Проект</label>
        <label><input type="radio" value="unfoldings" name="radio-project-menu" v-model="openedEditorSection"/> Развертка</label>
        <label><input type="radio" value="about" name="radio-project-menu" v-model="openedEditorSection"/> О проекте</label>
        <label><input type="radio" value="help" name="radio-project-menu" v-model="openedEditorSection"/> Помощь</label>
      </div>



      <div class="section -project" v-show="openedEditorSection === 'project'">
        <div class="editor-menu">
          <button @click="editorStore.addDetail('straight_random')">Добавить деталь "прямая произвольная"</button>
          <button @click="editorStore.clearProject()">Очистить проект</button>
        </div>
        <div class="wrapper -horizontal-layout">
          <div class="wrapper">
            <!-- 3D-сцена -->
            <div class="scene-layer">
              <div ref="container3D" class="viewport"></div>
            </div>
            <div class="ui-layer scenetoolbar scenetoolbar3D">
              <button @click="editorStore.zoomIn3D()">zoom-in</button>
              <button @click="editorStore.zoomOut3D()">zoom-out</button>
              <button @click="editorStore.resetView3D()">zoom-reset</button>
                    <div>
                      <label>
                        <input type="radio" value="detail" v-model="scene3DSelectionType" /> детали
                      </label>
                      <label>
                        <input type="radio" value="surface" v-model="scene3DSelectionType" /> поверхности
                      </label>
                    </div>
            </div>
            <div class="ui-layer detailsPanel3D">
              <div v-for="detail in details" :key="detail.id">
                <span style="font-size: 9px;">{{ detail.category }} - {{ detail.id }}</span>
                <div v-for="surface of detail.surfaces" :key="surface.id">
                  <span style="font-size: 9px;">{{ surface.category }} - {{ surface.id }}</span>
                </div>   
              </div>
            </div>
            <div class="ui-layer actionsPanel" style="position: absolute; bottom: 5px; left: 5px;">
              <span style="font-size: 9px;">scene3DState {{ JSON.stringify(scene3DState.pointeredThing) }}<br></span>
              <span style="font-size: 9px;">scene2DState {{ JSON.stringify(scene2DState.pointeredThing) }}<br></span>
              <span style="font-size: 9px;">sceneMiniState {{ JSON.stringify(sceneMiniState.pointeredThing) }}<br></span>
              <span style="font-size: 9px;">scene3DState selected {{ JSON.stringify(scene3DState.selectedThing) }}<br></span>
              <span style="font-size: 9px;">scene2DState selected {{ JSON.stringify(scene2DState.selectedThing) }}<br></span>
            </div>
          </div>
          <!-- 2D-сцена -->
          <div class="wrapper">
            <div class="scene-layer">
              <div ref="container2D" class="viewport"></div>
            </div>
            <div class="ui-layer scenetoolbar scenetoolbar2D">
              <button @click="editorStore.zoomIn2D()">zoom-in</button>
              <button @click="editorStore.zoomOut2D()">zoom-out</button>
              <button @click="editorStore.resetView2D()">zoom-reset</button>
            </div>
          </div>
          <!-- мини-сцена -->
          <div class="wrapper">
            <div class="scene-layer">
              <div ref="containerMini" class="viewport"></div>
            </div>
          </div> 
          <div class="wrapper">

          </div>       
        </div>
      </div>

      <div class="section -unfoldings" v-show="openedEditorSection === 'unfoldings'">
        
      </div>

      <div class="section -about" v-show="openedEditorSection === 'about'">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>о проекте</span>
          <button @click="createMaterial()">Создать материал</button>
        </div>

        <div class="materials-wrapper" style="position: relative; margin-top: 12px;">
          <div v-for="material of materials" :key="material.id" class="material-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <input
              type="text"
              :value="materialNameMap[material.id] || material.name"
              @input="event => setMaterialName(material.id, event.target.value)"
              @blur="() => onMaterialNameBlur(material)"
              style="padding: 4px 6px; border: 1px solid #ccc; border-radius: 3px; min-width: 140px;"
            />
            <button
              class="color-btn"
              :style="{ width: '24px', height: '24px', padding: 0, border: '1px solid #888', backgroundColor: '#' + material.color, cursor: 'pointer' }"
              @click="event => openColorPicker(material, event)"
              title="Цвет материала"
            >
            </button>
            <span style="font-size: 12px; color: #444;">#{{ material.color }}</span>
            <button @click="() => deleteMaterial(material.id)" style="padding: 4px 8px;">Удалить</button>

            <div v-if="showColorPicker === material.id" :style="{ position: 'absolute', top: colorPickerStyle.top, left: colorPickerStyle.left, zIndex: 50, padding: '10px', border: '1px solid #bbb', borderRadius: '5px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.25)' }">
              <div
                class="color-map"
                :style="{
                  width: colorPickerSize.width + 'px',
                  height: colorPickerSize.height + 'px',
                  position: 'relative',
                  cursor: 'crosshair',
                  background: `linear-gradient(to right, #fff, hsl(${colorPickerHSV.h}, 100%, 50%)), linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))`
                }"
                @mousedown="event => onColorMapMouseDown(event, material.id)"
                @mousemove="event => onColorMapMouseMove(event, material.id)"
                @mouseup="onColorMapMouseUp"
                @mouseleave="onColorMapMouseUp"
              >
                <div
                  :style="{
                    position: 'absolute',
                    left: colorPickerPoint.x + 'px',
                    top: colorPickerPoint.y + 'px',
                    width: '14px',
                    height: '14px',
                    transform: 'translate(-50%, -50%)',
                    border: '2px solid #fff',
                    borderRadius: '50%',
                    boxShadow: '0 0 2px rgba(0,0,0,.7)',
                    backgroundColor: 'transparent'
                  }"
                ></div>
              </div>
              <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                <input type="range" min="0" max="360" v-model.number="colorPickerHSV.h" @input="() => setColorFromPicker(material.id)" style="width: 140px" />
                <span style="font-size: 12px; width: 32px;">{{ Math.round(colorPickerHSV.h) }}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                <div :style="{ width: '26px', height: '26px', border: '1px solid #aaa', backgroundColor: '#' + rgbToHex(...Object.values(hsvToRgb(colorPickerHSV.h, colorPickerHSV.s, colorPickerHSV.v))) }"></div>
                <span style="font-size: 12px;">#{{ rgbToHex(...Object.values(hsvToRgb(colorPickerHSV.h, colorPickerHSV.s, colorPickerHSV.v))) }}</span>
                <button @click="closeColorPicker" style="margin-left: auto; padding: 2px 6px; font-size: 12px;">Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section -help" v-show="openedEditorSection === 'help'">
        помощь
      </div>

    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 20;
  pointer-events: none;
}

/* header */
.header {
  display: flex;
  justify-content: space-between;
  background-color: #e7f1f1;
  height: 60px;
  padding-left: 15px;
  padding-right: 15px;
}
.header .wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header .image.-logo {
  width: 45px;
}
.header .text.-project-name {
  font-size: 24px;
}
.header .button.-save {
  height: fit-content;
}
.header .button.-save.unsaved_changes { background-color: #d3d0ab; }

/* project-menu */
.project-menu {
  height: 80px;
}

/* sections */
.viewport { 
  width: 100%; 
  height: 100%; 
  overflow: hidden; 
}

.section {
  position: relative;
  width: 100%;
  height: calc(100vh - 60px - 80px);
  display: flex;
  flex-direction: column;
}

.section .wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.section .wrapper.-horizontal-layout {
  display: flex;
}

.section .wrapper.-scrollable {
  overflow-y: auto;
}


.section.-project .editor-menu {
  height: 80px;
}

.section canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.ui-layer { z-index: 10; }


.scene-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.scenetoolbar {
  position: absolute;
  background-color: #ffffff;
  top: 0px;
  left: 10px;
}


/* ---------------- панели ---------------- */



.detailsPanel3D {
  position: absolute;
  right: 10px;
  top: 10px;
  width: fit-content;
  height: fit-content;
  padding: 5px;
  background-color: #ffffff;
  border-radius: 5px;
}


/* материалы */





</style>