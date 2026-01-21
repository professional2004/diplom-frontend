<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const email = ref('');
const password = ref('');
const router = useRouter();

const handleRegister = async () => {
  try {
    await api.post('/api/auth/register', {
      email: email.value,
      password: password.value
    });
    alert('Регистрация успешна!');
    router.push('/login');
  } catch (error) {
    alert('Ошибка регистрации');
  }
};
</script>

<template>
  <div>
    <h1>Регистрация</h1>
    <label for="input-email">Введите email</label>
    <input v-model="email" id="input-email" type="email">

    <label for="input-password">Введите пароль</label>
    <input v-model="password" id="input-password" type="password">

    <button @click="handleRegister">Зарегистрироваться</button>
  </div>
</template>
