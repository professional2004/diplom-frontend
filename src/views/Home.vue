<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useProjectsStore } from '@/stores/projectsStore';
import PageHeader from '@/components/page_parts/PageHeader.vue';

const router = useRouter();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();

onMounted(async () => {
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    alert('Ошибка загрузки проектов: ' + error.message);
  }
});

const logout = async () => {
  try {
    await authStore.logout();
  } catch {
    alert('Ошибка выхода из аккаунта')
  }
};

const deleteAccount = async () => {
  try {
    await authStore.deleteAccount();
    router.push('/login');
  } catch (err) {
    alert("Не удалось удалить аккаунт: " + err.message);
  }
};

const openProject = (project) => {
  router.push(`/project/${project.id}`);
};

const deleteProject = async (project) => {
  if (!confirm(`Удалить проект "${project.name}"?`)) return;
  try {
    await projectsStore.deleteProject(project.id);
    await projectsStore.fetchProjectsAndCategories();
    alert('Проект удалён');
  } catch (error) {
    alert('Ошибка удаления проекта: ' + error.message);
  }
};

const renameProject = async (project) => {
  const newName = prompt('Введите новое название проекта:', project.name);
  if (!newName || newName === project.name) return;
  try {
    await projectsStore.renameProject(project.id, newName);
  } catch (error) {
    console.log('Ошибка переименования: ' + error.message);
  }
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
};

const changeProjectCategory = async (project) => {
  if (projectsStore.categories.length === 0) {
    alert('Нет доступных категорий');
    return;
  }
  const categoryOptions = projectsStore.categories.map(c => c.name).join('\n');
  const categoryName = prompt(`Выберите новую категорию:\n${categoryOptions}`);
  const category = projectsStore.categories.find(c => c.name === categoryName);
  if (!category || category.id === project.categoryId) return;
  try {
    await projectsStore.changeProjectCategory(project.id, category.id);
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    alert('Ошибка изменения категории: ' + error.message);
  }
};

const addCategory = async () => {
  const name = prompt('Введите название категории:');
  if (!name) return;
  const description = prompt('Введите описание категории:');
  try {
    await projectsStore.createCategory({ name, description });
    await projectsStore.fetchProjectsAndCategories(); // Перезагрузить
    alert('Категория добавлена');
  } catch (error) {
    alert('Ошибка добавления категории: ' + error.message);
  }
};

const createNewProject = async () => {
  const name = prompt('Введите название проекта:');
  if (!name) return;

  // prompt returns null if cancelled
  const description = prompt('Введите описание проекта:') || '';
  let project = null;

  try {
    project = await projectsStore.createProject(name, description);
  } catch (error) {
    alert('Ошибка создания проекта: ' + error.message);
  }

  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    alert('Ошибка загрузки проектов: ' + error.message);
  }

  if (project && project.id) {
    router.push(`/project/${project.id}`);
  } else {
    alert('Ошибка: не удалось получить ID нового проекта');
  }
};
</script>


<template>
  <div>
    <PageHeader/>
    
    
    <h1>Мои проекты</h1>

    <button @click="createNewProject">Создать новый проект</button>
    <button @click="addCategory">Добавить категорию проектов</button>
    <button @click="logout">Выйти из аккаунта</button>
    <button @click="deleteAccount">Удалить аккаунт</button>

    <div v-if="projectsStore.isLoading">Загрузка проектов...</div>

    <div v-else-if="projectsStore.projects.length === 0">
      <p>У вас нет проектов. Создайте новый!</p>
    </div>

    <div v-else>
      <div v-for="project in projectsStore.projects" :key="project.id" class="project-card">
        <div @click="openProject(project)" style="cursor: pointer;">
          <h3>{{ project.name }}</h3>
          <p>{{ project.description }}</p>
          <small>Создан: {{ new Date(project.createdAt).toLocaleDateString() }}</small>
        </div>
        <div>
          <button @click="renameProject(project)">Переименовать</button>
          <button @click="changeProjectCategory(project)">Изменить категорию</button>
          <button @click="deleteProject(project)">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/main.css'; 

.project-card {
  border: 1px solid #222222;
}
</style>