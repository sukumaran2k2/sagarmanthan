# Sagarmanthan – Frontend

React 19 + Vite + Tailwind CSS website for the Sagarmanthan portal.

**Setup and run instructions (with and without Docker) are in the main [README](../README.md).**

Quick start, once the backend is running on port 3000:

```bash
npm install
cp .env.example .env     # set VITE_API_BASE_URL=http://localhost:3000
npm run dev              # http://localhost:5173
```

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |
