const cubicRepo = require('../database/repositories/cubicRepository');

module.exports = {
  createPayment: async ({ stageId, authorId, typeElementId, senderId, recipientId, price, dateElement, typePayment }) => {
    // Создание элемента оплаты/аванса согласно flows (typeElementId 7 — оплата, 9 — оплата авансом)
    const res = await cubicRepo.createElement({
      stageId,
      authorId,
      typeElementId,
      senderId,
      recipientId,
      h: 0,
      w: 0,
      l: 0,
      a: 1,
      price,
      dateElement,
      typePayment
    });
    return res || null;
  }
};
