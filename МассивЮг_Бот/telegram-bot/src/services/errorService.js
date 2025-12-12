module.exports = {
  addError: (appState, error) => {
    appState.errorBank.push({
      timestamp: new Date().toISOString(),
      resolved: false,
      ...error
    });
  }
};
