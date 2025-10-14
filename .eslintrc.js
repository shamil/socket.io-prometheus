module.exports = {
  env: {
    es2022: true,
    mocha: true,
    node: true,
  },

  extends: [
    'eslint:recommended',
  ],

  rules: {
    // Minimal project-specific preferences
    'no-console': 'off', // Allow console for this type of project
    'eqeqeq': ['error', 'always', { null: 'ignore' }], // == null is acceptable
  },
};
