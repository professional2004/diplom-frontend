<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router';
import { useEditorStore } from '@/stores/editorStore'
import { useProjectsStore } from '@/stores/projectsStore'
import { useNotificationStore } from '@/stores/notificationsStore'

const props = defineProps({
  visible: { type: Boolean, default: false },
  project: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'close'])

const router = useRouter();
const editorStore = useEditorStore()
const projectsStore = useProjectsStore()
const notificationStore = useNotificationStore()

// Локальное состояние для анимации и видимости
const show = ref(props.visible)

// Локальные копии данных проекта для редактирования
const editedName = ref('')
const editedDescription = ref('')
const selectedCategoryId = ref(null)

// Следим за изменением props.visible и синхронизируем show
watch(() => props.visible, (val) => {
  show.value = val
  if (val) {
    document.addEventListener('keydown', handleEscape)
    // При открытии инициализируем поля данными из проекта
    if (props.project) {
      editedName.value = props.project.name || ''
      editedDescription.value = props.project.description || ''
      selectedCategoryId.value = props.project.categoryId || null
    }
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

// Следим за изменением проекта, когда модалка уже открыта
watch(() => props.project, (newProject) => {
  if (newProject) {
    editedName.value = newProject.name || ''
    editedDescription.value = newProject.description || ''
    selectedCategoryId.value = newProject.categoryId || null
  }
}, { deep: true })

// Закрытие модалки
const close = () => {
  emit('update:visible', false)
  emit('close')
}

// Обработчик Escape
const handleEscape = (e) => {
  if (e.key === 'Escape') close()
}

// Блокировка прокрутки body
watch(show, (val) => {
  if (val) {
    document.body.classList.add('modal-open')
  } else {
    document.body.classList.remove('modal-open')
  }
})

const openProject = () => {
  if (!props.project) return
  router.push(`/project/${props.project.id}`);
};


const deleteProject = async () => {
  if (!props.project) return
  try {
    await projectsStore.deleteProject(props.project.id);
    notificationStore.show({type: 'success', message: 'Проект удален'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка удаления проекта'})
    console.log('Ошибка удаления проекта: ' + error.message);
  }
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
  close()
};


const renameProject = async (project, newName) => {
  if (!newName || newName === project.name) return;
  try {
    await projectsStore.renameProject(project.id, newName);
    notificationStore.show({type: 'success', message: 'Проект переименован'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка переименования проекта'})
    console.log('Ошибка переименования: ' + error.message);
  }
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
};


const changeProjectCategory = async (project, categoryId) => {
  const category = projectsStore.categories.find(c => c.id === categoryId);
  if (!category) {
    notificationStore.show({type: 'error', message: 'Нет категории с таким ID!'})
    return;
  }
  try {
    await projectsStore.changeProjectCategory(project.id, category.id);
    notificationStore.show({type: 'success', message: 'Категория проекта изменена'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка изменения категории проекта'})
    console.log('Ошибка изменения категории: ' + error.message);
  }
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
};


const changeProjectDescription = async (project, description) => {
  try {
    await projectsStore.changeProjectDescription(project.id, description);
    notificationStore.show({type: 'success', message: 'Описание проекта изменено'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка изменения описания проекта'})
    console.log('Ошибка изменения описания проекта: ' + error.message);
  }
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
};



const duplicateProject = async () => {
  if (!props.project) return
  try {
    await projectsStore.duplicateProject(props.project.id);
    notificationStore.show({type: 'success', message: 'Проект дублирован'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка дублирования проекта'})
    console.log('Ошибка переименования: ' + error.message);
  }
  try {
    await projectsStore.fetchProjectsAndCategories();
  } catch (error) {
    console.log('Ошибка перезагрузки проектов: ' + error.message);
  }
  close()
};




const saveChanges = async () => {
  if (!props.project) return
  try {
    // Переименование, если изменилось название
    if (editedName.value !== props.project.name) {
      await renameProject(props.project, editedName.value)
    }
    // Метод обновления описания 
    if (editedDescription.value !== props.project.decsription) {
      await changeProjectDescription(props.project, editedDescription.value)
    }
    // Если изменилась категория
    if (selectedCategoryId.value !== props.project.categoryId) {
      await changeProjectCategory(props.project, selectedCategoryId.value)
    }
    notificationStore.show({type: 'success', message: 'Проект сохранен'})
  } catch (error) {
    notificationStore.show({type: 'error', message: 'Ошибка сохранения проекта'})
    console.log('Ошибка: ' + error.message)
  }
  close()
}

// экспорт лекал

const exportSVG = () => {
  editorStore.exportSVG()
};

const exportPDF = () => {
  editorStore.exportPDF()
};

// Очищаем обработчик при размонтировании
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>


<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <header class="modal-header">
            <slot name="header">
              <h3>Редактирование проекта</h3>
            </slot>
            <button class="close-btn" @click="close">&times;</button>
          </header>
          <main class="modal-content">
            <div v-if="project" class="edit-form">
              <div class="form-group">
                <label>Название</label>
                <input v-model="editedName" type="text" />
              </div>
              <div class="form-group">
                <label>Описание</label>
                <textarea v-model="editedDescription" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label>Категория</label>
                <select v-model="selectedCategoryId">
                  <option 
                    v-for="cat in projectsStore.categories" 
                    :key="cat.id" 
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
              </div>
            </div>
            <div v-else>
              <p>Проект не выбран</p>
            </div>
          </main>
          <footer class="modal-footer">
            <button class="btn-delete" @click="deleteProject">Удалить</button>
            <button class="btn-save" @click="duplicateProject">Дублировать</button>
            <button class="btn-save" @click="openProject">Открыть</button>
            <button class="btn-save" @click="saveChanges">Сохранить</button>
            <button class="btn-save" @click="exportSVG">Экспортировать SVG</button>
            <button class="btn-save" @click="exportPDF">Экспортировать PDF</button>
            <button  @click="close">Закрыть</button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-content {
  padding: 1rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #eee;
  text-align: right;
}

/* Анимации */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}


.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-weight: bold;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #eee;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-save {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
</style>