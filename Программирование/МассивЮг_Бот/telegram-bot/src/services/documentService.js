const cubicRepo = require('../database/repositories/cubicRepository');

module.exports = {
  createDocument: async ({ authorId, documentName, commentary }) => {
    const id = await cubicRepo.createDocument({ authorId, documentName, commentary });
    return id ? { id, authorId, documentName, commentary } : null;
  },
  listActive: async () => {
    const docs = await cubicRepo.loadDocuments();
    return docs || [];
  }
};
