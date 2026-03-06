<script setup lang="ts">
import { rules, padIndex } from '@/data/homepage'
</script>

<template>
  <section class="max-w-5xl mx-auto px-4 sm:px-6 pb-20 scroll-reveal">
    <h2 class="font-display text-2xl font-semibold text-text-primary mb-10 flex items-center gap-3">
      <span class="text-accent-coral font-display text-sm tracking-widest">//</span>
      Nguyên tắc
    </h2>

    <div class="grid gap-5 sm:grid-cols-2">
      <div v-for="(rule, i) in rules" :key="i" class="flex gap-4 items-center">
        <span class="font-display text-lg font-bold text-accent-amber/50 leading-none shrink-0 w-8">
          {{ padIndex(i) }}
        </span>
        <p class="text-sm text-text-secondary leading-relaxed">{{ rule }}</p>
      </div>
    </div>
  </section>
</template>
