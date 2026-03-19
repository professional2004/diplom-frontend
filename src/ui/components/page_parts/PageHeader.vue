<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();


const toPageMain = () => {
  router.push(`/`);
}

const logout = async () => {
  try {
    await authStore.logout();
  } catch {
    alert('Ошибка выхода из аккаунта')
  }
};

const login = () => {
  router.push(`/login`);
}

const register = () => {
  router.push(`/register`);
}

const toHomePage = () => {
  router.push(`/app`);
}

</script>

<template>
  <div> 
    <div class="header -user" v-if ="authStore.user">
      <div class="wrapper">
        <img class="image -logo" src="../../materials/images/logo.svg" @click="toPageMain"></img>
        <div class="text -logo">TextileCAD</div>
      </div>
      <div class="wrapper">
        <button class="button -logout" @click="toHomePage">Мои проекты</button>
        <button class="button -logout" @click="logout">Выйти из аккаунта</button>
      </div>
    </div>  

    <div class="header -guest" v-else>
      <div class="wrapper">
        <img class="image -logo" src="../../materials/images/logo.svg" @click="toPageMain"></img>
        <div class="text -logo">TextileCAD</div>
      </div>
      <div class="wrapper">
        <button class="button -login" @click="login">Войти</button>
        <button class="button -register" @click="register">Зарегистрироваться</button>
      </div>
    </div> 
  </div>
</template>

<style scoped>
/* header */
.header {
  display: flex;
  justify-content: space-between;
  background-color: #e7f1f1;
  height: 60px;
  padding-left: 15px;
  padding-right: 15px;
}
.header .wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header .image.-logo {
  width: 45px;
}
.header .text.-logo {
  font-size: 24px;
}
.header .button.-logout {
  height: fit-content;
}

</style>