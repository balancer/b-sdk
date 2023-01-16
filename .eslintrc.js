module.exports = {
    root: true,

    env: {
        node: true,
    },

    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],

    plugins: ['simple-import-sort'],

    parserOptions: {
        ecmaVersion: 2020,
        parser: '@typescript-eslint/parser',
    },

    rules: {
        'no-console': 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
    },
};
