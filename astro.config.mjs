import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'FE Interview',
			social: {
				github: 'https://github.com/powerfulyang/fe-interview',
			},
		}),
	],
});
