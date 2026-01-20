<script setup>
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const handleLogout = async () => {
  try {
    await auth.logout();
  } catch {
    alert('Ошибка выхода из аккаунта')
  }
};
</script>


<template>
  <h1>Защищенная страница!</h1>

  <button @click="handleLogout">Выйти из аккаунта</button>
</template>

