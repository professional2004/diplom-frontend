<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEditorStore } from '@/stores/editorStore'
import { useProjectsStore } from '@/stores/projectsStore';
import { useNotificationStore } from '@/stores/notificationsStore'

const route = useRoute();
const router = useRouter();
const editorStore = useEditorStore()
const projectStore = useProjectsStore();
const notificationStore = useNotificationStore()

const projectId = route.params.id;
const container2D = ref(null)
const container3D = ref(null)

const project = ref(null);
const projectData = ref(null);

const isLoading = ref(true);

const openedEditorSection = ref('project');

function applyProjectData(data) {
  editorStore.deserializeProject(data);
}

onMounted(async () => {
  editorStore.createEngine(container2D.value, container3D.value);

  try {
    project.value = await projectStore.fetchProject(projectId);

    // Подготовить данные для десериализации (без выполнения)
    let raw = project.value.projectData;
    if (raw) {
      if (typeof raw === 'string') {
        try {
          projectData.value = JSON.parse(raw);
          editorStore.editorSettings.openSection = 'project'
        } catch (e) {
          notificationStore.show({type: 'error', message: 'Не удалось распарсить projectData: ' + error})
          projectData.value = null;
        }
      } else if (typeof raw === 'object') {
        projectData.value = raw;
      }
    }
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка загрузки проекта: ' + error})
    router.push('/app');
  } finally {
    isLoading.value = false;
    applyProjectData(projectData.value);
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
    notificationStore.show({type: 'success', message: 'Проект сохранен'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка сохранения проекта: ' + error})
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
          <button class="button -save" @click="saveProject">Сохранить изменения</button>
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

        </div>
        <div class="wrapper -horizontal-layout">
          <div class="wrapper">
            <!-- 3D-сцена -->
            <div class="scene-layer">
              <div ref="container3D" class="viewport"></div>
            </div>
          </div>
          <!-- 2D-сцена -->
          <div class="wrapper">
            <div class="scene-layer">
              <div ref="container2D" class="viewport"></div>
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
@import '@/ui/styles/main.css'; 


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