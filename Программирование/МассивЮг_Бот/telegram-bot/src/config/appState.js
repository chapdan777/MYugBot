const AppState = {
  isRestarting: false,
  buttons: {},
  keyboards: {},
  users: new Map(),
  documents: new Map(),
  sessions: new Map(),
  messageQueue: [],
  errorBank: [],
  lastSyncAt: null
};

module.exports = AppState;
