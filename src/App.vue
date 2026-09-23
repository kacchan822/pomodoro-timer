<script setup lang="ts">
// App.vue — ルートコンポーネント
//
// TimerPage と SettingsPage を切り替えるナビゲーションを提供する（要件 7.1）。
// vue-router は使用せず、ref<'timer' | 'settings'> による単純なページ切り替えで実装する。
import { ref } from 'vue'
import TimerPage from './pages/TimerPage.vue'
import SettingsPage from './pages/SettingsPage.vue'

type PageName = 'timer' | 'settings'

const currentPage = ref<PageName>('timer')

function navigate(page: PageName): void {
  currentPage.value = page
}
</script>

<template>
  <div id="app-root" :class="$style.root">
    <nav :class="$style.nav" aria-label="ページナビゲーション">
      <button
        type="button"
        :class="[$style.navButton, currentPage === 'timer' && $style.active]"
        :aria-current="currentPage === 'timer' ? 'page' : undefined"
        @click="navigate('timer')"
      >
        タイマー
      </button>
      <button
        type="button"
        :class="[$style.navButton, currentPage === 'settings' && $style.active]"
        :aria-current="currentPage === 'settings' ? 'page' : undefined"
        @click="navigate('settings')"
      >
        設定
      </button>
    </nav>

    <main :class="$style.content">
      <TimerPage v-if="currentPage === 'timer'" />
      <SettingsPage v-else />
    </main>
  </div>
</template>

<style module>
.root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 32rem;
  margin: 0 auto;
  padding: 1rem;
}

.nav {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0 1rem;
}

.navButton {
  padding: 0.5rem 1.25rem;
  font-size: 0.9375rem;
  color: #eaeaea;
  background-color: transparent;
  border: 1px solid #3a3a5e;
  border-radius: 0.375rem;
  cursor: pointer;
}

.navButton:hover {
  background-color: #2a2a4e;
}

.navButton.active {
  color: #1a1a2e;
  background-color: #eaeaea;
  border-color: #eaeaea;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>

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
