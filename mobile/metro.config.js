// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// @/ → src/ 경로 별칭
config.resolver.alias = {
  "@": path.resolve(__dirname, "src"),
};

module.exports = config;
