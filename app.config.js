const { expo } = require('./app.json');

module.exports = () => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  return {
    ...expo,
    ...(projectId ? { extra: { ...expo.extra, eas: { projectId } } } : {}),
  };
};
