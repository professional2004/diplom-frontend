<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const email = ref('');
const password = ref('');
const router = useRouter();
const auth = useAuthStore();

const handleLogin = async () => {
  try {
    await auth.login({
      email: email.value,
      password: password.value
    })
    router.push({ name: 'app' })
  } catch {
    alert('Ошибка авторизации')
  }
};
</script>



<template>
  <div>
    <h1>Авторизация</h1>
    <label for="input-email">Введите email</label>
    <input v-model="email" id="input-email" type="email">

    <label for="input-password">Введите пароль</label>
    <input v-model="password" id="input-password" type="password">

    <button @click="handleLogin">Войти</button>
  </div>
</template>

