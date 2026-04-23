module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    process.env.NODE_ENV === 'test' && '@babel/plugin-transform-modules-commonjs'
  ].filter(Boolean)
};
