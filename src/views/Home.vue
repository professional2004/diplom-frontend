<script setup>
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

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

</script>


<template>
  <h1>Защищенная страница!</h1>

  <button @click="handleLogout">Выйти из аккаунта</button>
  <button @click="deleteAccount">Удалить аккаунт</button>

</template>

