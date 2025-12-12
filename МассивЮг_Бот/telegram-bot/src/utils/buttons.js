// Кнопки, скопированные из Node-RED flows (русские названия)
module.exports = {
  /*
  1 Гость
  2 Клиент
  3 Агент
  4 Контрагент
  5 Плательщик
  6 Менеджер
  7 Администратор
  */
  menu: {
    documents: { name: 'Документы', groups: [1, 3, 5, 7] },
    shipments: { name: 'Отгрузки', groups: [5, 7] },
    users: { name: 'Пользователи', groups: [3, 7] },
    newsletters: { name: 'Рассылки', groups: [7] },
    orders: { name: 'Заказы', groups: [3, 6, 7] },
    cashTransactions: { name: 'Журнал расходов', groups: [5, 7] },
    money: { name: 'Капуста', groups: [5, 7] },
    profile: { name: 'Мой профиль', groups: [-1] }
  },
  money: {
    moneyInCashbox: { name: 'В кассе', groups: [-1] },
    moneyCostsToDay: { name: 'Расходы сегодня', groups: [-1] }
  },
  documents: {
    allDocuments: { name: 'Все документы', groups: [3, 5, 7] },
    myDocuments: { name: 'Мои документы', groups: [-1] },
    createDocument: { name: 'Создать документ', groups: [3, 7] },
    closedDocuments: { name: 'Закрытые документы', groups: [3, 5, 7] },
    currentDocuments: { name: 'Текущие документы', groups: [3, 5, 7] },
    unpaidDocuments: { name: 'Неоплаченные документы', groups: [] },
    unpaidStages: { name: 'Неоплаченные этапы', groups: [3, 5, 7] },
    editDocument: { name: 'Редактировать документ', groups: [] },
    editStage: { name: 'Редактировать этап', groups: [] },
    addStage: { name: 'Добавить этап', groups: [] },
    addPayment: { name: 'Внести оплату', groups: [5, 7] },
    addPaymentAdvance: { name: 'Оплатить авансом', groups: [3, 5, 7] },
    deletePayment: { name: 'Удалить оплату', groups: [5, 7] },
    makeAnAdvance: { name: 'Внести аванс', groups: [5, 7] },
    closeDocument: { name: 'Закрыть документ', groups: [] },
    backToOrder: { name: 'Вернуться в документ', groups: [] },
    backToStage: { name: 'Вернуться', groups: [] },
    deleteDocument: { name: 'Удалить документ', groups: [3, 7] },
    deleteStage: { name: 'Удалить этап', groups: [3, 7] },
    createEmptyDocument: { name: 'Создать пустой документ', groups: [] },
    changeStage: { name: 'Изменить этап', groups: [] },
    changeStageMassiv: { name: 'Ред. массив', groups: [] },
    changeStageSender: { name: 'Ред. отправителя', groups: [] },
    changeStageСounterparty: { name: 'Ред. контрагента', groups: [-1] },
    changeStageValue: { name: 'Ред. кол-во', groups: [] },
    changeStagePrice: { name: 'Ред. цену', groups: [] }
  },
  payment: {
    payCash: { name: 'Наличные', groups: [] },
    payCard: { name: 'Карта', groups: [] },
    payBill: { name: 'Счёт', groups: [] },
    payOther: { name: 'Другое', groups: [] }
  },
  orders: {
    informationAboutOrder: { name: 'Информация о заказе', groups: [8] },
    packagedOrders: { name: '🔍 Упак. заказы', groups: [6, 7] },
    packagedOrdersWithDebt: { name: 'Упакованные с долгом', groups: [7] },
    ordersWithDebt: { name: 'Заказы с долгом', groups: [7] },
    myOrders: { name: '🔍 Мои заказы', groups: [6, 7] },
    generalOrders: { name: '🔍 Все заказы', groups: [3, 6, 7] },
    samples: { name: 'Образцы', groups: [6, 7] },
    errorsOrders: { name: 'Контроль ошибок', groups: [8] },
    errorsRegister: { name: 'Зарегитрировать ошибку', groups: [7] }
  },
  shipments: {
    shipmentsProfile: { name: '5 последних отгрузок профиля', groups: [] },
    shipmentsFasade: { name: '5 последних отгрузок фасадов', groups: [] }
  },
  newsletters: {
    myNewsletters: { name: 'Мои рассылки', groups: [7] },
    availableNewsletters: { name: 'Доступные рассылки', groups: [7] },
    subscribe: { name: 'Подписаться', groups: [7] },
    unsubscribe: { name: 'Отписаться', groups: [7] }
  },
  users: {
    registeredUsers: { name: 'Зарегистрированные', groups: [7] },
    awaitingRegistration: { name: 'Ожидают регистрацию', groups: [7] },
    createUser: { name: 'Создать пользователя', groups: [7] },
    createCounterparty: { name: 'Добавить контрагента', groups: [3, 7] },
    meCounterparty: { name: 'Я - контрагент', groups: [3, 7] },
    listContractors: { name: 'Список контрагенов', groups: [3, 7] },
    editUser: { name: 'Редактировать пользователя', groups: [3, 5, 6, 7] },
    blockUser: { name: 'Заблокировать пользователя', groups: [7] },
    unblockUser: { name: 'Разблокировать пользователя', groups: [7] },
    editFirstName: { name: 'Изменить Имя', groups: [3, 5, 6, 7] },
    editLastName: { name: 'Изменить фамилию', groups: [3, 5, 6, 7] },
    editPhone: { name: 'Изменить номер телефона', groups: [3, 5, 6, 7] },
    editCard: { name: 'Изменить карту', groups: [3, 5, 6, 7] },
    editGroup: { name: 'Изменить роль', groups: [7] },
    myData: { name: 'Мои данные', groups: [3, 5, 6, 7] }
  },
  comeBackMenu: { name: 'Назад', groups: [], default: true },
  test: { name: 'Тест', groups: [0] },
  homeMenu: { name: 'Главное меню', groups: [], default: true },
  helpMenu: { name: 'Помощь', groups: [] },
  skipStep: { name: 'Пропустить этот шаг', groups: [0, 1] },
  save: { name: 'Сохранить', groups: [] },
  сonfirm: { name: 'Подтвердить', groups: [] },
  cancellation: { name: 'Отменить', groups: [] },
  interesting: { name: 'Интересное', groups: [] }
};
