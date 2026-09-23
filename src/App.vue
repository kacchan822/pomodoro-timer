<script setup lang="ts">
// App.vue — ルートコンポーネント
// タイマーページと設定ページの切り替えを管理する
import { ref } from 'vue'

const currentPage = ref<'timer' | 'settings'>('timer')
</script>

<template>
  <div id="app-root">
    <nav>
      <button
        type="button"
        :aria-current="currentPage === 'timer' ? 'page' : undefined"
        @click="currentPage = 'timer'"
      >
        タイマー
      </button>
      <button
        type="button"
        :aria-current="currentPage === 'settings' ? 'page' : undefined"
        @click="currentPage = 'settings'"
      >
        設定
      </button>
    </nav>
    <main>
      <p v-if="currentPage === 'timer'">タイマーページ（実装予定）</p>
      <p v-else>設定ページ（実装予定）</p>
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, sans-serif;
  background-color: #1a1a2e;
  color: #eaeaea;
  min-height: 100vh;
}
</style>
