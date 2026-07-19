import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dev-dist/**', '.vercel/**', 'node_modules/**', 'coverage/**', 'tailwind.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        Blob: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        document: 'readonly',
        Deno: 'readonly',
        fetch: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        process: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        sessionStorage: 'readonly',
        URL: 'readonly',
        window: 'readonly'
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off'
    }
  }
);
