<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useProjectsStore } from '@/stores/projectsStore';
import { useNotificationStore } from '@/stores/notificationsStore'
import { GeneratePreviewHelper } from '@/editor_core/utils/project_helpers/GeneratePreviewHelper.js';
import PageHeader from '@/ui/components/page_parts/PageHeader.vue';
import HomePageProjectCard from '@/ui/components/page_parts/HomePageProjectCard.vue';

const router = useRouter();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();
const notificationStore = useNotificationStore()

// для управления сортировкой, фильтрацией и поиском
const searchQuery = ref('');
const searchType = ref('name');
const selectedCategoryId = ref(null);
const sortOption = ref('name_asc'); 

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
  const preview = GeneratePreviewHelper.help();
  try {
    project = await projectsStore.createProject('new-project', '', preview);
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


// для отображения категорий проектов
const categoryNames = computed(() => {
  const map = {};
  projectsStore.categories.forEach(category => {
    map[category.id] = category.name;
  });
  return map;
})


// Единое вычисляемое свойство для отображения списка проектов
// с фильтрацией, сортировкой и поиском
const processedProjects = computed(() => {
  let result = projectsStore.projects || [];

  // Фильтрация по категории
  if (selectedCategoryId.value !== null) {
    result = result.filter(p => p.categoryId === selectedCategoryId.value);
  }

  // Поиск по тексту
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p => {
      if (searchType.value === 'name') {
        return p.name && p.name.toLowerCase().includes(query);
      } else if (searchType.value === 'description') {
        return p.description && p.description.toLowerCase().includes(query);
      }
      return true;
    });
  }

  // Сортировка (создаем поверхностную копию, чтобы не мутировать исходник)
  result = [...result].sort((a, b) => {
    switch (sortOption.value) {
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'created_desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'created_asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'updated_desc':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case 'updated_asc':
        return new Date(a.updatedAt) - new Date(b.updatedAt);
      default:
        return 0;
    }
  });

  return result;
});



// Модалка
const selectedProject = ref(null);
const showModal = ref(false)

const openProjectModal = (project) => {
  selectedProject.value = project;
  showModal.value = true;
};

const onModalClose = () => {
  selectedProject.value = null;
};
</script>


<template>
  <div>
    <PageHeader/>
    
    
    <h1>Мои проекты</h1>

    <button @click="createNewProject">Создать новый проект</button>
    <button @click="addCategory">Добавить категорию проектов</button>
    <button @click="deleteAccount">Удалить аккаунт</button>


    <div style="margin: 20px 0;">
      <div>
        <input type="text" v-model="searchQuery" placeholder="Поиск проектов..." />
        <label>
          <input type="radio" value="name" v-model="searchType" /> По имени
        </label>
        <label>
          <input type="radio" value="description" v-model="searchType" /> По описанию
        </label>
      </div>

      <div style="margin-top: 10px;">
        <label>Сортировать: </label>
        <select v-model="sortOption">
          <option value="name_asc">По имени (А-Я)</option>
          <option value="created_desc">По дате создания (сначала новые)</option>
          <option value="created_asc">По дате создания (сначала старые)</option>
          <option value="updated_desc">По обновлению (сначала недавно измененные)</option>
          <option value="updated_asc">По обновлению (сначала давно измененные)</option>
        </select>
      </div>
    </div>


    <div class="content" v-if="projectsStore.isLoading">
      <div class="categories">Загрузка категорий...</div>
      <div class="projects">Загрузка проектов...</div>
    </div>

    <div class="content" v-else>
      <div class="categories" v-if="projectsStore.categories.length === 0">
        У вас нет категорий
      </div>
      <div class="categories" v-else>
        <div 
          @click="selectedCategoryId = null"
          :style="{ fontWeight: selectedCategoryId === null ? 'bold' : 'normal', cursor: 'pointer', marginBottom: '10px' }"
        >
          Все проекты
        </div>
        
        <div 
          v-for="category in projectsStore.categories" 
          :key="category.id" 
          class="category-card"
          @click="selectedCategoryId = category.id"
        >
          <div :style="{ fontWeight: selectedCategoryId === category.id ? 'bold' : 'normal', cursor: 'pointer' }">
            <h3>{{ category.name }}</h3>
          </div>
        </div>   
      </div>

      <div class="projects" v-if="processedProjects.length === 0">
        <p>Проекты не найдены.</p>
      </div>
      <div class="projects" v-else>
        <div v-for="project in processedProjects" :key="project.id" class="project-card" @click="openProjectModal(project)">
          <div class="project-preview">
            <img 
              v-if="project.previewUrl"
              :src="project.previewUrl" 
              alt="Превью сцены" 
              class="preview-img"/>
            <div v-else class="no-preview">Загрузка... или нет превью</div>
          </div>
          <div>
            <h3>{{ project.name }}</h3>
            <p>{{ project.description }}</p>
            <p>Категория: {{ categoryNames[project.categoryId] || '(нет категории)' }}</p>
            <small>Создан: {{ new Date(project.createdAt).toLocaleDateString() }}</small><br>
            <small>Изменен: {{ new Date(project.updatedAt).toLocaleDateString() }}</small>
          </div>
          <div>
            <button @click.stop="openProject(project)">Открыть</button>
          </div>
        </div>        
      </div>
    </div>

    <HomePageProjectCard v-model:visible="showModal" :project="selectedProject" @close="onModalClose"/>
  </div>
</template>

<style scoped>
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

.preview-img {
  width: 100%;
  height: 150px;
  object-fit: contain;
  background-color: #f8f9fa;
  border-radius: 4px;
}
.no-preview {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e9ecef;
  color: #6c757d;
}
</style>