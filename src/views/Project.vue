<script setup>
import { useRoute, useRouter } from 'vue-router';
import { useProjectsStore } from '@/stores/projectsStore';
import { useEditorStore } from '@/stores/editorStore';
import EditorLayout from '@/components/editor/EditorLayout.vue';
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry';
import { onMounted, onUnmounted, ref, nextTick } from 'vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectsStore();
const editorStore = useEditorStore();

const projectId = route.params.id;
const isLoading = ref(true);
const project = ref(null);
const projectData = ref(null);

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
</script>

<template>
  <div style="width: 100%; height: 100vh;">
    <div v-if="isLoading" style="padding: 20px;">
      Загрузка проекта...
    </div>

    <div v-else>
      <div style="position: absolute; top: 10px; left: 10px; z-index: 100;">
        <button @click="goBack">Назад к проектам</button>
        <button @click="saveProject">Сохранить проект</button>
        <h2>{{ project.name }}</h2>
      </div>

      <EditorLayout />
    </div>
  </div>
</template>