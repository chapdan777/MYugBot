module.exports = function errorHandler(appState) {
  return (err, context) => {
    appState.errorBank.push({
      timestamp: new Date().toISOString(),
      type: err.type || 'System',
      severity: err.severity || 'Low',
      module: context?.module || 'unknown',
      userId: context?.userId,
      message: err.message,
      stack: err.stack,
      context,
      resolved: false
    });
  };
};
