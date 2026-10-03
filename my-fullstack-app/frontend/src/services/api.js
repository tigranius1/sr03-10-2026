import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default {
  // Задачи
  getTasks() {
    return apiClient.get('/tasks/');
  },
  createTask(task) {
    return apiClient.post('/tasks/', task);
  },
  updateTask(id, task) {
    return apiClient.put(`/tasks/${id}/`, task);
  },
  patchTask(id, partialData) {
    return apiClient.patch(`/tasks/${id}/`, partialData);
  },
  deleteTask(id) {
    return apiClient.delete(`/tasks/${id}/`);
  },

  // Категории
  getCategories() {
    return apiClient.get('/categories/');
  },
  createCategory(category) {
    return apiClient.post('/categories/', category);
  },
  deleteCategory(id) {
    return apiClient.delete(`/categories/${id}/`);
  },
};