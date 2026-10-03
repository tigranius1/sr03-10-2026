<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import api from '../services/api';

const savedFilter = localStorage.getItem('taskFilter') || 'all';
const savedSort = localStorage.getItem('taskSort') || 'default';
const savedCategoryFilter = localStorage.getItem('taskCategoryFilter') || 'all';

const tasks = ref([]);
const categories = ref([]);
const newTaskTitle = ref('');
const newTaskCategory = ref(''); // id категории для новой задачи
const errorMessage = ref('');
const successMessage = ref('');
const currentFilter = ref(savedFilter);
const currentSort = ref(savedSort);
const currentCategoryFilter = ref(savedCategoryFilter);

watch(currentFilter, (val) => localStorage.setItem('taskFilter', val));
watch(currentSort, (val) => localStorage.setItem('taskSort', val));
watch(currentCategoryFilter, (val) => localStorage.setItem('taskCategoryFilter', val));

const showError = (msg) => {
  errorMessage.value = msg;
  successMessage.value = '';
  setTimeout(() => (errorMessage.value = ''), 5000);
};

const showSuccess = (msg) => {
  successMessage.value = msg;
  errorMessage.value = '';
  setTimeout(() => (successMessage.value = ''), 3000);
};

const getErrorMessage = (error) => {
  if (!error.response) {
    return 'Ошибка сети: не удаётся подключиться к серверу. Проверьте соединение.';
  }
  const { status, data } = error.response;
  if (status === 400) {
    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      const firstErr = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
      return `Ошибка валидации: ${firstErr}`;
    }
    return 'Ошибка валидации: неверные данные.';
  }
  if (status >= 500) return 'Ошибка сервера (500). Попробуйте позже.';
  return `Ошибка запроса (${status}).`;
};

const fetchTasks = async () => {
  try {
    const response = await api.getTasks();
    tasks.value = response.data;
  } catch (error) {
    console.error('Ошибка загрузки задач:', error);
    showError(getErrorMessage(error));
  }
};

const fetchCategories = async () => {
  try {
    const response = await api.getCategories();
    categories.value = response.data;
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error);
    showError(getErrorMessage(error));
  }
};

const addTask = async () => {
  if (!newTaskTitle.value.trim()) {
    showError('Название задачи не может быть пустым');
    return;
  }
  try {
    const payload = {
      title: newTaskTitle.value.trim(),
      completed: false,
      category: newTaskCategory.value || null,
    };
    await api.createTask(payload);
    newTaskTitle.value = '';
    newTaskCategory.value = '';
    await fetchTasks();
    showSuccess('Задача добавлена');
  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    showError(getErrorMessage(error));
  }
};

const createCategory = async () => {
  const name = prompt('Название новой категории:');
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) {
    showError('Название категории не может быть пустым');
    return;
  }
  try {
    await api.createCategory({ name: trimmed });
    await fetchCategories();
    showSuccess('Категория создана');
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    showError(getErrorMessage(error));
  }
};

const toggleTask = async (task) => {
  try {
    await api.patchTask(task.id, { completed: !task.completed });
    await fetchTasks();
  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    showError(getErrorMessage(error));
  }
};

const editTask = async (task) => {
  const newTitle = prompt('Введите новое название задачи:', task.title);
  if (newTitle === null) return;
  const trimmed = newTitle.trim();
  if (!trimmed) {
    showError('Название не может быть пустым');
    return;
  }
  try {
    await api.patchTask(task.id, { title: trimmed });
    await fetchTasks();
    showSuccess('Изменения сохранены');
  } catch (error) {
    console.error('Ошибка редактирования задачи:', error);
    showError(getErrorMessage(error));
  }
};

const deleteTask = async (id) => {
  const task = tasks.value.find((t) => t.id === id);
  const ok = confirm(`Удалить задачу «${task ? task.title : ''}»?`);
  if (!ok) return;
  try {
    await api.deleteTask(id);
    await fetchTasks();
    showSuccess('Задача удалена');
  } catch (error) {
    console.error('Ошибка удаления задачи:', error);
    showError(getErrorMessage(error));
  }
};

// Фильтрация по статусу
const filteredTasks = computed(() => {
  if (currentFilter.value === 'active') return tasks.value.filter((t) => !t.completed);
  if (currentFilter.value === 'completed') return tasks.value.filter((t) => t.completed);
  return tasks.value;
});

// Фильтрация по категории + сортировка
const finalTasks = computed(() => {
  let arr = [...filteredTasks.value];

  if (currentCategoryFilter.value !== 'all') {
    if (currentCategoryFilter.value === 'none') {
      arr = arr.filter((t) => !t.category);
    } else {
      arr = arr.filter((t) => String(t.category) === String(currentCategoryFilter.value));
    }
  }

  switch (currentSort.value) {
    case 'title-asc':
      return arr.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    case 'title-desc':
      return arr.sort((a, b) => b.title.localeCompare(a.title, 'ru'));
    case 'active-first':
      return arr.sort((a, b) => Number(a.completed) - Number(b.completed));
    case 'completed-first':
      return arr.sort((a, b) => Number(b.completed) - Number(a.completed));
    default:
      return arr;
  }
});

const totalCount = computed(() => tasks.value.length);
const activeCount = computed(() => tasks.value.filter((t) => !t.completed).length);
const completedCount = computed(() => tasks.value.filter((t) => t.completed).length);

onMounted(() => {
  fetchTasks();
  fetchCategories();
});
</script>

<template>
  <div class="page">
    <div class="card-app">
      <h1>📝 Мои задачи</h1>

      <transition name="fade">
        <div v-if="errorMessage" class="banner error">⚠️ {{ errorMessage }}</div>
      </transition>
      <transition name="fade">
        <div v-if="successMessage" class="banner success">✅ {{ successMessage }}</div>
      </transition>

      <!-- Форма добавления -->
      <div class="add-block">
        <input
          v-model="newTaskTitle"
          @keyup.enter="addTask"
          placeholder="Что нужно сделать?"
        />
        <div class="add-row-2">
          <select v-model="newTaskCategory">
            <option value="">Без категории</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <button class="btn-secondary" @click="createCategory" title="Создать категорию">
            + Категория
          </button>
          <button class="btn-primary" @click="addTask">Добавить</button>
        </div>
      </div>

      <div class="counters">
        <span class="chip">Всего: <b>{{ totalCount }}</b></span>
        <span class="chip">Активных: <b>{{ activeCount }}</b></span>
        <span class="chip">Выполнено: <b>{{ completedCount }}</b></span>
      </div>

      <!-- Фильтры -->
      <div class="filters">
        <button :class="{ active: currentFilter === 'all' }" @click="currentFilter = 'all'">Все</button>
        <button :class="{ active: currentFilter === 'active' }" @click="currentFilter = 'active'">Активные</button>
        <button :class="{ active: currentFilter === 'completed' }" @click="currentFilter = 'completed'">Выполненные</button>
      </div>

      <!-- Фильтр по категории + сортировка -->
      <div class="sort-row">
        <label>Категория:</label>
        <select v-model="currentCategoryFilter">
          <option value="all">Все категории</option>
          <option value="none">Без категории</option>
          <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
            {{ cat.name }}
          </option>
        </select>

        <label>Сортировка:</label>
        <select v-model="currentSort">
          <option value="default">По умолчанию</option>
          <option value="title-asc">Название: А–Я</option>
          <option value="title-desc">Название: Я–А</option>
          <option value="active-first">Сначала активные</option>
          <option value="completed-first">Сначала выполненные</option>
        </select>
      </div>

      <ul class="task-list">
        <li
          v-for="task in finalTasks"
          :key="task.id"
          class="task-card"
          :class="{ completed: task.completed }"
        >
          <label class="checkbox-wrap">
            <input type="checkbox" :checked="task.completed" @change="toggleTask(task)" />
            <span class="checkmark"></span>
          </label>

          <div class="task-body">
            <span class="task-title" :class="{ done: task.completed }">{{ task.title }}</span>
            <span v-if="task.category_details" class="category-badge">
              🏷️ {{ task.category_details.name }}
            </span>
          </div>

          <div class="actions">
            <button class="icon-btn edit" @click="editTask(task)" title="Редактировать">✎</button>
            <button class="icon-btn delete" @click="deleteTask(task.id)" title="Удалить">✕</button>
          </div>
        </li>
      </ul>

      <p v-if="finalTasks.length === 0" class="empty">🗒️ Задач нет</p>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #eef2ff 0%, #f7faff 100%);
  padding: 24px 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.card-app {
  max-width: 620px; margin: 0 auto; background: #fff; padding: 24px;
  border-radius: 16px; box-shadow: 0 8px 32px rgba(30, 60, 120, 0.08);
}
h1 { margin: 0 0 20px; font-size: 24px; color: #1a2340; }

.banner { padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 14px; }
.banner.error { background: #ffe0e0; color: #a00; border: 1px solid #f5a5a5; }
.banner.success { background: #e0ffe4; color: #067a2a; border: 1px solid #a5f5b5; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Форма добавления */
.add-block { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.add-block > input {
  width: 100%; padding: 10px 12px; font-size: 15px;
  border: 1px solid #d0d7e6; border-radius: 10px; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.add-block > input:focus { border-color: #06c; box-shadow: 0 0 0 3px rgba(0,102,204,0.15); }
.add-row-2 { display: flex; gap: 8px; flex-wrap: wrap; }
.add-row-2 select {
  flex: 1; min-width: 140px; padding: 10px 12px; font-size: 14px;
  border: 1px solid #d0d7e6; border-radius: 10px; background: #fff; cursor: pointer; outline: none;
}
.add-row-2 select:focus { border-color: #06c; }
.btn-primary {
  padding: 10px 16px; font-size: 15px; background: #06c; color: #fff;
  border: none; border-radius: 10px; cursor: pointer; white-space: nowrap;
  transition: background 0.2s, transform 0.1s;
}
.btn-primary:hover { background: #0055aa; }
.btn-primary:active { transform: scale(0.97); }
.btn-secondary {
  padding: 10px 14px; font-size: 14px; background: #fff; color: #06c;
  border: 1px solid #06c; border-radius: 10px; cursor: pointer; white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}
.btn-secondary:hover { background: #e6f0ff; }

.counters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.chip { font-size: 13px; padding: 4px 10px; background: #f0f4ff; color: #334; border-radius: 999px; }

.filters { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.filters button {
  padding: 6px 14px; font-size: 14px; border: 1px solid #d0d7e6;
  background: #fff; border-radius: 999px; cursor: pointer; transition: all 0.2s;
}
.filters button:hover { background: #eef4ff; border-color: #06c; }
.filters button.active { background: #06c; color: #fff; border-color: #06c; }

.sort-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 16px; font-size: 14px; color: #445;
}
.sort-row select {
  padding: 6px 10px; font-size: 14px; border: 1px solid #d0d7e6;
  border-radius: 8px; background: #fff; cursor: pointer; outline: none;
  transition: border-color 0.2s;
}
.sort-row select:hover, .sort-row select:focus { border-color: #06c; }

.task-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.task-card {
  display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px;
  background: #fff; border: 1px solid #e5e9f2; border-radius: 12px;
  box-shadow: 0 2px 6px rgba(30, 60, 120, 0.04);
  transition: box-shadow 0.2s, transform 0.15s, background 0.2s;
}
.task-card:hover { box-shadow: 0 4px 14px rgba(30, 60, 120, 0.10); transform: translateY(-1px); }
.task-card.completed { background: #f4f6fa; border-color: #dfe4ee; }

.checkbox-wrap { position: relative; display: inline-flex; cursor: pointer; user-select: none; margin-top: 2px; }
.checkbox-wrap input { opacity: 0; width: 0; height: 0; }
.checkmark {
  width: 20px; height: 20px; border: 2px solid #b8c2d6; border-radius: 6px;
  display: inline-block; position: relative; transition: all 0.2s;
}
.checkbox-wrap:hover .checkmark { border-color: #06c; }
.checkbox-wrap input:checked + .checkmark { background: #06c; border-color: #06c; }
.checkbox-wrap input:checked + .checkmark::after {
  content: ''; position: absolute; left: 5px; top: 1px;
  width: 6px; height: 11px; border: solid #fff; border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.task-body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.task-title { font-size: 15px; color: #1a2340; word-break: break-word; }
.task-title.done { text-decoration: line-through; color: #97a1b5; }
.category-badge {
  align-self: flex-start; font-size: 12px; padding: 2px 8px;
  background: #eef4ff; color: #06c; border-radius: 999px;
}

.actions { display: flex; gap: 4px; }
.icon-btn {
  width: 32px; height: 32px; border: none; background: transparent;
  border-radius: 8px; font-size: 15px; cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.1s;
}
.icon-btn:hover { transform: scale(1.1); }
.icon-btn.edit { color: #06c; }
.icon-btn.edit:hover { background: #e6f0ff; }
.icon-btn.delete { color: #c00; }
.icon-btn.delete:hover { background: #ffe6e6; }

.empty { text-align: center; color: #97a1b5; margin-top: 24px; font-size: 15px; }

@media (max-width: 480px) {
  .card-app { padding: 16px; border-radius: 12px; }
  h1 { font-size: 20px; }
  .add-row-2 { flex-direction: column; }
  .btn-primary, .btn-secondary { width: 100%; }
  .task-card { padding: 10px 12px; }
  .task-title { font-size: 14px; }
  .icon-btn { width: 28px; height: 28px; }
  .sort-row { flex-direction: column; align-items: stretch; }
  .sort-row select { width: 100%; }
}
</style>