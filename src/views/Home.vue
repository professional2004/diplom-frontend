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

const createNewProject = async () => {
  const name = prompt('Введите название проекта:');
  if (!name) return;

  const description = prompt('Введите описание проекта:');

  // Выбрать категорию
  if (projects.categories.length === 0) {
    alert('Нет доступных категорий');
    return;
  }
  const categoryOptions = projects.categories.map(c => c.name).join('\n');
  const categoryName = prompt(`Выберите категорию:\n${categoryOptions}`);
  const category = projects.categories.find(c => c.name === categoryName);
  if (!category) {
    alert('Категория не найдена');
    return;
  }

  try {
    const newProject = await projects.createProject({
      name,
      description,
      categoryId: category.id,
      projectData: JSON.stringify({ shapes: [] }) // Пустой проект
    });
    router.push(`/project/${newProject.id}`);
  } catch (error) {
    alert('Ошибка создания проекта: ' + error.message);
  }
};
</script>


<template>
  <div>
    <h1>Мои проекты</h1>

    <button @click="createNewProject">Создать новый проект</button>
    <button @click="handleLogout">Выйти из аккаунта</button>
    <button @click="deleteAccount">Удалить аккаунт</button>

    <div v-if="projects.isLoading">Загрузка проектов...</div>

    <div v-else-if="projects.projects.length === 0">
      <p>У вас нет проектов. Создайте новый!</p>
    </div>

    <div v-else>
      <div v-for="project in projects.projects" :key="project.id" class="project-card" @click="openProject(project)">
        <h3>{{ project.name }}</h3>
        <p>{{ project.description }}</p>
        <small>Создан: {{ new Date(project.createdAt).toLocaleDateString() }}</small>
      </div>
    </div>
  </div>
</template>

