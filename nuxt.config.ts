// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: [
    ['github:awecode/autoadmin', { install: true }],
  ],

  modules: [
    '@nuxt/icon',
  ],
})