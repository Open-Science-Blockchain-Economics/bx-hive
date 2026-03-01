// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://open-science-blockchain-economics.github.io',
	base: '/bx-hive',
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: 'bx-hive Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			sidebar: [
				{ label: 'Getting Started', autogenerate: { directory: 'getting-started' } },
				{ label: 'Concepts', autogenerate: { directory: 'concepts' } },
				{ label: 'Experimenters', autogenerate: { directory: 'experimenters' } },
				{ label: 'Subjects', autogenerate: { directory: 'subjects' } },
				{ label: 'Reference', autogenerate: { directory: 'reference' } },
			],
		}),
	],
});
