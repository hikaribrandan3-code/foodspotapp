import security from 'eslint-plugin-security';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'dist/**', '.next/**', 'build/**', 'supabase/**'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      security,
    },
    rules: {
      // Security - focus on real vulnerabilities only
      'security/detect-unsafe-regex': 'error',
      'security/detect-child-process': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-require': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
    },
  },
];
