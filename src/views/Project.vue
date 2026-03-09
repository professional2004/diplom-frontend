<script setup>
import { useRoute, useRouter } from 'vue-router';
import { useProjectsStore } from '@/stores/projectsStore';
import { useEditorStore } from '@/stores/editorStore';
import EditorLayout from '@/components/editor/EditorLayout.vue';
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry';
import { onMounted, onUnmounted, ref } from 'vue';

const route = useRoute();
const router = useRouter();
const projects = useProjectsStore();
const editor = useEditorStore();

const projectId = route.params.id;
const isLoading = ref(true);
const project = ref(null);

onMounted(async () => {
  try {
    project.value = await projects.fetchProject(projectId);

    // Десериализовать проект
    if (project.projectData) {
      const projectData = JSON.parse(project.projectData);
      EngineRegistry.deserializeProject(projectData);
    }
  } catch (error) {
    alert('Ошибка загрузки проекта: ' + error.message);
    router.push('/app');
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  // Очистить проект при уходе
  EngineRegistry.clearProject();
});

const saveProject = async () => {
  try {
    const projectData = EngineRegistry.serializeProject();
    await projects.updateProject(projectId, {
      ...project.value,
      projectData: JSON.stringify(projectData)
    });
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