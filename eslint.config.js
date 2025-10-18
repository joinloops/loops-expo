const { defineConfig, globalIgnores } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const globals = require('globals');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores(['dist/*']),
  ...expo,
  eslintPluginPrettierRecommended,
  {
    settings: {
      'import/resolver': {
        alias: {
          map: [['@', './src']],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      },
    },
  },
  {
    files: ['babel.config.js', 'metro.config.js', 'jest.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
