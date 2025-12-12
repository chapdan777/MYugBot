// Репозиторий Cubic: SQL-запросы, перенесенные из Node-RED flows
// Все комментарии на русском согласно спецификации

const { withCubic } = require('../connection');

// Утилита: безопасное значение или null
function val(v) {
  if (v === undefined || v === null) return null;
  return v;
}

module.exports = {
  // ======================= ЗАГРУЗКА СПРАВОЧНИКОВ И ДАННЫХ =======================
  loadUsers: async () => {
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query('select * from tg_users', [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  loadGroups: async () => {
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query('select * from tg_group', [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  loadMaterials: async () => {
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query('select m.id, m.name from material m where m.massiv != 0', [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  loadStatuses: async () => {
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query('select * from tg_statuses', [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  loadTypeElements: async () => {
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query('select * from tg_type_element t order by t.SORT_COLUMN', [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  loadDocuments: async () => {
    return withCubic(async (db) => {
      const sql = `select * from TG_DOCUMENTS d\n                     where d.isdeleted is null or (d.isdeleted = 0)\n                     order by id`;
      return new Promise((resolve, reject) => {
        db.query(sql, [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  loadStages: async () => {
    return withCubic(async (db) => {
      const sql = `select * from TG_STAGES S\n                     where S.ISDELETED is null or (S.ISDELETED = 0)\n                     order by ID`;
      return new Promise((resolve, reject) => {
        db.query(sql, [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  loadStageElements: async () => {
    return withCubic(async (db) => {
      const sql = 'select * from tg_stage_elements order by id';
      return new Promise((resolve, reject) => {
        db.query(sql, [], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },

  // ======================= ПОЛЬЗОВАТЕЛИ =======================
  createUser: async ({ firstName, chatId, groupId, lastName, username, parentId }) => {
    // В flows используется вызов: select ... from TGP_CREATE_USER(...)
    const sql = `select ID, CHAT_ID, GROUP_ID, FIRST_NAME, LAST_NAME, USER_NAME, IS_REGISTERED, IS_BLOCKED, BILLING_ID, PARENT_ID\n                  from TGP_CREATE_USER(?, ?, ?, ?, ?, ?)`;
    const params = [
      String(firstName),
      chatId ? Number(chatId) : null,
      groupId ? Number(groupId) : null,
      lastName ? String(lastName) : null,
      username ? String(username) : null,
      parentId ? Number(parentId) : null
    ];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0] : null);
        });
      });
    });
  },
  editUser: async (payload) => {
    // В flows: select RESULT from TGP_EDIT_USER (...)
    const sql = `select RESULT from TGP_EDIT_USER(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      Number(payload.id),
      val(payload.chatId),
      val(payload.groupId),
      val(payload.parentId),
      payload.firstName ? String(payload.firstName) : null,
      payload.lastName ? String(payload.lastName) : null,
      payload.username ? String(payload.username) : null,
      payload.phone ? String(payload.phone) : null,
      payload.card ? String(payload.card) : null,
      payload.cardOwner ? String(payload.cardOwner) : null,
      payload.billingAccountId ? Number(payload.billingAccountId) : null
    ];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0].RESULT : 0);
        });
      });
    });
  },

  // ======================= ДОКУМЕНТЫ =======================
  createDocument: async ({ authorId, documentName, commentary }) => {
    const sql = `select ID from TGP_CREATE_DOCUMENT(?, ?, ?)`;
    const params = [
      Number(authorId),
      documentName ? String(documentName) : null,
      commentary ? String(commentary) : null
    ];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0].ID : null);
        });
      });
    });
  },
  updateDocument: async ({ id, statusId, documentName, commentary }) => {
    const sql = `update tg_documents d set
                   d.status_id = ?,
                   d.document_name = ?,
                   d.commentary = ?
                 where d.id = ?`;
    const params = [
      Number(statusId),
      documentName ? String(documentName) : null,
      commentary ? String(commentary) : null,
      Number(id)
    ];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },
  markDocumentForDeletion: async (id) => {
    const sql = 'update tg_documents d set d.marked_for_deletion = -1 where d.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },
  unmarkDocumentDeletion: async (id) => {
    const sql = 'update tg_documents d set d.marked_for_deletion = 1 where d.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },
  deleteDocument: async (id) => {
    const sql = 'update tg_documents d set d.isdeleted = -1 where d.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },
  getDocumentById: async (id) => {
    const sql = 'select * from tg_documents d where d.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0] : null);
        });
      });
    });
  },

  // ======================= ЭТАПЫ =======================
  createStage: async ({ documentId, authorId, stageName, materialId, commentary, dateStage }) => {
    const sql = `select ID from TGP_CREATE_STAGE(?, ?, ?, ?, ?, ?)`;
    const params = [
      Number(documentId),
      Number(authorId),
      stageName ? String(stageName) : null,
      materialId ? Number(materialId) : null,
      commentary ? String(commentary) : null,
      dateStage ? String(dateStage) : null // формат даты как строка согласно flows
    ];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0].ID : null);
        });
      });
    });
  },
  editStage: async ({ id, stageName, statusId, materialId, commentary, dateStage }) => {
    const sql = `select RESULT from TGP_EDIT_STAGE(?, ?, ?, ?, ?, ?)`;
    const params = [
      Number(id),
      stageName ? String(stageName) : null,
      Number(statusId),
      Number(materialId),
      commentary ? String(commentary) : null,
      dateStage ? String(dateStage) : null
    ];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0].RESULT : 0);
        });
      });
    });
  },
  markStageForDeletion: async (id) => {
    const sql = 'update tg_stages s set s.marked_for_deletion = -1 where s.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },
  unmarkStageDeletion: async (id) => {
    const sql = 'update tg_stages s set s.marked_for_deletion = 1 where s.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },
  deleteStage: async (id) => {
    const sql = 'update tg_stages s set s.isdeleted = -1 where s.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },
  getStageById: async (id) => {
    const sql = 'select * from tg_stages s where s.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0] : null);
        });
      });
    });
  },

  // ======================= ЭЛЕМЕНТЫ ЭТАПОВ =======================
  updateStageElement: async ({ id, h, w, l, a, price, senderId, recipientId, typeElementId }) => {
    const sqlUpdate = `update TG_STAGE_ELEMENTS L
                         set L.H = ?,
                             L.W = ?,
                             L.L = ?,
                             L.A = ?,
                             L.PRICE = ?,
                             L.SENDER_ID = ?,
                             L.RECIPIENT_ID = ?,
                             L.TYPE_ELEMENT_ID = ?
                         where L.ID = ?`;
    const paramsUpdate = [h, w, l, a, price, senderId, recipientId, typeElementId, id].map((x) => (x === undefined ? null : x));
    const sqlFetch = `select L.RESULT_VALUE, L.RESULT_SUM from TG_STAGE_ELEMENTS L where L.ID = ?`;
    return withCubic(async (db) => {
      await new Promise((resolve, reject) => {
        db.query(sqlUpdate, paramsUpdate, (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
      return new Promise((resolve, reject) => {
        db.query(sqlFetch, [Number(id)], (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0] : null);
        });
      });
    });
  },
  createElement: async ({ stageId, authorId, typeElementId, senderId, recipientId, h, w, l, a, price, dateElement, typePayment }) => {
    // В flows используется TGP_CREATE_ELEMET (орфография сохранена)
    const sql = `SELECT * FROM TGP_CREATE_ELEMET(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      Number(stageId),
      Number(authorId),
      Number(typeElementId),
      senderId ? Number(senderId) : null,
      recipientId ? Number(recipientId) : null,
      h || 0,
      w || 0,
      l || 0,
      a || 0,
      price || 0,
      dateElement ? String(dateElement) : null,
      typePayment ? String(typePayment) : null
    ];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0] : null);
        });
      });
    });
  },
  deleteElement: async (id) => {
    const sql = 'delete from tg_stage_elements l where l.id = ?';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(id)], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  },

  // ======================= АГРЕГАЦИИ И ПРОЦЕДУРЫ =======================
  getMoneyStage: async (documentId, stageId, billingId) => {
    const sql = 'select * from tgp_get_money_stage(?, ?, ?)';
    const params = [Number(documentId), Number(stageId), Number(billingId)];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res && res[0] ? res[0] : null);
        });
      });
    });
  },
  getClosedDocStageResult: async (stageId) => {
    const sql = 'select * from TGP_GET_RESULT_CLOSE_DOC(?)';
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(stageId)], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  // Сводные данные для документа по этапам (альтернатива из flows)
  getStagesSummaryForDoc: async (docId) => {
    const sql = `select S.ID, M.NAME, S.STAGE_NUMBER, S.AUTHOR_ID, S.STAGE_NAME, S.COMMENTARY, S.DATE_STAGE, S.MARKED_FOR_DELETION,
                        (select first 1 L.RESULT_VALUE from TG_STAGE_ELEMENTS L left join TG_TYPE_ELEMENT T on (L.TYPE_ELEMENT_ID = T.ID)
                         where L.ID_STAGE = S.ID and (T.ELEMENT_GROUP != 10 and T.ELEMENT_GROUP != 11)) as RESULT_VALUE,
                        coalesce((select first 1 L.RESULT_SUM from TG_STAGE_ELEMENTS L left join TG_TYPE_ELEMENT T on (L.TYPE_ELEMENT_ID = T.ID)
                         where L.ID_STAGE = S.ID and (T.ELEMENT_GROUP != 10 and T.ELEMENT_GROUP != 11)), 0) as RESULT_SUM,
                        coalesce((select sum(L.RESULT_SUM) from TG_STAGE_ELEMENTS L left join TG_TYPE_ELEMENT T on (L.TYPE_ELEMENT_ID = T.ID)
                         where L.ID_STAGE = S.ID and (T.ELEMENT_GROUP = 10 or (T.ELEMENT_GROUP = 11))), 0) as PAYMENTS
                 from TG_STAGES S
                 left join MATERIAL M on (S.MATERIAL_ID = M.ID)
                 where (S.ISDELETED is null or (S.ISDELETED = 0)) and S.DOCUMENT_ID = ?
                 order by S.ID`;
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(docId)], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  // Данные по авансам/оплатам для документа (flows: getDataPrepaidExpense)
  getDataPrepaidExpense: async (docId, billingId) => {
    const extra = billingId ? ' and tr.id_billing_account = ?' : '';
    const sql = `select TR.ID_BILLING_ACCOUNT, T.NAME, T.ELEMENT_GROUP, L.RESULT_SUM
                 from TG_STAGE_ELEMENTS L
                 left join TG_TYPE_ELEMENT T on (L.TYPE_ELEMENT_ID = T.ID)
                 left join TG_STAGES S on (L.ID_STAGE = S.ID)
                 left join tg_transactions tr on (tr.id_stage_element = l.id)
                 where (s.isdeleted is null or (s.isdeleted = 0)) and
                       tr.modifer != -1 and (T.ELEMENT_GROUP = 1 or (T.ELEMENT_GROUP = 11)) and
                       S.DOCUMENT_ID = ?${extra}`;
    const params = billingId ? [Number(docId), Number(billingId)] : [Number(docId)];
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  },
  // Переплаты по документу (flows: getOverpaymentToDocument)
  getOverpaymentToDocument: async (docId) => {
    const sql = `select S.ID as ID_STAGE, TR.ID_BILLING_ACCOUNT,
                        iif(coalesce(sum(E.RESULT_SUM * TR.MODIFER), 0) < 0, 0, coalesce(sum(E.RESULT_SUM * TR.MODIFER), 0)) as RESULT_SUM
                 from TG_STAGE_ELEMENTS E
                 left join TG_TYPE_ELEMENT T on (E.TYPE_ELEMENT_ID = T.ID)
                 left join TG_STAGES S on (E.ID_STAGE = S.ID)
                 left join TG_TRANSACTIONS TR on (TR.ID_STAGE_ELEMENT = E.ID)
                 where (S.ISDELETED is null or (S.ISDELETED = 0)) and
                       TR.ID_BILLING_ACCOUNT is not null and
                       T.ELEMENT_GROUP != 1 and
                       (T.ELEMENT_GROUP != 10 or (T.ELEMENT_GROUP = 10 and TR.MODIFER != -1)) and
                       (T.ELEMENT_GROUP != 11 or (T.ELEMENT_GROUP = 11 and TR.MODIFER != -1)) and
                       S.DOCUMENT_ID = ?
                 group by S.ID, TR.ID_BILLING_ACCOUNT`;
    return withCubic(async (db) => {
      return new Promise((resolve, reject) => {
        db.query(sql, [Number(docId)], (err, res) => {
          if (err) return reject(err);
          resolve(res || []);
        });
      });
    });
  }
};
