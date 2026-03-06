<script setup lang="ts">
import BackToTop from '@/components/BackToTop.vue'
import HeroSection from '@/components/home/HeroSection.vue'
import PagesGrid from '@/components/home/PagesGrid.vue'
import TechStackSection from '@/components/home/TechStackSection.vue'
import ContributeSection from '@/components/home/ContributeSection.vue'
import RulesSection from '@/components/home/RulesSection.vue'
import ProductsSection from '@/components/home/ProductsSection.vue'
import SponsorsSection from '@/components/home/SponsorsSection.vue'
import SiteFooter from '@/components/home/SiteFooter.vue'
</script>

<template>
  <div class="min-h-screen bg-bg-deep text-text-primary font-body">
    <HeroSection />
    <PagesGrid />
    <TechStackSection />
    <ContributeSection />
    <RulesSection />
    <ProductsSection />
    <SponsorsSection />
    <SiteFooter />
    <BackToTop />
  </div>
</template>
