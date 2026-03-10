<script setup>
import { useAuthStore } from '@/stores/authStore';
import { useProjectsStore } from '@/stores/projectsStore';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

const auth = useAuthStore();
const projects = useProjectsStore();
const router = useRouter();

onMounted(async () => {
  try {
    await projects.fetchProjectsAndCategories();
  } catch (error) {
    alert('Ошибка загрузки проектов: ' + error.message);
  }
});

const handleLogout = async () => {
  try {
    await auth.logout();
  } catch {
    alert('Ошибка выхода из аккаунта')
  }
};

const deleteAccount = async () => {
  try {
    await auth.deleteAccount();
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
    await projects.deleteProject(project.id);
    await projects.fetchProjectsAndCategories();
    alert('Проект удалён');
  } catch (error) {
    alert('Ошибка удаления проекта: ' + error.message);
  }
};

const renameProject = async (project) => {
  const newName = prompt('Введите новое название проекта:', project.name);
  if (!newName || newName === project.name) return;
  try {
    await projects.renameProject(project.id, newName);
  } catch (error) {
    console.log('Ошибка переименования: ' + error.message);
  }
  try {
    await projects.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
};

const changeProjectCategory = async (project) => {
  if (projects.categories.length === 0) {
    alert('Нет доступных категорий');
    return;
  }
  const categoryOptions = projects.categories.map(c => c.name).join('\n');
  const categoryName = prompt(`Выберите новую категорию:\n${categoryOptions}`);
  const category = projects.categories.find(c => c.name === categoryName);
  if (!category || category.id === project.categoryId) return;
  try {
    await projects.changeProjectCategory(project.id, category.id);
    await projects.fetchProjectsAndCategories();
  } catch (error) {
    alert('Ошибка изменения категории: ' + error.message);
  }
};

const addCategory = async () => {
  const name = prompt('Введите название категории:');
  if (!name) return;
  const description = prompt('Введите описание категории:');
  try {
    await projects.createCategory({ name, description });
    await projects.fetchProjectsAndCategories(); // Перезагрузить
    alert('Категория добавлена');
  } catch (error) {
    alert('Ошибка добавления категории: ' + error.message);
  }
};

const createNewProject = async () => {
  const name = prompt('Введите название проекта:');
  if (!name) return;

  const description = prompt('Введите описание проекта:');
  let project = null

  try {
    const newProject = await projects.createProject({
      name: name,
      description: description
    });
    project = newProject
  } catch (error) {
    alert('Ошибка создания проекта: ' + error.message);
  }
  try {
    await projects.fetchProjectsAndCategories();
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
    <h1>Мои проекты</h1>

    <button @click="createNewProject">Создать новый проект</button>
    <button @click="addCategory">Добавить категорию проектов</button>
    <button @click="handleLogout">Выйти из аккаунта</button>
    <button @click="deleteAccount">Удалить аккаунт</button>

    <div v-if="projects.isLoading">Загрузка проектов...</div>

    <div v-else-if="projects.projects.length === 0">
      <p>У вас нет проектов. Создайте новый!</p>
    </div>

    <div v-else>
      <div v-for="project in projects.projects" :key="project.id" class="project-card">
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
.project-card {
  border: 1px solid #222222;
}
</style>