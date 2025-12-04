module.exports = function authentication(appState) {
  return (msg) => {
    const chatId = msg.chat.id;
    const session = appState.sessions.get(chatId);
    if (!session) return { allowed: false, reason: 'NO_SESSION' };
    return { allowed: true };
  };
};
