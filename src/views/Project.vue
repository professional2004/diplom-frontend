<script setup>
import { onMounted, onUnmounted, ref, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEditorStore } from '@/stores/editorStore'
import { useProjectsStore } from '@/stores/projectsStore';
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry';
import Scene3DViewport from '@/components/editor/3D_scene/Scene3DViewport.vue'
import Scene2DViewport from '@/components/editor/2D_scene/Scene2DViewport.vue'
import ShapeChangeBoard from '@/components/editor/3D_toolbar/3DToolbarBoard.vue'
import PageHeader from '@/components/page_parts/PageHeader.vue';

const route = useRoute();
const router = useRouter();
const editorStore = useEditorStore()
const projectStore = useProjectsStore();

const projectId = route.params.id;
const isLoading = ref(true);
const project = ref(null);
const projectData = ref(null);
const openedEditorSection = ref('project');

function applyProjectData(data) {
  if (data && data.shapes) {
    if (EngineRegistry.engine3D && EngineRegistry.engine2D) {
      EngineRegistry.deserializeProject(data);
    } else {
      // дождёмся готовности движков
      EngineRegistry.emitter.on('engines:ready', () => EngineRegistry.deserializeProject(data));
    }
  } else {
    // пустой проект
    if (EngineRegistry.engine3D || EngineRegistry.engine2D) {
      EngineRegistry.clearProject();
    } else {
      EngineRegistry.emitter.on('engines:ready', () => EngineRegistry.clearProject());
    }
  }
}

onMounted(async () => {
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
          console.warn('Project.vue: не удалось распарсить projectData, используем пустой проект', e);
          projectData.value = null;
        }
      } else if (typeof raw === 'object') {
        projectData.value = raw;
      }
    }
  } catch (error) {
    // ошибка только при запросе проекта
    alert('Ошибка загрузки проекта: ' + error.message);
    router.push('/app');
  } finally {
    isLoading.value = false;
    // после того как интерфейс отрендерился (EditorLayout может появиться)
    nextTick(() => applyProjectData(projectData.value));
  }
});

onUnmounted(() => {
  // Полностью очистить движки при уходе со страницы проекта
  EngineRegistry.dispose();
});

const saveProject = async () => {
  try {
    const projectData = EngineRegistry.serializeProject();
    const preview = null;
    await projectStore.saveProject(projectId, projectData, preview);
    alert('Проект сохранен!');
  } catch (error) {
    alert('Ошибка сохранения: ' + error.message);
  }
};

const goBack = () => {
  router.push('/app');
};

// Вычисляемое свойство для проверки наличия выбранной фигуры
const hasSelection = computed(() => {
  return editorStore.selectedShape !== null
})
</script>

<template>
  <div style="display: flex; flex-direction: column; width: 100%;">
    <div v-if="isLoading" style="padding: 20px;">
      Загрузка проекта...
    </div>

    <div v-else>
      <div class="header">
        <div class="wrapper">
          <img class="image -logo" src="../materials/images/logo.svg"></img>
          <div class="text -project-name">Проект: {{ project.name }}</div>
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
          <button :disabled="!hasSelection" @click="editorStore.deleteShape" title="Delete (Del)">Delete</button>
          <button :disabled="!editorStore.canUndo" @click="editorStore.undo" title="Undo (Ctrl+Z)">Undo</button>
          <button :disabled="!editorStore.canRedo" @click="editorStore.redo" title="Redo (Ctrl+Shift+Z)">Redo</button>
          <button @click="editorStore.addShape('conical')">Add Conical Surface</button>
          <button @click="editorStore.addShape('cylindrical')">Add Cylindrical Surface</button>
          <button @click="editorStore.addShape('flat')">Add Flat Surface</button>
        </div>
        <div class="wrapper -horizontal-layout">
          <div class="wrapper">
            <Scene3DViewport class="scene-layer"/>
          </div>
          <div class="wrapper -scrollable">
            <div v-if="editorStore.selectedShape">
              <ShapeChangeBoard />
            </div>
          </div>            
        </div>
      </div>

      <div class="section -unfoldings" v-show="openedEditorSection === 'unfoldings'">
        <div class="wrapper">
          <Scene2DViewport class="scene-layer"/>
        </div>
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
@import '@/styles/main.css'; 

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