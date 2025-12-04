const cubicRepo = require('../database/repositories/cubicRepository');

module.exports = {
  createStage: async ({ documentId, authorId, stageName, materialId, commentary, dateStage }) => {
    const id = await cubicRepo.createStage({ documentId, authorId, stageName, materialId, commentary, dateStage });
    return id ? { id, documentId, stageName, materialId, commentary, dateStage } : null;
  }
};
