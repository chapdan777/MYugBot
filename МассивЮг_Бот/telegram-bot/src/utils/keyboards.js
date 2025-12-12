// Клавиатуры, скопированные из Node-RED flows. Логика доступа по ролям сохранена.
const buttons = require('./buttons');

module.exports = {
  get(message, groupId, conditionArr = []) {
    // conditionArr — массив условий для скрытия кнопок: [{ [buttonName]: true }]
    // Истина скрывает кнопку
    let keyboard = [];
    let tempKeyboard = this.menuList.find(menu => menu.button.name == message);
    if (tempKeyboard) {
      // Проверка прав на сам раздел: groups:[] или [-1] — доступно всем
      const sectionGroups = tempKeyboard.button.groups || [];
      if (sectionGroups.length > 0 && !sectionGroups.includes(-1) && !sectionGroups.includes(groupId)) {
        return null;
      }
      tempKeyboard.keyboard.forEach(row => {
        let tempButtons = [];
        row.forEach(button => {
          // Проверка доступа: groups:[] или groups:[-1] — доступно всем
          if (button.groups.length === 0 || button.groups.includes(-1)) {
            const condition = conditionArr.find(item => item[button.name]);
            if (!condition || !condition[button.name]) tempButtons.push({ text: button.name });
          } else {
            // Иначе — точное совпадение groupId
            if (button.groups.includes(groupId)) {
              const condition = conditionArr.find(item => item[button.name]);
              if (!condition || !condition[button.name]) tempButtons.push({ text: button.name });
            }
          }
        });
        if (tempButtons.length > 0) keyboard.push(tempButtons);
      });
      if (keyboard.length > 0) return keyboard;
      else return null;
    } else return null;
  },
  permissionCheck(p, id) {
    let groups = p.groups;
    if (groups && groups instanceof Array) {
      if (groups.length > 0) {
        for (const iterator of groups) {
          if (iterator == id) {
            return true;
          }
        }
      } else {
        return true;
      }
    } else {
      return false;
    }
  },
  menuList: [
    {
      button: buttons.homeMenu,
      keyboard: [
        [buttons.menu.documents, buttons.menu.users, buttons.menu.orders],
        [buttons.menu.shipments, buttons.menu.newsletters, buttons.orders.samples],
        [buttons.menu.money, buttons.menu.cashTransactions, buttons.menu.profile]
      ]
    },
    {
      button: buttons.menu.documents,
      keyboard: [
        [buttons.documents.createDocument],
        [buttons.documents.unpaidStages],
        [buttons.documents.unpaidDocuments, buttons.documents.currentDocuments, buttons.documents.myDocuments],
        [buttons.documents.closedDocuments, buttons.documents.allDocuments],
        [buttons.users.createCounterparty],
        [buttons.homeMenu, buttons.comeBackMenu]
      ]
    },
    {
      button: buttons.menu.users,
      keyboard: [
        [buttons.users.registeredUsers, buttons.users.awaitingRegistration],
        [buttons.users.createUser, buttons.users.listContractors, buttons.users.createCounterparty],
        [buttons.users.myData],
        [buttons.homeMenu, buttons.comeBackMenu]
      ]
    },
    {
      button: buttons.menu.orders,
      keyboard: [
        [buttons.orders.informationAboutOrder, buttons.orders.myOrders, buttons.orders.errorsOrders],
        [buttons.orders.generalOrders, buttons.orders.packagedOrders],
        [buttons.homeMenu, buttons.comeBackMenu]
      ]
    },
    {
      button: buttons.orders.errorsOrders,
      keyboard: [
        [buttons.orders.errorsRegister],
        [buttons.homeMenu, buttons.comeBackMenu]
      ]
    },
    {
      button: buttons.menu.shipments,
      keyboard: [
        [buttons.shipments.shipmentsProfile],
        [buttons.shipments.shipmentsFasade],
        [buttons.homeMenu, buttons.comeBackMenu]
      ]
    },
    {
      button: buttons.menu.newsletters,
      keyboard: [
        [buttons.newsletters.myNewsletters, buttons.newsletters.availableNewsletters],
        [buttons.homeMenu, buttons.comeBackMenu]
      ]
    },
    {
      button: buttons.users.editUser,
      keyboard: [
        [buttons.users.editFirstName, buttons.users.editLastName],
        [buttons.users.editPhone, buttons.users.editCard, buttons.users.editGroup],
        [buttons.users.blockUser, buttons.users.unblockUser],
        [buttons.save, buttons.cancellation]
      ]
    },
    {
      button: buttons.documents.editDocument,
      keyboard: [
        [buttons.documents.addStage, buttons.documents.makeAnAdvance],
        [buttons.documents.closeDocument, buttons.documents.deleteDocument],
        [buttons.homeMenu, buttons.comeBackMenu]
      ]
    },
    {
      button: buttons.documents.editStage,
      keyboard: [
        [buttons.documents.addPayment, buttons.documents.addPaymentAdvance],
        [buttons.documents.backToOrder, buttons.documents.changeStage],
        [buttons.homeMenu]
      ]
    },
    {
      button: buttons.documents.changeStage,
      keyboard: [
        [buttons.documents.changeStageMassiv, buttons.documents.changeStageValue, buttons.documents.changeStagePrice],
        [buttons.documents.changeStageСounterparty, buttons.documents.deletePayment, buttons.documents.deleteStage],
        [buttons.documents.backToOrder, buttons.documents.backToStage],
        [buttons.homeMenu]
      ]
    }
  ]
};
