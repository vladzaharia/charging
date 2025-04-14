/** @type {import('tailwindcss').Config} */

import defaultTheme from 'tailwindcss/defaultTheme'

export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}', './app/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			colors: {
				'charge-green': '#44FF92',
				'charge-blue': '#25B9F3'
			},	
			fontFamily: {
				display: ['Maven Pro', ...defaultTheme.fontFamily.sans],
				body: ['Maven Pro', ...defaultTheme.fontFamily.sans],
				sans: ['Maven Pro', ...defaultTheme.fontFamily.sans],
				mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
				date: ['Space Mono', ...defaultTheme.fontFamily.mono],
			}
		},
	},
	plugins: [],
}
