import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({root:path.resolve(__dirname),test:{environment:'jsdom',include:['tests/**/*.test.ts','tests/**/*.test.tsx'],setupFiles:['./tests/setup.ts'],restoreMocks:true}});
