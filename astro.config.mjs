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
			sidebar: [
				{
					label: 'React',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'React Fiber', link: '/react/fiber' },
					],
				},
				{
					label: 'Coding Tests',
					items: [
						{ label: 'Promise', link: '/coding-tests/promise' },
					],
				}
			],
		}),
	],
});
