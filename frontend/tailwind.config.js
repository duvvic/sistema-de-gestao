/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                app: "var(--bg-app)",
                surface: "var(--bg-surface)",
                surfaceHover: "var(--bg-surface-hover)",
                sidebar: "var(--sidebar-bg)",
                textPrimary: "var(--text-primary)",
                textDefault: "var(--text-default)",
                textMuted: "var(--text-muted)",
                borderSubtle: "var(--border)",
            }
        },
    },
    plugins: [],
}
