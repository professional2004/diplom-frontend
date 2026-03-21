<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEditorStore } from '@/stores/editorStore'
import { useProjectsStore } from '@/stores/projectsStore';
import { useNotificationStore } from '@/stores/notificationsStore'
import { storeToRefs } from 'pinia';

const route = useRoute();
const router = useRouter();
const editorStore = useEditorStore()
const projectStore = useProjectsStore();
const notificationStore = useNotificationStore()

const projectId = route.params.id;
const container2D = ref(null)
const container3D = ref(null)
const containerMini = ref(null)

const project = ref(null);
const projectData = ref(null);

const isLoading = ref(true);
const openedEditorSection = ref('project');

// переменные из store
const { is_unsaved } = storeToRefs(editorStore);
const { scene3DState, scene2DState, sceneMiniState } = storeToRefs(editorStore);
const { details } = storeToRefs(editorStore);


onMounted(async () => {
  try {
    editorStore.createEngine(container2D.value, container3D.value, containerMini.value);
    project.value = await projectStore.fetchProject(projectId);
    let rawData = project.value.projectData;
    if (rawData) {
      if (typeof rawData === 'string') {
        try {
          projectData.value = JSON.parse(rawData);
        } catch (e) {
          console.warn('Не удалось распарсить projectData, используем пустой проект', e);
          projectData.value = null;
        }
      } else if (typeof rawData === 'object') {
        projectData.value = rawData;
      }
    }
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка загрузки проекта'})
    router.push('/app');
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
    });
    isLoading.value = false;
  }
});


onUnmounted(() => {
  editorStore.disposeEngine()
});


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
};


const goBack = () => {
  router.push('/app');
};

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
            </div>
            <div class="ui-layer detailsPanel3D">
              <div v-for="detail in details" :key="detail.id">
                <span style="font-size: 9px;">detail {{ detail.id }}</span>
                <div v-for="surface of detail.surfaces" :key="surface.id">
                  <span style="font-size: 9px;">surface {{ surface.id }}</span>
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
        </div>
      </div>

      <div class="section -unfoldings" v-show="openedEditorSection === 'unfoldings'">
        
      </div>

      <div class="section -about" v-show="openedEditorSection === 'about'">
          о проекте
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

</style>