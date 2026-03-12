<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useProjectsStore } from '@/stores/projectsStore';
import { useNotificationStore } from '@/stores/notificationsStore'
import PageHeader from '@/components/page_parts/PageHeader.vue';
import HomePageProjectCard from '@/components/page_parts/HomePageProjectCard.vue';

const router = useRouter();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();
const notificationStore = useNotificationStore()

onMounted(async () => {
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка загрузки проектов: ' + error.message);
  }
});

const deleteAccount = async () => {
  try {
    await authStore.deleteAccount();
    router.push('/login');
    notificationStore.show({type: 'success', message: 'Аккаунт удален'})
  } catch (err) {
    console.log("Не удалось удалить аккаунт: " + err.message);
  }
};

const openProject = (project) => {
  router.push(`/project/${project.id}`);
};

const addCategory = async () => {
  const name = prompt('Введите название категории:');
  try {
    await projectsStore.createCategory(name);
    notificationStore.show({type: 'success', message: 'Категория добавлена'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка добавления категории'})
    console.log('Ошибка добавления категории: ' + error.message);
  }
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
};

const createNewProject = async () => {
  let project = null;

  try {
    project = await projectsStore.createProject('new-project', '');
    notificationStore.show({type: 'success', message: 'Проект создан'})
  } catch (error) {
    console.log('Ошибка создания проекта: ' + error.message);
  }

  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка загрузки проектов: ' + error.message);
  }

  if (project && project.id) {
    router.push(`/project/${project.id}`);
  } else {
    console.log('Ошибка: не удалось получить ID нового проекта');
  }
};



// Модалка

const selectedProject = ref(null);
const showModal = ref(false)

const openProjectModal = (project) => {
  selectedProject.value = project;
  showModal.value = true;
};

const onModalClose = () => {
  selectedProject.value = null;
  console.log('Модальное окно закрыто');
};
</script>


<template>
  <div>
    <PageHeader/>
    
    
    <h1>Мои проекты</h1>

    <button @click="createNewProject">Создать новый проект</button>
    <button @click="addCategory">Добавить категорию проектов</button>
    <button @click="deleteAccount">Удалить аккаунт</button>

    <div class="content" v-if="projectsStore.isLoading">
      <div class="categories">Загрузка категорий...</div>
      <div class="projects">Загрузка проектов...</div>
    </div>

    <div class="content" v-else>
      <div class="categories" v-if="projectsStore.categories.length === 0">
        У вас нет категорий
      </div>
      <div class="categories" v-else>
        <div v-for="category in projectsStore.categories" :key="category.id" class="category-card">
          <div>
            <h3>{{ category.name }}</h3>
          </div>
        </div>   
      </div>

      <div class="projects" v-if="projectsStore.projects.length === 0">
        <p>У вас нет проектов. Создайте новый!</p>
      </div>
      <div class="projects" v-else>
        <div v-for="project in projectsStore.projects" :key="project.id" class="project-card" @click="openProjectModal(project)">
          <div>
            <h3>{{ project.name }}</h3>
            <p>{{ project.description }}</p>
            <small>Создан: {{ new Date(project.createdAt).toLocaleDateString() }}</small><br>
            <small>Изменен: {{ new Date(project.updatedAt).toLocaleDateString() }}</small>
          </div>
          <div>
            <button @click="openProject(project)">Открыть</button>
          </div>
        </div>        
      </div>
    </div>

    <HomePageProjectCard v-model:visible="showModal" :project="selectedProject" @close="onModalClose"/>
  </div>
</template>

<style scoped>
@import '@/styles/main.css'; 

.content {
  display: flex;
}

.projects {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.project-card {
  border: 1px solid #222222;
  border-radius: 10px;
  cursor: pointer;
}
</style>