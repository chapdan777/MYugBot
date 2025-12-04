const { enqueueMessage } = require('../controllers/botController');
const cubicRepo = require('../database/repositories/cubicRepository');

module.exports = {
  processText: (bot, appState, msg) => {
    const chatId = msg.chat.id;
    const session = appState.sessions.get(chatId);
    if (!session) {
      enqueueMessage(chatId, 'Пожалуйста, используйте /start для инициализации сессии.');
      return;
    }
    session.lastActivity = Date.now();
    const text = msg.text;
    const groupId = session?.groupId || session?.context?.groupId || 1;

    // Получаем информацию о роли
    const groupNames = {
      1: 'Гость',
      2: 'Клиент',
      3: 'Агент',
      4: 'Контрагент',
      5: 'Плательщик',
      6: 'Менеджер',
      7: 'Администратор'
    };
    const roleName = groupNames[groupId] || 'Гость';

    // Обработка кнопок меню верхнего уровня
    if (text === 'Главное меню') {
      session.mode = { id: 0, step: 0 };
      const kb = appState.keyboards?.get(appState.buttons.homeMenu.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, 'Главное меню', options);
    } else if (text === 'Назад') {
      // Логика возврата назад (из стека навигации)
      if (session.navigationStack && session.navigationStack.length > 0) {
        const prevMode = session.navigationStack.pop();
        session.mode = prevMode;
        const kb = appState.keyboards?.get(appState.buttons.homeMenu.name, groupId);
        const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
        enqueueMessage(chatId, 'Возврат назад', options);
      } else {
        session.mode = { id: 0, step: 0 };
        const kb = appState.keyboards?.get(appState.buttons.homeMenu.name, groupId);
        const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
        enqueueMessage(chatId, 'Главное меню', options);
      }
    } else if (text === 'Документы') {
      session.mode = { id: 2, step: 0 };
      const kb = appState.keyboards?.get(appState.buttons.menu.documents.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, '📄 Раздел "Документы"', options);
    } else if (text === 'Пользователи') {
      session.mode = { id: 1, step: 0 };
      const kb = appState.keyboards?.get(appState.buttons.menu.users.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, '👥 Раздел "Пользователи"', options);
    } else if (text === 'Заказы') {
      session.mode = { id: 3, step: 0 };
      const kb = appState.keyboards?.get(appState.buttons.menu.orders.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, '📦 Раздел "Заказы"', options);
    } else if (text === 'Отгрузки') {
      session.mode = { id: 3, step: 4 };
      const kb = appState.keyboards?.get(appState.buttons.menu.shipments.name, groupId);
      const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
      enqueueMessage(chatId, '🚚 Раздел "Отгрузки"', options);
    } else if (text === 'Капуста') {
      // Запрос баланса кассы
      handleMoneyRequest(chatId, groupId, session);
    } else if (text === 'Журнал расходов') {
      // Журнал кассовых операций за последние 7 дней
      handleCashJournalRequest(chatId, groupId, session);
    } else if (text === 'Мой профиль') {
      const firstName = session.firstName || 'Гость';
      const userId = session.userId || chatId;
      const phone = session.phone || 'Не указан';
      const card = session.card || 'Не указана';
      enqueueMessage(chatId, `👤 Профиль
Имя: ${firstName}
ID: ${userId}
Роль: ${roleName}
Телефон: ${phone}
Карта: ${card}`);
    } 
    // Обработка кнопок раздела "Пользователи"
    else if (text === 'Зарегистрированные') {
      handleRegisteredUsers(chatId, session);
    } else if (text === 'Ожидают регистрацию') {
      handleAwaitingRegistration(chatId, session);
    } else if (text === 'Список контрагенов') {
      handleContractorsList(chatId, session);
    } else if (text === 'Мои данные') {
      handleMyData(chatId, session, groupId);
    }
    // Обработка кнопок раздела "Документы"
    else if (text === 'Все документы') {
      handleAllDocuments(chatId, session, groupId);
    } else if (text === 'Мои документы') {
      handleMyDocuments(chatId, session, groupId);
    } else if (text === 'Закрытые документы') {
      handleClosedDocuments(chatId, session, groupId);
    } else if (text === 'Текущие документы') {
      handleCurrentDocuments(chatId, session, groupId);
    } else if (text === 'Неоплаченные документы') {
      handleUnpaidDocuments(chatId, session, groupId);
    } else if (text === 'Неоплаченные этапы') {
      handleUnpaidStages(chatId, session, groupId);
    } else if (text === 'Создать документ') {
      handleCreateDocument(chatId, session, groupId);
    }
    // Обработка кнопок раздела "Заказы"
    else if (text === 'Информация о заказе') {
      handleOrderInfo(chatId, session, groupId);
    } else if (text === '🔍 Упак. заказы') {
      handlePackagedOrders(chatId, session, groupId);
    } else if (text === 'Упакованные с долгом') {
      handlePackagedOrdersWithDebt(chatId, session, groupId);
    } else if (text === 'Заказы с долгом') {
      handleOrdersWithDebt(chatId, session, groupId);
    } else if (text === '🔍 Мои заказы') {
      handleMyOrders(chatId, session, groupId);
    } else if (text === '🔍 Все заказы') {
      handleAllOrders(chatId, session, groupId);
    } else if (text === 'Образцы') {
      handleSamples(chatId, session, groupId);
    } else if (text === 'Контроль ошибок') {
      handleErrorsControl(chatId, session, groupId);
    } else if (text === 'Зарегитрировать ошибку') {
      handleRegisterError(chatId, session, groupId);
    }
    // Обработка кнопок раздела "Отгрузки"
    else if (text === '5 последних отгрузок профиля') {
      handleShipmentsProfile(chatId, session, groupId);
    } else if (text === '5 последних отгрузок фасадов') {
      handleShipmentsFasade(chatId, session, groupId);
    }
    // Обработка ссылок на сущности
    else if (text.startsWith('/user')) {
      handleUserLink(chatId, text, session, appState);
    } else if (text.startsWith('/doc')) {
      handleDocumentLink(chatId, text, session, appState);
    } else if (text.startsWith('/stg')) {
      handleStageLink(chatId, text, session, appState);
    } else if (text.startsWith('/agent')) {
      handleAgentLink(chatId, text, session, appState);
    } else {
      // Проверяем режим и направляем в соответствующий обработчик
      if (session.mode && session.mode.id === 2 && session.mode.step > 0) {
        // Режим работы с документами (создание/редактирование)
        handleDocumentMode(bot, appState, msg, chatId, session, text, groupId);
      } else if (session.mode && session.mode.id === 1 && session.mode.step > 0) {
        // Режим работы с пользователями
        enqueueMessage(chatId, 'Режим работы с пользователями в разработке.');
      } else if (session.mode && session.mode.id === 3 && session.mode.step > 0) {
        // Режим работы с заказами
        enqueueMessage(chatId, 'Режим работы с заказами в разработке.');
      } else {
        // Эхо для неизвестных сообщений
        enqueueMessage(chatId, `Неизвестная команда. Используйте кнопки меню.`);
      }
    }
  },
  processDocument: (bot, appState, msg) => {
    const chatId = msg.chat.id;
    enqueueMessage(chatId, 'Обработка документов пока не реализована.');
  },
  processContact: (bot, appState, msg) => {
    const chatId = msg.chat.id;
    const session = appState.sessions.get(chatId);
    if (!session) return;
    
    // Сохранение номера телефона из контакта
    if (msg.contact && msg.contact.phone_number) {
      session.phone = msg.contact.phone_number;
      enqueueMessage(chatId, `✅ Номер телефона сохранён: ${msg.contact.phone_number}`);
      
      // Обновление в базе данных
      if (session.userId) {
        cubicRepo.editUser({ id: session.userId, phone: msg.contact.phone_number })
          .then(() => {
            console.log(`[Contact] Телефон обновлён для пользователя ${session.userId}`);
          })
          .catch(err => {
            console.error(`[Contact] Ошибка обновления телефона:`, err);
          });
      }
    }
  }
};

// ===== Обработчики ссылок =====

async function handleUserLink(chatId, text, session, appState) {
  const userId = parseInt(text.replace('/user', ''));
  try {
    const users = await cubicRepo.loadUsers();
    const user = users.find(u => u.ID === userId);
    if (user) {
      session.editableUser = user;
      session.mode = { id: 1, step: 100 };
      enqueueMessage(chatId, `Открыт пользователь: ${user.FIRST_NAME}`);
    } else {
      enqueueMessage(chatId, 'Пользователь не найден.');
    }
  } catch (error) {
    console.error('[UserLink] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки пользователя.');
  }
}

async function handleDocumentLink(chatId, text, session, appState) {
  const docId = parseInt(text.replace('/doc', ''));
  try {
    const doc = await cubicRepo.getDocumentById(docId);
    if (!doc) {
      enqueueMessage(chatId, 'Документ не найден.');
      return;
    }
    
    session.editableDocument = doc;
    session.mode = { id: 2, step: 100 };
    
    // Загружаем дополнительные данные для отображения
    const [stages, elements, users, typeElements, materials] = await Promise.all([
      cubicRepo.loadStages(),
      cubicRepo.loadStageElements(),
      cubicRepo.loadUsers(),
      cubicRepo.loadTypeElements(),
      cubicRepo.loadMaterials()
    ]);
    
    const docStages = stages.filter(s => s.DOCUMENT_ID === docId);
    const author = users.find(u => u.ID === doc.AUTHOR_ID);
    const statusName = doc.STATUS_ID === 1 ? 'Активный' : (doc.STATUS_ID === 2 ? 'Закрыт' : 'Неизвестно');
    
    // Формируем красивое сообщение с детальной информацией
    let message = `<b>📄 Документ № ${docId}</b>\n`;
    message += `—————————————\n`;
    message += `<b>Статус:</b> ${statusName}\n`;
    message += `<b>Автор:</b> ${author ? author.FIRST_NAME : 'Неизвестен'}\n`;
    
    if (doc.COMMENTARY) {
      message += `<b>Комментарий:</b> ${formatMessage(doc.COMMENTARY)}\n`;
    }
    
    message += `<b>Создан:</b> <code>${formatDateAndTime(doc.DATE_CREATION)}</code>\n`;
    message += `—————————————\n`;
    
    // Вычисляем суммы
    let totalSum = 0;
    let totalPayments = 0;
    
    docStages.forEach(stage => {
      const stageElements = elements.filter(e => e.ID_STAGE === stage.ID);
      stageElements.forEach(el => {
        const typeEl = typeElements.find(t => t.ID === el.TYPE_ELEMENT_ID);
        if (typeEl) {
          if (typeEl.ELEMENT_GROUP >= 2 && typeEl.ELEMENT_GROUP <= 6) {
            totalSum += (el.RESULT_SUM || 0);
          } else if (typeEl.ELEMENT_GROUP === 10 || typeEl.ELEMENT_GROUP === 11) {
            totalPayments += (el.RESULT_SUM || 0);
          }
        }
      });
    });
    
    message += `<b>💰 Сумма:</b> ${formatMonetary(totalSum)}\n`;
    message += `<b>💳 Оплачено:</b> ${formatMonetary(totalPayments)}\n`;
    message += `<b>💵 Баланс:</b> ${formatMonetary(totalSum - totalPayments)}\n`;
    message += `—————————————\n`;
    message += `<b>Этапов:</b> ${docStages.length}\n`;
    
    // Список этапов
    if (docStages.length > 0) {
      message += `\n<b>Этапы:</b>\n`;
      docStages.slice(0, 10).forEach((stage, idx) => {
        const stageElements = elements.filter(e => e.ID_STAGE === stage.ID);
        const firstEl = stageElements[0];
        let stageSum = 0;
        
        stageElements.forEach(el => {
          const typeEl = typeElements.find(t => t.ID === el.TYPE_ELEMENT_ID);
          if (typeEl && typeEl.ELEMENT_GROUP >= 2 && typeEl.ELEMENT_GROUP <= 6) {
            stageSum += (el.RESULT_SUM || 0);
          }
        });
        
        const material = materials.find(m => m.ID === stage.MATERIAL_ID);
        message += `${idx + 1}. /stg${stage.ID} - ${stage.STAGE_NAME || 'Без названия'}`;
        if (material) message += ` — ${material.NAME}`;
        if (stageSum > 0) message += ` — ${formatMonetary(stageSum)}`;
        message += `\n`;
      });
      
      if (docStages.length > 10) {
        message += `... и ещё ${docStages.length - 10} этапов\n`;
      }
    }
    
    enqueueMessage(chatId, message, { parse_mode: 'HTML' });
    
  } catch (error) {
    console.error('[DocumentLink] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки документа.');
  }
}

async function handleStageLink(chatId, text, session, appState) {
  const stageId = parseInt(text.replace('/stg', ''));
  try {
    const stage = await cubicRepo.getStageById(stageId);
    if (!stage) {
      enqueueMessage(chatId, 'Этап не найден.');
      return;
    }
    
    session.editableStage = stage;
    session.mode = { id: 2, step: 200 };
    
    // Загружаем дополнительные данные для отображения
    const [elements, users, materials, typeElements, docs] = await Promise.all([
      cubicRepo.loadStageElements(),
      cubicRepo.loadUsers(),
      cubicRepo.loadMaterials(),
      cubicRepo.loadTypeElements(),
      cubicRepo.loadDocuments()
    ]);
    
    const stageElements = elements.filter(e => e.ID_STAGE === stageId);
    const material = materials.find(m => m.ID === stage.MATERIAL_ID);
    const author = users.find(u => u.ID === stage.AUTHOR_ID);
    const doc = docs.find(d => d.ID === stage.DOCUMENT_ID);
    
    // Формируем сообщение с детальной информацией
    let message = `<b>⚖️ Этап № ${stageId}</b>\n`;
    message += `———————————\n`;
    message += `<b>Документ:</b> /doc${stage.DOCUMENT_ID}\n`;
    message += `<b>Название:</b> ${stage.STAGE_NAME || 'Без названия'}\n`;
    if (material) message += `<b>🌲 Массив:</b> ${material.NAME}\n`;
    if (author) message += `<b>👤 Автор:</b> ${author.FIRST_NAME}\n`;
    message += `<b>📅 Дата создания:</b> ${formatDateAndTime(stage.DATE_CREATION)}\n`;
    if (stage.DATE_STAGE) message += `<b>📅 Дата этапа:</b> ${formatDate(stage.DATE_STAGE)}\n`;
    if (stage.COMMENTARY) message += `<b>📝 Комментарий:</b> ${formatMessage(stage.COMMENTARY)}\n`;
    
    // Подсчет сумм и оплат
    let totalSum = 0;
    let totalPayments = 0;
    
    stageElements.forEach(el => {
      const typeEl = typeElements.find(t => t.ID === el.TYPE_ELEMENT_ID);
      if (typeEl) {
        if (typeEl.ELEMENT_GROUP >= 2 && typeEl.ELEMENT_GROUP <= 6) {
          totalSum += (el.RESULT_SUM || 0);
        } else if (typeEl.ELEMENT_GROUP === 10 || typeEl.ELEMENT_GROUP === 11) {
          totalPayments += (el.RESULT_SUM || 0);
        }
      }
    });
    
    message += `\n<b>📊 Финансы:</b>\n`;
    message += `💰 Сумма: ${formatMonetary(totalSum)}\n`;
    message += `💵 Оплачено: ${formatMonetary(totalPayments)}\n`;
    message += `📉 Баланс: ${formatMonetary(totalSum - totalPayments)}\n`;
    
    // Элементы этапа
    if (stageElements.length > 0) {
      message += `\n<b>📄 Элементы (${stageElements.length}):</b>\n`;
      stageElements.slice(0, 5).forEach((el, idx) => {
        const typeEl = typeElements.find(t => t.ID === el.TYPE_ELEMENT_ID);
        const sender = users.find(u => u.ID === el.SENDER_ID);
        const recipient = users.find(u => u.ID === el.RECIPIENT_ID);
        
        message += `${idx + 1}. ${typeEl ? typeEl.NAME : 'Неизвестно'}\n`;
        if (sender) message += `   👤 От: ${sender.FIRST_NAME}\n`;
        if (recipient) message += `   👤 Кому: ${recipient.FIRST_NAME}\n`;
        if (el.RESULT_VALUE) message += `   📊 Кол-во: ${el.RESULT_VALUE} м³\n`;
        if (el.PRICE) message += `   💰 Цена: ${formatMonetary(el.PRICE)}\n`;
        if (el.RESULT_SUM) message += `   💵 Сумма: ${formatMonetary(el.RESULT_SUM)}\n`;
        message += `\n`;
      });
      
      if (stageElements.length > 5) {
        message += `... и ещё ${stageElements.length - 5} элементов\n`;
      }
    }
    
    message += `———————————`;
    
    enqueueMessage(chatId, message);
  } catch (error) {
    console.error('[StageLink] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки этапа.');
  }
}

async function handleAgentLink(chatId, text, session, appState) {
  const agentId = parseInt(text.replace('/agent', ''));
  try {
    const users = await cubicRepo.loadUsers();
    const agent = users.find(u => u.ID === agentId);
    if (agent) {
      // Сохраняем выбранного агента в зависимости от текущего шага
      if (session.mode && session.mode.id === 2) {
        if (!session.editableElement) {
          session.editableElement = {};
        }
        session.editableElement.selectedAgent = agent;
        enqueueMessage(chatId, `Выбран контрагент: ${agent.FIRST_NAME}`);
        
        // Если мы на шаге 35 (ожидание выбора контрагента), автоматически переходим дальше
        if (session.mode.step === 35) {
          session.editableStage.SENDER_ID = agent.ID;
          session.editableStage.senderName = agent.FIRST_NAME;
          enqueueMessage(chatId, 'Укажи количество м³:', { reply_markup: { remove_keyboard: true } });
          session.mode.step = 36;
          delete session.editableElement;
        }
      }
    } else {
      enqueueMessage(chatId, 'Контрагент не найден.');
    }
  } catch (error) {
    console.error('[AgentLink] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки контрагента.');
  }
}

// ===== Обработчик режима документов (state machine) =====

async function handleDocumentMode(bot, appState, msg, chatId, session, text, groupId) {
  const step = session.mode.step;
  
  // Step 20: начало создания документа, запрос комментария
  if (step === 20) {
    let commentary = null;
    if (text !== '/skip') {
      commentary = text;
    }
    
    try {
      const docId = await cubicRepo.createDocument({
        authorId: session.userId,
        documentName: null,
        commentary: commentary
      });
      
      if (docId) {
        const doc = await cubicRepo.getDocumentById(docId);
        session.editableDocument = doc;
        session.editableDocument.ID = docId;
        
        // Предлагаем выбор типа этапа
        const typeElements = await cubicRepo.loadTypeElements();
        const keyboard = [];
        let row = [];
        
        typeElements.forEach((t, i) => {
          if (groupId === 7 && t.ELEMENT_GROUP >= 1 && t.ELEMENT_GROUP <= 6) {
            row.push(t.NAME);
          } else if (groupId === 5 && t.ELEMENT_GROUP === 1) {
            row.push(t.NAME);
          } else if (groupId === 3 && t.ELEMENT_GROUP >= 2 && t.ELEMENT_GROUP <= 5) {
            row.push(t.NAME);
          }
          
          if (row.length === 2) {
            keyboard.push([...row]);
            row = [];
          }
        });
        
        if (row.length > 0) keyboard.push(row);
        keyboard.push(['Создать пустой документ', 'Удалить документ']);
        
        enqueueMessage(chatId, 'Выбери этап или пропусти этот шаг.', {
          reply_markup: { keyboard, resize_keyboard: true }
        });
        
        session.mode.step = 31;
      } else {
        enqueueMessage(chatId, 'Ошибка создания документа.');
        session.mode = { id: 0, step: 0 };
      }
    } catch (error) {
      console.error('[CreateDocument] Ошибка:', error);
      enqueueMessage(chatId, 'Ошибка создания документа.');
      session.mode = { id: 0, step: 0 };
    }
  }
  
  // Step 31: выбор типа этапа после создания документа
  else if (step === 31) {
    if (text === 'Создать пустой документ') {
      enqueueMessage(chatId, `Документ №${session.editableDocument.ID} успешно добавлен.`);
      session.mode = { id: 2, step: 100 };
      return;
    }
    
    if (text === 'Удалить документ') {
      try {
        await cubicRepo.deleteDocument(session.editableDocument.ID);
        enqueueMessage(chatId, 'Документ удалён.');
        session.mode = { id: 0, step: 0 };
        session.editableDocument = null;
      } catch (error) {
        console.error('[DeleteDocument] Ошибка:', error);
        enqueueMessage(chatId, 'Ошибка удаления документа.');
      }
      return;
    }
    
    if (text === 'Отменить') {
      enqueueMessage(chatId, 'Процедура отменена.');
      session.mode = { id: 2, step: 100 };
      return;
    }
    
    // Проверяем, что выбран корректный тип элемента
    const typeElements = await cubicRepo.loadTypeElements();
    const selectedType = typeElements.find(t => t.NAME === text);
    
    if (selectedType) {
      session.editableStage = {
        DOCUMENT_ID: session.editableDocument.ID,
        STAGE_NAME: selectedType.NAME,
        AUTHOR_ID: session.userId,
        typeElementId: selectedType.ID,
        groupId: selectedType.ELEMENT_GROUP
      };
      
      // В зависимости от группы элемента выбираем следующий шаг
      if (selectedType.ELEMENT_GROUP === 1) {
        // Аванс - переходим к выбору получателя
        session.mode.step = 34;
        enqueueMessage(chatId, 'Укажи дату в формате ДД.ММ.ГГ\nИли пропусти этот шаг [/skip]', {
          reply_markup: { remove_keyboard: true }
        });
      } else if (selectedType.ELEMENT_GROUP >= 2 && selectedType.ELEMENT_GROUP <= 6) {
        // Выбор массива
        session.mode.step = 32;
        handleStageCreationMaterial(chatId, session);
      }
    } else {
      enqueueMessage(chatId, 'Неизвестная команда.');
    }
  }
  
  // Step 33: обработка выбранного массива
  else if (step === 33) {
    const materials = await cubicRepo.loadMaterials();
    const selectedMaterial = materials.find(m => m.NAME === text);
    
    if (selectedMaterial) {
      session.editableStage.MATERIAL_ID = selectedMaterial.ID;
      session.editableStage.materialName = selectedMaterial.NAME;
      
      // Запрашиваем список контрагентов (отправителей)
      const users = await cubicRepo.loadUsers();
      const contractors = users.filter(u => u.GROUP_ID === 4); // Группа контрагентов
      
      if (contractors.length > 0) {
        let msg = '<b>Выбери контрагента (отправителя):</b>\n';
        msg += '—'.repeat(22) + '\n';
        contractors.forEach((c, i) => {
          msg += `${i + 1}. /agent${c.ID} - ${c.FIRST_NAME}\n`;
        });
        msg += '—'.repeat(22);
        enqueueMessage(chatId, msg);
        session.mode.step = 35;
      } else {
        enqueueMessage(chatId, 'Не найдены контрагенты. Пожалуйста, создайте контрагента сначала.');
        session.mode = { id: 0, step: 0 };
      }
    } else {
      enqueueMessage(chatId, 'Материал не найден. Попробуйте снова.');
    }
  }
  
  // Step 35: получен контрагент через /agentXX, запрашиваем количество
  else if (step === 35) {
    // Проверяем, был ли выбран агент через link handler
    if (session.editableElement && session.editableElement.selectedAgent) {
      session.editableStage.SENDER_ID = session.editableElement.selectedAgent.ID;
      session.editableStage.senderName = session.editableElement.selectedAgent.FIRST_NAME;
      
      enqueueMessage(chatId, 'Укажи количество м³:', { reply_markup: { remove_keyboard: true } });
      session.mode.step = 36;
      
      // Очищаем временные данные
      delete session.editableElement;
    } else {
      enqueueMessage(chatId, 'Пожалуйста, выберите контрагента из списка выше, нажав на ссылку.');
    }
  }
  
  // Step 36: получено количество, запрашиваем цену
  else if (step === 36) {
    const quantity = parseFloat(text);
    if (!isNaN(quantity) && quantity > 0) {
      session.editableStage.quantity = quantity;
      enqueueMessage(chatId, 'Укажи цену за м³:');
      session.mode.step = 37;
    } else {
      enqueueMessage(chatId, 'Неверный формат. Укажи количество числом (например: 5.5)');
    }
  }
  
  // Step 37: получена цена, создаем этап и элемент
  else if (step === 37) {
    const price = parseFloat(text);
    if (!isNaN(price) && price >= 0) {
      session.editableStage.price = price;
      
      try {
        // Создаем этап
        const stageId = await cubicRepo.createStage({
          documentId: session.editableStage.DOCUMENT_ID,
          authorId: session.userId,
          stageName: session.editableStage.STAGE_NAME,
          materialId: session.editableStage.MATERIAL_ID,
          commentary: null,
          dateStage: null
        });
        
        if (stageId) {
          // Создаем элемент этапа
          const element = await cubicRepo.createElement({
            stageId: stageId,
            authorId: session.userId,
            typeElementId: session.editableStage.typeElementId,
            senderId: session.editableStage.SENDER_ID,
            recipientId: null,
            h: 0,
            w: 0,
            l: session.editableStage.quantity, // количество в поле L
            a: 0,
            price: session.editableStage.price,
            dateElement: null,
            typePayment: null
          });
          
          if (element) {
            const totalSum = (session.editableStage.quantity * session.editableStage.price).toFixed(2);
            enqueueMessage(chatId, `✅ Этап успешно создан!\n\n` +
              `📄 Документ: №${session.editableDocument.ID}\n` +
              `📚 Этап: ${session.editableStage.STAGE_NAME}\n` +
              `🌲 Массив: ${session.editableStage.materialName}\n` +
              `👤 Контрагент: ${session.editableStage.senderName}\n` +
              `📊 Количество: ${session.editableStage.quantity} м³\n` +
              `💰 Цена: ${formatMonetary(session.editableStage.price)}\n` +
              `💵 Сумма: ${formatMonetary(totalSum)}`
            );
            
            // Очищаем редактируемый этап
            session.editableStage = null;
            session.mode = { id: 0, step: 0 };
            
            // Возвращаем в главное меню
            const kb = appState.keyboards?.get(appState.buttons.homeMenu.name, groupId);
            const options = kb ? { reply_markup: { keyboard: kb, resize_keyboard: true } } : {};
            enqueueMessage(chatId, 'Главное меню', options);
          } else {
            enqueueMessage(chatId, 'Ошибка создания элемента этапа.');
          }
        } else {
          enqueueMessage(chatId, 'Ошибка создания этапа.');
        }
      } catch (error) {
        console.error('[CreateStage] Ошибка:', error);
        enqueueMessage(chatId, `Ошибка создания этапа: ${error.message}`);
      }
    } else {
      enqueueMessage(chatId, 'Неверный формат цены. Укажи цену числом (например: 1500)');
    }
  }
}

async function handleStageCreationMaterial(chatId, session) {
  try {
    const materials = await cubicRepo.loadMaterials();
    const keyboard = [];
    let row = [];
    
    materials.forEach((m, i) => {
      row.push(m.NAME);
      if (row.length === 3) {
        keyboard.push([...row]);
        row = [];
      }
    });
    
    if (row.length > 0) keyboard.push(row);
    
    enqueueMessage(chatId, 'Выбери массив с помощью кнопок клавиатуры:', {
      reply_markup: { keyboard, resize_keyboard: true }
    });
    
    session.mode.step = 33;
  } catch (error) {
    console.error('[StageMaterial] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки списка материалов.');
  }
}

// === Обработчики разделов ===

async function handleMoneyRequest(chatId, groupId, session) {
  // Только для групп 5 и 7
  if (![5, 7].includes(groupId)) {
    enqueueMessage(chatId, 'Нет доступа к этой информации.');
    return;
  }
  try {
    const result = await cubicRepo.executeQuery('SELECT AMOUNT FROM GET_BALANSE_CASSA', 'itm');
    if (result && result.length > 0) {
      enqueueMessage(chatId, `🥬 Касса: ${formatMonetary(result[0].AMOUNT)}`);
    }
  } catch (error) {
    console.error('[Money] Ошибка запроса баланса:', error);
    enqueueMessage(chatId, 'Ошибка получения баланса.');
  }
}

async function handleCashJournalRequest(chatId, groupId, session) {
  if (![5, 7].includes(groupId)) {
    enqueueMessage(chatId, 'Нет доступа к этой информации.');
    return;
  }
  try {
    // Формируем даты для Firebird в формате DD.MM.YYYY
    const today = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const formatDbDate = (date) => {
      const dd = ('0' + date.getDate()).slice(-2);
      const mm = ('0' + (date.getMonth() + 1)).slice(-2);
      const yyyy = date.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    };
    
    const dateFrom = formatDbDate(sevenDaysAgo);
    const dateTo = formatDbDate(today);
    
    // Ограничиваем количество записей до 20 для избежания переполнения сообщения
    const query = `SELECT FIRST 20 J.ID, J.FACT_DATE, J.MONEYSUM, J.CATEGORY, J.PURPOSE, J.COMMENT 
                   FROM JOURNAL_CASHFLOW J 
                   WHERE J.CATEGORY != '#СВЕРКА#' 
                     AND J.FACT_DATE >= '${dateFrom}' 
                     AND J.FACT_DATE <= '${dateTo}' 
                   ORDER BY J.ID DESC`;
    
    console.log('[CashJournal] Query:', query);
    const rows = await cubicRepo.executeQuery(query, 'itm');
    console.log('[CashJournal] Rows received:', rows ? rows.length : 0);
    
    if (!rows || rows.length === 0) {
      enqueueMessage(chatId, `За последние 7 дней нет кассовых операций.\n(${dateFrom} — ${dateTo})`);
      return;
    }
    
    let msg = `<b>💰 Кассовые операции (последние ${rows.length})</b>\n`;
    msg += `<i>${dateFrom} — ${dateTo}</i>\n`;
    msg += `${'—'.repeat(22)}\n\n`;
    
    rows.forEach((row, i) => {
      // Проверяем наличие полей
      const moneySum = parseFloat(row.MONEYSUM) || 0;
      const category = (row.CATEGORY || 'Без категории').toString();
      const purpose = (row.PURPOSE || '').toString();
      const comment = (row.COMMENT || '').toString();
      const factDate = row.FACT_DATE ? new Date(row.FACT_DATE) : new Date();
      
      msg += `${i + 1}. ${moneySum > 0 ? "🔹" : "🔻"} ${formatDate(factDate)}\n`;
      msg += `💰 ${formatMonetary(moneySum)}\n`;
      
      // Обрезаем длинные строки
      const catPurp = category + (purpose ? `; ${purpose}` : '');
      const displayText = catPurp.length > 100 ? catPurp.substring(0, 100) + '...' : catPurp;
      msg += `▪️ ${formatMessage(displayText)}\n`;
      
      if (comment && comment.length > 0) {
        const displayComment = comment.length > 80 ? comment.substring(0, 80) + '...' : comment;
        msg += `<i>${formatMessage(displayComment)}</i>\n`;
      }
      msg += '─────────────\n';
    });
    
    // Подсчитываем итого по всем записям (не только отображаемым)
    const income = rows.reduce((sum, r) => {
      const val = parseFloat(r.MONEYSUM) || 0;
      return val > 0 ? sum + val : sum;
    }, 0);
    const expense = rows.reduce((sum, r) => {
      const val = parseFloat(r.MONEYSUM) || 0;
      return val < 0 ? sum + val : sum;
    }, 0);
    
    msg += `\n<b><u>Итого (за период):</u></b>\n`;
    msg += `🔹 Приход: ${formatMonetary(income)}\n`;
    msg += `🔻 Расход: ${formatMonetary(Math.abs(expense))}`;
    
    console.log('[CashJournal] Message length:', msg.length);
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[CashJournal] Ошибка:', error);
    console.error('[CashJournal] Stack:', error.stack);
    enqueueMessage(chatId, `Ошибка получения журнала операций:\n<code>${error.message}</code>`);
  }
}

async function handleRegisteredUsers(chatId, session) {
  try {
    const users = await cubicRepo.loadUsers();
    const registered = users.filter(u => u.IS_REGISTERED);
    let msg = `Зарегистрированных: ${registered.length}\n${'—'.repeat(22)}\n`;
    registered.forEach((u, i) => {
      msg += `${i + 1}. ${u.FIRST_NAME} - ${u.GROUP_ID === 7 ? 'Администратор' : 'Пользователь'}${u.IS_BLOCKED ? ' (Заблокирован)' : ''}\n`;
    });
    enqueueMessage(chatId, msg || 'Список пуст.');
  } catch (error) {
    console.error('[Users] Ошибка загрузки пользователей:', error);
    enqueueMessage(chatId, 'Ошибка загрузки пользователей.');
  }
}

async function handleAwaitingRegistration(chatId, session) {
  try {
    const users = await cubicRepo.loadUsers();
    const awaiting = users.filter(u => !u.IS_REGISTERED);
    let msg = `Ожидают регистрацию: ${awaiting.length}\n${'—'.repeat(22)}\n`;
    awaiting.forEach((u, i) => {
      msg += `${i + 1}. ${u.FIRST_NAME} (ID: ${u.CHAT_ID})\n`;
    });
    enqueueMessage(chatId, msg || 'Список пуст.');
  } catch (error) {
    console.error('[Users] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки пользователей.');
  }
}

async function handleContractorsList(chatId, session) {
  try {
    const users = await cubicRepo.loadUsers();
    const contractors = users.filter(u => [3, 4].includes(u.GROUP_ID));
    let msg = `Список контрагентов: ${contractors.length}\n${'—'.repeat(22)}\n`;
    contractors.forEach((u, i) => {
      msg += `${i + 1}. ${u.FIRST_NAME} - ${u.GROUP_ID === 3 ? 'Агент' : 'Контрагент'}\n`;
    });
    enqueueMessage(chatId, msg || 'Список пуст.');
  } catch (error) {
    console.error('[Contractors] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки контрагентов.');
  }
}

function handleMyData(chatId, session, groupId) {
  const groupNames = { 1: 'Гость', 2: 'Клиент', 3: 'Агент', 4: 'Контрагент', 5: 'Плательщик', 6: 'Менеджер', 7: 'Администратор' };
  const msg = `${'—'.repeat(22)}
👤 ${session.firstName || 'Пользователь'}
${'—'.repeat(22)}
Роль: ${groupNames[groupId]}
Телефон: ${session.phone || 'Не указан'}
Карта: ${session.card || 'Не указана'}
Счет: ${session.billingAccountId || 'Не присвоен'}
${'—'.repeat(22)}`;
  enqueueMessage(chatId, msg);
}

// ===== Обработчики документов =====

async function handleAllDocuments(chatId, session, groupId) {
  try {
    const docs = await cubicRepo.loadDocuments();
    displayDocumentList(chatId, 'Все документы', docs);
  } catch (error) {
    console.error('[AllDocuments] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки документов.');
  }
}

async function handleMyDocuments(chatId, session, groupId) {
  try {
    const docs = await cubicRepo.loadDocuments();
    const myDocs = docs.filter(d => d.AUTHOR_ID === session.userId);
    displayDocumentList(chatId, 'Мои документы', myDocs);
  } catch (error) {
    console.error('[MyDocuments] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки документов.');
  }
}

async function handleClosedDocuments(chatId, session, groupId) {
  try {
    const docs = await cubicRepo.loadDocuments();
    const closedDocs = docs.filter(d => d.STATUS_ID === 2);
    displayDocumentList(chatId, 'Закрытые документы', closedDocs);
  } catch (error) {
    console.error('[ClosedDocuments] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки документов.');
  }
}

async function handleCurrentDocuments(chatId, session, groupId) {
  try {
    const docs = await cubicRepo.loadDocuments();
    const currentDocs = docs.filter(d => d.STATUS_ID === 1);
    displayDocumentList(chatId, 'Текущие документы', currentDocs);
  } catch (error) {
    console.error('[CurrentDocuments] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки документов.');
  }
}

async function handleUnpaidDocuments(chatId, session, groupId) {
  try {
    const docs = await cubicRepo.loadDocuments();
    const stages = await cubicRepo.loadStages();
    const elements = await cubicRepo.loadStageElements();
    
    const unpaidDocs = docs.filter(doc => {
      if (doc.STATUS_ID === 2) return false;
      const docStages = stages.filter(s => s.DOCUMENT_ID === doc.ID);
      return docStages.some(stage => isStageUnpaid(stage, elements));
    });
    
    displayDocumentList(chatId, 'Неоплаченные документы', unpaidDocs);
  } catch (error) {
    console.error('[UnpaidDocuments] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки документов.');
  }
}

async function handleUnpaidStages(chatId, session, groupId) {
  try {
    const docs = await cubicRepo.loadDocuments();
    const stages = await cubicRepo.loadStages();
    const elements = await cubicRepo.loadStageElements();
    const materials = await cubicRepo.loadMaterials();
    const typeElements = await cubicRepo.loadTypeElements();
    const users = await cubicRepo.loadUsers();
    
    const unpaidStages = stages.filter(stage => {
      const doc = docs.find(d => d.ID === stage.DOCUMENT_ID);
      if (!doc || doc.STATUS_ID !== 1) return false;
      const stageElements = elements.filter(e => e.ID_STAGE === stage.ID);
      if (stageElements.length === 0) return false;
      const firstElement = stageElements[0];
      const typeEl = typeElements.find(t => t.ID === firstElement.TYPE_ELEMENT_ID);
      if (!typeEl || typeEl.ELEMENT_GROUP === 1) return false;
      return isStageUnpaid(stage, elements);
    });
    
    if (unpaidStages.length === 0) {
      enqueueMessage(chatId, 'Список неоплаченных этапов пуст.');
      return;
    }
    
    let msg = `Неоплаченные этапы (${unpaidStages.length}):\n${'—'.repeat(22)}\n`;
    unpaidStages.forEach((stage, i) => {
      const doc = docs.find(d => d.ID === stage.DOCUMENT_ID);
      const material = materials.find(m => m.ID === stage.MATERIAL_ID);
      const stageElements = elements.filter(e => e.ID_STAGE === stage.ID);
      const firstElement = stageElements[0];
      const sender = users.find(u => u.ID === firstElement.SENDER_ID);
      
      msg += `📚 ${i + 1}. Док № ${doc.ID} [/doc${doc.ID}]\n`;
      msg += `✖️ Этап № ${stage.STAGE_NUMBER} [/stg${stage.ID}]\n`;
      msg += `▫️ ${formatDate(stage.DATE_STAGE)} ${stage.STAGE_NAME} - ${material?.NAME || ''}, ${sender?.FIRST_NAME || ''}\n`;
      msg += `▫️ ${firstElement.RESULT_VALUE} м³ × ${formatMonetary(firstElement.PRICE)}\n`;
      
      const summ = calculateStageSum(stage, elements, typeElements);
      const payments = calculateStagePayments(stage, elements, typeElements);
      msg += `▫️ ${formatMonetary(summ)} / ${formatMonetary(payments)}\n`;
      msg += `▫️ Оформлен: ${formatDateAndTime(stage.DATE_CREATION)}\n`;
      msg += '—'.repeat(16) + '\n';
    });
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[UnpaidStages] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки этапов.');
  }
}

async function handleCreateDocument(chatId, session, groupId) {
  if (![3, 7].includes(groupId)) {
    enqueueMessage(chatId, 'Нет прав на создание документа.');
    return;
  }
  
  session.mode = { id: 2, step: 20 };
  enqueueMessage(chatId, 'Внеси комментарий к документу, или можно использовать:\n[/skip], для пропуска этого шага.', { reply_markup: { remove_keyboard: true } });
}

// ===== Вспомогательные функции =====

function displayDocumentList(chatId, title, docs) {
  if (!docs || docs.length === 0) {
    enqueueMessage(chatId, `${title}:\nСписок пуст.`);
    return;
  }
  
  // Ограничиваем количество документов для избежания переполнения сообщения
  const maxDocs = 30;
  const displayDocs = docs.slice(0, maxDocs);
  const hasMore = docs.length > maxDocs;
  
  let msg = `<b>${title} (${docs.length})</b>\n${'—'.repeat(22)}\n`;
  displayDocs.forEach((doc, i) => {
    msg += `${i + 1}) /doc${doc.ID} - 📄 Док. № ${doc.ID} от ${formatDate(doc.DATE_CREATION)}`;
    if (doc.DOCUMENT_NAME) {
      const displayName = doc.DOCUMENT_NAME.length > 50 ? doc.DOCUMENT_NAME.substring(0, 50) + '...' : doc.DOCUMENT_NAME;
      msg += `\n   <b>${formatMessage(displayName)}</b>`;
    }
    if (doc.COMMENTARY) {
      const displayComment = doc.COMMENTARY.length > 80 ? doc.COMMENTARY.substring(0, 80) + '...' : doc.COMMENTARY;
      msg += `\n   <i>${formatMessage(displayComment)}</i>`;
    }
    msg += '\n' + '─'.repeat(16) + '\n';
  });
  
  if (hasMore) {
    msg += `\n<i>Показано ${maxDocs} из ${docs.length} документов</i>\n`;
  }
  msg += '—'.repeat(22);
  
  console.log(`[DocumentList] ${title}: ${docs.length} docs, message length: ${msg.length}`);
  enqueueMessage(chatId, msg);
}

function isStageUnpaid(stage, elements) {
  const stageElements = elements.filter(e => e.ID_STAGE === stage.ID);
  if (stageElements.length === 0) return false;
  
  let summ = 0;
  let payments = 0;
  
  stageElements.forEach(el => {
    if (el.TYPE_ELEMENT_ID >= 2 && el.TYPE_ELEMENT_ID <= 6) {
      summ += el.RESULT_SUM || 0;
    } else if (el.TYPE_ELEMENT_ID === 10 || el.TYPE_ELEMENT_ID === 11) {
      payments += el.RESULT_SUM || 0;
    }
  });
  
  return summ > payments;
}

function calculateStageSum(stage, elements, typeElements) {
  const stageElements = elements.filter(e => e.ID_STAGE === stage.ID);
  return stageElements.reduce((total, el) => {
    const typeEl = typeElements.find(t => t.ID === el.TYPE_ELEMENT_ID);
    if (typeEl && typeEl.ELEMENT_GROUP >= 2 && typeEl.ELEMENT_GROUP <= 6) {
      return total + (el.RESULT_SUM || 0);
    }
    return total;
  }, 0);
}

function calculateStagePayments(stage, elements, typeElements) {
  const stageElements = elements.filter(e => e.ID_STAGE === stage.ID);
  return stageElements.reduce((total, el) => {
    const typeEl = typeElements.find(t => t.ID === el.TYPE_ELEMENT_ID);
    if (typeEl && (typeEl.ELEMENT_GROUP === 10 || typeEl.ELEMENT_GROUP === 11)) {
      return total + (el.RESULT_SUM || 0);
    }
    return total;
  }, 0);
}

function formatDateAndTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${('0' + d.getDate()).slice(-2)}.${('0' + (d.getMonth() + 1)).slice(-2)}.${d.getFullYear()} ${('0' + d.getHours()).slice(-2)}:${('0' + d.getMinutes()).slice(-2)}`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const yy = d.getFullYear() % 100;
  return `${('0' + d.getDate()).slice(-2)}.${('0' + (d.getMonth() + 1)).slice(-2)}.${yy < 10 ? '0' : ''}${yy}`;
}

function formatMonetary(value) {
  if (value === null || value === undefined) return '<code>0.00</code> ₽';
  value = parseFloat(String(value).replace(',', '.').replace(' ', ''));
  if (isNaN(value)) return '<code>0.00</code> ₽';
  
  value = value.toFixed(2);
  let tempValue = [];
  let i = 0;
  
  [...value].reverse().forEach((element) => {
    if (i >= 3) {
      tempValue.push(' ');
      i = 0;
    }
    i++;
    if (element === '.') i = 0;
    tempValue.push(element);
  });
  
  return '<code>' + tempValue.reverse().join('') + '</code> ₽';
}

function formatMessage(text) {
  if (!text) return '';
  text = String(text).replace(/>/g, '&gt;');
  text = text.replace(/</g, '&lt;');
  return text;
}

// ===== Обработчики раздела "Заказы" =====

async function handleOrderInfo(chatId, session, groupId) {
  enqueueMessage(chatId, 'Введите номер заказа для получения информации:', { reply_markup: { remove_keyboard: true } });
  session.mode = { id: 3, step: 10 }; // Ждём ввода номера заказа
}

async function handlePackagedOrders(chatId, session, groupId) {
  if (![6, 7].includes(groupId)) {
    enqueueMessage(chatId, 'Нет доступа к этой информации.');
    return;
  }
  
  try {
    // Запрос упакованных заказов из ITM базы
    const query = `SELECT FIRST 20 O.ID, O.ITM_ORDERNUM, O.ORDERNUM, O.CLIENT, O.ORDER_TOTAL_COST, O.FASAD_MAT, O.FACT_DATE_FIRSTSAVE
                   FROM ORDERS O 
                   LEFT JOIN LIST_STATUSES L ON (O.ORDER_STATUS = L.STATUS_NUM)
                   WHERE O.ORDER_STATUS = 8
                   ORDER BY O.ID DESC`;
    const orders = await cubicRepo.executeQuery(query, 'itm');
    
    if (!orders || orders.length === 0) {
      enqueueMessage(chatId, 'Упакованных заказов нет.');
      return;
    }
    
    let msg = `<b>📦 Упакованные заказы (${orders.length})</b>\n${'—'.repeat(22)}\n`;
    orders.forEach((order, i) => {
      const orderNum = order.ITM_ORDERNUM || order.ORDERNUM || order.ID;
      msg += `${i + 1}. <a href="/order${order.ID}">🆔 ${orderNum}</a>\n`;
      msg += `📅 ${formatDate(order.FACT_DATE_FIRSTSAVE)}\n`;
      msg += `👤 ${order.CLIENT || 'Не указан'}\n`;
      msg += `💰 ${formatMonetary(order.ORDER_TOTAL_COST || 0)}\n`;
      if (order.FASAD_MAT) msg += `🌲 ${order.FASAD_MAT}\n`;
      msg += '─'.repeat(16) + '\n';
    });
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[PackagedOrders] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки заказов.');
  }
}

async function handlePackagedOrdersWithDebt(chatId, session, groupId) {
  if (groupId !== 7) {
    enqueueMessage(chatId, 'Нет доступа к этой информации.');
    return;
  }
  
  try {
    const query = `SELECT FIRST 20 O.ID, O.ITM_ORDERNUM, O.CLIENT, O.ORDER_TOTAL_COST, O.ORDER_PAY, O.FASAD_MAT, O.FACT_DATE_FIRSTSAVE
                   FROM ORDERS O 
                   LEFT JOIN CLIENTS C ON (O.CLIENT = C.CLIENTNAME)
                   WHERE O.ORDER_STATUS = 8 AND C.IS_PREPAID IS NULL AND (O.ORDER_TOTAL_COST - COALESCE(O.ORDER_PAY, 0)) * -1 < 0
                   ORDER BY O.ID DESC`;
    const orders = await cubicRepo.executeQuery(query, 'itm');
    
    if (!orders || orders.length === 0) {
      enqueueMessage(chatId, 'Упакованных заказов с долгом нет.');
      return;
    }
    
    let msg = `<b>⚠️ Упакованные заказы с долгом (${orders.length})</b>\n${'—'.repeat(22)}\n`;
    orders.forEach((order, i) => {
      const debt = Math.abs((order.ORDER_TOTAL_COST || 0) - (order.ORDER_PAY || 0));
      const orderNum = order.ITM_ORDERNUM || order.ID;
      msg += `${i + 1}. <a href="/order${order.ID}">🆔 ${orderNum}</a>\n`;
      msg += `📅 ${formatDate(order.FACT_DATE_FIRSTSAVE)}\n`;
      msg += `👤 ${order.CLIENT || 'Не указан'}\n`;
      msg += `💰 Сумма: ${formatMonetary(order.ORDER_TOTAL_COST || 0)}\n`;
      msg += `💸 Оплата: ${formatMonetary(order.ORDER_PAY || 0)}\n`;
      msg += `❌ Долг: ${formatMonetary(debt)}\n`;
      msg += '─'.repeat(16) + '\n';
    });
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[PackagedOrdersWithDebt] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки заказов.');
  }
}

async function handleOrdersWithDebt(chatId, session, groupId) {
  if (groupId !== 7) {
    enqueueMessage(chatId, 'Нет доступа к этой информации.');
    return;
  }
  
  try {
    const query = `SELECT FIRST 50 O.ID, O.ITM_ORDERNUM, O.CLIENT, O.ORDER_TOTAL_COST, O.ORDER_PAY 
                   FROM ORDERS O 
                   WHERE (COALESCE(O.ORDER_TOTAL_COST, 0) - COALESCE(O.ORDER_PAY, 0)) * -1 < 0
                   ORDER BY O.ID DESC`;
    const orders = await cubicRepo.executeQuery(query, 'itm');
    
    if (!orders || orders.length === 0) {
      enqueueMessage(chatId, 'Заказов с долгом нет.');
      return;
    }
    
    let msg = `<b>❌ Заказы с долгом (${orders.length})</b>\n${'—'.repeat(22)}\n`;
    let totalDebt = 0;
    
    orders.forEach((order, i) => {
      const debt = Math.abs((order.ORDER_TOTAL_COST || 0) - (order.ORDER_PAY || 0));
      totalDebt += debt;
      const orderNum = order.ITM_ORDERNUM || order.ID;
      msg += `${i + 1}. <a href="/order${order.ID}">🆔 ${orderNum}</a> - ${order.CLIENT || 'Не указан'}\n`;
      msg += `   Долг: ${formatMonetary(debt)}\n`;
      
      if ((i + 1) % 10 === 0) msg += '─'.repeat(16) + '\n';
    });
    
    msg += `\n${'—'.repeat(22)}\n`;
    msg += `<b>Общий долг: ${formatMonetary(totalDebt)}</b>`;
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[OrdersWithDebt] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки заказов.');
  }
}

async function handleMyOrders(chatId, session, groupId) {
  if (![6, 7].includes(groupId)) {
    enqueueMessage(chatId, 'Нет доступа к этой информации.');
    return;
  }
  
  try {
    // Заказы текущего пользователя (по имени)
    const userName = session.firstName || 'User';
    const query = `SELECT FIRST 20 O.ID, O.ITM_ORDERNUM, O.CLIENT, O.ORDER_TOTAL_COST, O.FASAD_MAT, O.FACT_DATE_FIRSTSAVE
                   FROM ORDERS O 
                   WHERE UPPER(O.MANAGER) LIKE '%${userName.toUpperCase()}%'
                   ORDER BY O.ID DESC`;
    const orders = await cubicRepo.executeQuery(query, 'itm');
    
    if (!orders || orders.length === 0) {
      enqueueMessage(chatId, 'У вас нет заказов.');
      return;
    }
    
    let msg = `<b>📋 Мои заказы (${orders.length})</b>\n${'—'.repeat(22)}\n`;
    orders.forEach((order, i) => {
      const orderNum = order.ITM_ORDERNUM || order.ID;
      msg += `${i + 1}. <a href="/order${order.ID}">🆔 ${orderNum}</a>\n`;
      msg += `📅 ${formatDate(order.FACT_DATE_FIRSTSAVE)}\n`;
      msg += `👤 ${order.CLIENT || 'Не указан'}\n`;
      msg += `💰 ${formatMonetary(order.ORDER_TOTAL_COST || 0)}\n`;
      msg += '─'.repeat(16) + '\n';
    });
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[MyOrders] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки заказов.');
  }
}

async function handleAllOrders(chatId, session, groupId) {
  if (![3, 6, 7].includes(groupId)) {
    enqueueMessage(chatId, 'Нет доступа к этой информации.');
    return;
  }
  
  try {
    const query = `SELECT FIRST 30 O.ID, O.ITM_ORDERNUM, O.CLIENT, O.ORDER_TOTAL_COST, O.FASAD_MAT, O.ORDER_STATUS, O.FACT_DATE_FIRSTSAVE
                   FROM ORDERS O 
                   LEFT JOIN LIST_STATUSES L ON (O.ORDER_STATUS = L.STATUS_NUM)
                   WHERE O.ORDER_STATUS > -3
                   ORDER BY O.ID DESC`;
    const orders = await cubicRepo.executeQuery(query, 'itm');
    
    if (!orders || orders.length === 0) {
      enqueueMessage(chatId, 'Заказов нет.');
      return;
    }
    
    let msg = `<b>📦 Все заказы (${orders.length})</b>\n${'—'.repeat(22)}\n`;
    orders.forEach((order, i) => {
      const packed = order.ORDER_STATUS === 8 ? '📦 Упак.' : '⏳ В работе';
      const orderNum = order.ITM_ORDERNUM || order.ID;
      msg += `${i + 1}. <a href="/order${order.ID}">🆔 ${orderNum}</a> ${packed}\n`;
      msg += `📅 ${formatDate(order.FACT_DATE_FIRSTSAVE)} - ${order.CLIENT || 'Не указан'}\n`;
      msg += `💰 ${formatMonetary(order.ORDER_TOTAL_COST || 0)}\n`;
      msg += '─'.repeat(16) + '\n';
    });
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[AllOrders] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки заказов.');
  }
}

async function handleSamples(chatId, session, groupId) {
  enqueueMessage(chatId, '🌲 Раздел "Образцы" в разработке.');
}

async function handleErrorsControl(chatId, session, groupId) {
  enqueueMessage(chatId, '⚠️ Раздел "Контроль ошибок" в разработке.');
}

async function handleRegisterError(chatId, session, groupId) {
  if (groupId !== 7) {
    enqueueMessage(chatId, 'Нет доступа к этой функции.');
    return;
  }
  enqueueMessage(chatId, '📝 Регистрация ошибки в разработке.');
}

// ===== Обработчики раздела "Отгрузки" =====

async function handleShipmentsProfile(chatId, session, groupId) {
  try {
    const query = `SELECT FIRST 5 J.FACT_DATE_OUT, J.DRIVER_NAME, SUM(J.BOX_COUNT) AS BOX, SUM(O.ORDER_TOTAL_COST) AS AMOUNT
                   FROM ORDERS O
                   LEFT JOIN JOURNAL_OUT J ON (J.ORDER_ID = O.ID)
                   LEFT JOIN CLIENTS C ON (O.CLIENT = C.CLIENTNAME)
                   WHERE C.PROFILER = 1
                   GROUP BY J.FACT_DATE_OUT, J.DRIVER_NAME
                   ORDER BY J.FACT_DATE_OUT DESC`;
    const shipments = await cubicRepo.executeQuery(query, 'itm');
    
    if (!shipments || shipments.length === 0) {
      enqueueMessage(chatId, 'Отгрузок профиля нет.');
      return;
    }
    
    let msg = `🚚 5 последних отгрузок профиля:\n${'—'.repeat(22)}\n`;
    shipments.forEach((sh, i) => {
      msg += `${i + 1}. 📅 ${formatDate(sh.FACT_DATE_OUT)}\n`;
      msg += `👤 Водитель: ${sh.DRIVER_NAME || 'Не указан'}\n`;
      msg += `📦 ${sh.BOX || 0} уп.\n`;
      msg += `💰 ${formatMonetary(sh.AMOUNT || 0)}\n`;
      msg += '—'.repeat(16) + '\n';
    });
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[ShipmentsProfile] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки отгрузок.');
  }
}

async function handleShipmentsFasade(chatId, session, groupId) {
  try {
    const query = `SELECT FIRST 5 J.FACT_DATE_OUT, J.DRIVER_NAME, SUM(J.BOX_COUNT) AS BOX, SUM(O.ORDER_TOTAL_COST) AS AMOUNT
                   FROM ORDERS O
                   LEFT JOIN JOURNAL_OUT J ON (J.ORDER_ID = O.ID)
                   LEFT JOIN CLIENTS C ON (O.CLIENT = C.CLIENTNAME)
                   WHERE C.PROFILER != 1
                   GROUP BY J.FACT_DATE_OUT, J.DRIVER_NAME
                   ORDER BY J.FACT_DATE_OUT DESC`;
    const shipments = await cubicRepo.executeQuery(query, 'itm');
    
    if (!shipments || shipments.length === 0) {
      enqueueMessage(chatId, 'Отгрузок фасадов нет.');
      return;
    }
    
    let msg = `🚚 5 последних отгрузок фасадов:\n${'—'.repeat(22)}\n`;
    shipments.forEach((sh, i) => {
      msg += `${i + 1}. 📅 ${formatDate(sh.FACT_DATE_OUT)}\n`;
      msg += `👤 Водитель: ${sh.DRIVER_NAME || 'Не указан'}\n`;
      msg += `📦 ${sh.BOX || 0} уп.\n`;
      msg += `💰 ${formatMonetary(sh.AMOUNT || 0)}\n`;
      msg += '—'.repeat(16) + '\n';
    });
    
    enqueueMessage(chatId, msg);
  } catch (error) {
    console.error('[ShipmentsFasade] Ошибка:', error);
    enqueueMessage(chatId, 'Ошибка загрузки отгрузок.');
  }
}
