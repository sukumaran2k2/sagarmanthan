// Used by Jest only (Vite builds without Babel).
// Jest runs CommonJS, where `import.meta` doesn't exist; the app reads its settings from
// `import.meta.env` (Vite), so under Jest that becomes `process.env`.
function importMetaEnvToProcessEnv({ types: t }) {
  return {
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(t.objectExpression([
            t.objectProperty(t.identifier('env'), t.memberExpression(t.identifier('process'), t.identifier('env'))),
          ]));
        }
      },
    },
  };
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [importMetaEnvToProcessEnv],
};
