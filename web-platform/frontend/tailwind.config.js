/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Premium Design System Tokens
            borderRadius: {
                'chip': '6px',      // chips, small controls
                'card': '10px',     // cards, panels, buttons
                'modal': '12px',    // modals, drawers
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.08)',           // cards (subtle)
                'dropdown': '0 4px 6px -1px rgba(0,0,0,0.1)',   // dropdowns/popovers
                'modal': '0 10px 25px -5px rgba(0,0,0,0.15)',   // modals
            },
            colors: {
                brown: {
                    50: '#fdf8f6',
                    100: '#f2e8e5',
                    200: '#eaddd7',
                    300: '#e0c1b7',
                    400: '#d9a391',
                    500: '#c66c4c',
                    600: '#b95130',
                    700: '#9b4328',
                    800: '#7c3a25',
                    900: '#663222',
                },
                // Primary orange color for the app - actions only
                primary: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                },
                // Dark sidebar colors
                sidebar: {
                    DEFAULT: '#1f2937',
                    dark: '#111827',
                    light: '#374151',
                    hover: '#374151',
                    active: '#4b5563',
                }
            }
        },
    },
    plugins: [],
}
