module.exports = {
    parser: "@babel/eslint-parser",
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        babelrc: true,
        configFile: false,
        // your babel options
        presets: ["@babel/preset-env"],
      },
      sourceType: "module",
      allowImportExportEverywhere: false,
      ecmaFeatures: {
        globalReturn: false,
		  	jsx: true,
      },
    },
    // extends: [
    //   "eslint:recommended",
    //   "plugin:import/errors",
    //   "plugin:import/warnings",
    //   "plugin:react-hooks/recommended",
    //   "airbnb"
    // ],
    plugins: [
      "react",
      "jest"
    ],
  }