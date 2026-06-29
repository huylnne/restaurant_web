import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { API_ORIGIN } from './config/api'




axios.defaults.baseURL = API_ORIGIN

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "";
    const isAccountBlocked =
      error.response?.status === 403 && /khóa|vô hiệu hóa/i.test(message);

    if (isAccountBlocked) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      ElMessage.error(message);
      if (router.currentRoute.value.path !== "/login") {
        router.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

const app = createApp(App)
app.use(router) 
app.use(ElementPlus)
app.mount('#app')

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }