# NIC Labs Manager

This is a Kanban-style project management application featuring AI-powered image editing using Google's Gemini 2.5 Flash Image model.

## How to Run Locally

This project works best with a Vite React setup.

### Prerequisites

- Node.js installed (version 18+ recommended)
- A Google Cloud API Key with access to Gemini API

### Setup Instructions

1.  **Create a new Vite project:**
    ```bash
    npm create vite@latest nic-labs-manager -- --template react-ts
    cd nic-labs-manager
    ```

2.  **Install dependencies:**
    ```bash
    npm install @google/genai lucide-react
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```

3.  **Configure Tailwind CSS:**
    Update `tailwind.config.js`:
    ```javascript
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    ```
    Add Tailwind directives to your `src/index.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

4.  **Copy Files:**
    - Replace the contents of `src/App.tsx` and `src/index.tsx` (rename to main.tsx if using Vite default) with the files from this project.
    - Create the `components` and `services` folders in `src` and copy the respective files.
    - Copy `types.ts` to `src`.

5.  **Environment Setup:**
    Create a `.env` file in the root directory:
    ```
    VITE_API_KEY=your_google_ai_studio_api_key
    ```
    
    *Note: In the provided code, `process.env.API_KEY` is used. For Vite, you might need to change this to `import.meta.env.VITE_API_KEY` or configure define in `vite.config.ts`.*

6.  **Run the App:**
    ```bash
    npm run dev
    ```

## Features

- **Kanban Board:** Organize tasks by status.
- **Task Details:** Edit task info, assign clients and projects.
- **Gemini Image Editor:** Edit attachment images using text prompts (e.g., "Add a retro filter", "Remove background").
