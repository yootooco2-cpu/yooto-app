// Babel config = défaut Metro SDK 56 (babel-preset-expo, worklets/reanimated inclus
// automatiquement par le preset). Rendu explicite UNIQUEMENT pour que babel-jest
// puisse transpiler le TypeScript sous jest-expo. Ne modifie pas le comportement Metro.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
