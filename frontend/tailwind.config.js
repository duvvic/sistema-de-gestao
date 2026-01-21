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
                surfaceHover: "var(--surface-hover)",
                sidebar: "var(--sidebar-bg)",
                textPrimary: "var(--text-primary)",
                textDefault: "var(--text)",
                textMuted: "var(--textMuted)",
                borderSubtle: "var(--border)",
            }
        },
    },
    plugins: [],
}
