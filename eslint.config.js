import js from '@eslint/js'
import globals from 'globals'
import babelParser from '@babel/eslint-parser'
import reactHooks from 'eslint-plugin-react-hooks'
import jest from 'eslint-plugin-jest'
import importPlugin from 'eslint-plugin-import'
import react from 'eslint-plugin-react'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest,
        MAIN_WINDOW_WEBPACK_ENTRY: "readonly",
        MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: "readonly",
      },
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react'],
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      jest,
      import: importPlugin,
      react,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Jest rules
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',

      // Arrow function rules
      'arrow-body-style': ['warn', 'as-needed'],
      'arrow-parens': ['warn', 'as-needed'],

      // Class rules
      'class-methods-use-this': 0,

      // Comma rules
      'comma-dangle': ['warn', 'always-multiline'],

      // Consistent return
      'consistent-return': 0,

      // EOL
      'eol-last': 0,

      // Function names
      'func-names': 0,

      // Import rules
      'import/extensions': 0,
      'import/imports-first': 0,
      'import/no-extraneous-dependencies': 0,
      'import/no-unresolved': 0,
      'import/order': ['warn', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      }],

      // Indent
      indent: ['error', 2, { SwitchCase: 1, VariableDeclarator: 1 }],

      // JSX a11y
      'jsx-a11y/href-no-hash': 0,

      // JSX quotes
      'jsx-quotes': ['warn', 'prefer-double'],

      // Linebreak
      'linebreak-style': 0,

      // Max length
      'max-len': 0,

      // New cap
      'new-cap': 0,

      // Alert
      'no-alert': 0,

      // Console
      'no-console': 'warn',

      // Debugger
      'no-debugger': 'warn',

      // Global assign
      'no-global-assign': 0,

      // Lone blocks
      'no-lone-blocks': 0,

      // Multi spaces
      'no-multi-spaces': 'warn',

      // Shadow
      'no-shadow': 0,

      // Tabs
      'no-tabs': 0,

      // Trailing spaces
      'no-trailing-spaces': 'warn',

      // Underscore
      'no-underscore-dangle': 0,

      // Unsafe negation
      'no-unsafe-negation': 0,

      // Unused vars
      'no-unused-vars': [1, { varsIgnorePattern: '(bindActionCreators|colors|chalk|dotenv)', args: 'none' }],
      // Use before define
      'no-use-before-define': 0,
      // Useless constructor
      'no-useless-constructor': 0,

      // Var
      'no-var': 'warn',

      // Object curly spacing
      'object-curly-spacing': ['warn', 'always'],

      // One var
      'one-var': 0,

      // Quotes
      quotes: 0,

      // React rules
      'react/display-name': [1, { ignoreTranspilerName: false }],
      'react/forbid-prop-types': [1, { forbid: ['any'] }],
      'react/jsx-boolean-value': 'warn',
      'react/jsx-closing-bracket-location': [1, { selfClosing: 'tag-aligned', nonEmpty: 'after-props' }],
      'react/jsx-curly-spacing': 'warn',
      'react/jsx-filename-extension': 0,
      'react/jsx-indent': ['error', 2],
      'react/jsx-one-expression-per-line': [0, 'always'],
      'react/jsx-indent-props': 0,
      'react/jsx-key': 'warn',
      'react/jsx-max-props-per-line': [1, { maximum: 5 }],
      'react/jsx-no-bind': 0,
      'react/jsx-no-duplicate-props': 'warn',
      'react/jsx-no-literals': 0,
      'react/jsx-no-undef': 'warn',
      'react/jsx-pascal-case': 'warn',
      'react/jsx-sort-prop-types': 0,
      'react/jsx-sort-props': 0,
      'react/jsx-space-before-closing': [1, 'always'],
      'react/jsx-uses-react': 'warn',
      'react/jsx-uses-vars': 'warn',
      'react/jsx-wrap-multilines': 'warn',
      'react/no-danger': 'warn',
      'react/no-did-mount-set-state': 'warn',
      'react/no-did-update-set-state': 'warn',
      'react/no-direct-mutation-state': 0,
      'react/no-multi-comp': 'warn',
      'react/no-set-state': 0,
      'react/no-unknown-property': 'warn',
      'react/prefer-es6-class': 'warn',
      'react/prefer-stateless-function': 0,
      'react/prop-types': 0,
      'react/react-in-jsx-scope': 0,
      'react/require-extension': 0,
      'react/self-closing-comp': 'warn',
      'react/sort-comp': 'warn',

      // Semi
      semi: ['warn', 'never'],
    },
  },

  // Ignore patterns
  {
    ignores: [
      'out/**',
      'node_modules/**',
      '.webpack/**',
      'coverage/**',
      'openspec/**',
    ],
  },
]
