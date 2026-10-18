import {defineConfig,devices} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:['excel.spec.ts','site.spec.ts','conversion.spec.ts'],outputDir:'test-results/android',projects:[{name:'android-chrome',use:{...devices['Pixel 7'],defaultBrowserType:'chromium'}}]});
