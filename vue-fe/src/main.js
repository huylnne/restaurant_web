import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // ✅ THÊM DÒNG NÀY
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'



const app = createApp(App)
app.use(router) // ✅ BẮT BUỘC CÓ
app.use(ElementPlus)
app.mount('#app')
