

# # 📘 Документ: SQL-запросы к БД ITM

**Проект:** Telegram Bot / Node-RED
**Назначение:** каталог SQL-запросов, выполняемых в БД **ITM**, для последующего переноса или использования в Qoder.

---

# ## 1. Общая структура

Все SQL-запросы к системе ITM выполняются через:

```
app.db.executeRequest(user, 'itm', query)
```

Запросы можно разделить на категории:

1. **Служебные**
2. **Работа с заказами**
3. **Элементы заказов**
4. **Производственные журналы**
5. **Статусы заказов**
6. **Отправки (логистика)**
7. **Клиенты и менеджеры**

Ниже приведён полный перечень запросов с назначением.

---

# # 2. Служебные запросы

## ### 2.1 Получение сохранённого параметра lastPacked

```sql
select d.value_data
from telegram_data d
where upper(d.name_data) = upper(:key)
```

### Использование

Определяет, с какого места считывать новые упаковки.

---

## ### 2.2 Получение максимального ID упаковки

```sql
select max(p.id) as ID
from journal_upack p
```

### Использование

Если параметр отсутствует, устанавливается начальная точка отсчёта.

---

## ### 2.3 Запись параметра lastPacked

```sql
select ID
from SET_TELEGRAM_DATA (:key, :value)
```

---

# # 3. Работа с заказами (ORDERS)

## ### 3.1 Получение списка заказов по динамическому условию

```sql
<queryGetOrder(extrQuery)>
```

### Назначение

Возвращает список заказов по статусу, менеджеру, долгу и другим критериям.

---

## ### 3.2 Получение заказа по ID

```sql
select *
from ORDERS O
left join LIST_STATUSES S on S.STATUS_NUM = O.ORDER_STATUS
where O.ID = :orderId
```

---

## ### 3.3 Получение планов заказа

```sql
select *
from orders_date_plan p
where p.order_id = :orderId
order by p.date3, p.id
```

---

# # 4. Элементы заказа (ORDERS_ELEMENTS)

## ### 4.1 Получение элементов заказа

```sql
select *
from ORDERS_ELEMENTS L
where L.ORDER_ID = :orderId
```

---

# # 5. Производственные журналы

## ### 5.1 Получение данных по процессам (шлифовка, брак, упаковка, отгрузка)

```sql
select O.ID,
       JS.DATE_GEN_ORDER_END as SHLIF_DATE,
       JS.FREEZE_FLAG as SHLIF_FREEZE_FLAG,
       JS.comment as SHLIF_COMMENT,
       JL.lack_date as LACK_DATE,
       JL.freeze_flag as LACK_FREEZE_FLAG,
       JL.COMMENT as LACK_COMMENT,
       JU.date_pack as UPACK_DATE,
       JO.pack_type,
       JO.fact_date_out
from ORDERS O
left join JOURNAL_LACK JL on JL.ORDER_ID = O.ID
left join JOURNAL_SHLIF JS on JS.ORDER_ID = O.ID
left join JOURNAL_UPACK JU on JU.ORDER_ID = O.ID
left join JOURNAL_OUT JO on JO.ORDER_ID = O.ID
where O.ID = :orderId
```

---

# # 6. История действий / статусы заказа

## ### 6.1 Последние изменения по заказу

```sql
select first 10 S.MANAGER,
                S.DESCRIPTION
from ORDER_STATUSES S
where S.ORDER_ID = :orderId
order by S.TIME_STAMP desc
```

---

# # 7. Логистика (Отправки)

## ### 7.1 Получение списка последних отправок

```sql
select J.FACT_DATE_OUT,
       J.DRIVER_NAME,
       sum(J.BOX_COUNT) as BOX,
       sum(O.ORDER_TOTAL_COST) as AMOUNT
from ORDERS O
left join JOURNAL_OUT J on J.ORDER_ID = O.ID
left join CLIENTS C on O.CLIENT = C.CLIENTNAME
where C.PROFILER :profilerCondition
group by J.FACT_DATE_OUT, J.DRIVER_NAME
order by J.FACT_DATE_OUT desc
```

---

## ### 7.2 Детализация отправки по водителю и дате

```sql
select O.ID,
       C.CLIENTNAME,
       J.BOX_COUNT,
       O.order_total_cost as AMOUNT
from ORDERS_ELEMENTS E
left join ORDERS O on E.ORDER_ID = O.ID
left join JOURNAL_OUT J on J.ORDER_ID = O.ID
left join CLIENTS C on O.CLIENT = C.CLIENTNAME
where C.PROFILER :profilerCondition
  and upper(J.DRIVER_NAME) = upper(:driverName)
  and J.FACT_DATE_OUT = :date
group by O.ID, O.order_total_cost, C.CLIENTNAME, J.BOX_COUNT
```

---

# # 8. Клиенты и менеджеры

## ### 8.1 Получение имени менеджера (по ITM_ID)

```sql
select e.name
from employers e
where e.id = :itmId
```

---

# # 9. Упаковка — получение новых упакованных заказов

```sql
select distinct 
    P.ID,
    O.ID as ID_ORDER,
    O.ITM_ORDERNUM,
    P.PACK_TYPE,
    P.BOX_COUNT,
    E.ID as ID_MANAGER,
    O.MANAGER,
    O.CLIENT,
    C.PHONE,
    coalesce(O.ORDER_TOTAL_COST, 0) as ORDER_TOTAL_COST,
    coalesce(O.ORDER_PAY, 0) as ORDER_PAY,
    C.PROFILER
from JOURNAL_UPACK P
left join ORDERS O on P.ORDER_ID = O.ID
left join CLIENTS C on O.CLIENT = C.CLIENTNAME
left join EMPLOYERS E on O.MANAGER = E.NAME
where P.ID > :lastPackedId
order by P.ID desc
```

---

# # 10. Краткий список всех запросов (для навигации)

| №  | Назначение               | SQL                    |
| -- | ------------------------ | ---------------------- |
| 1  | lastPacked – чтение      | telegram_data          |
| 2  | lastPacked – максимум    | journal_upack          |
| 3  | lastPacked – запись      | SET_TELEGRAM_DATA      |
| 4  | Список заказов           | queryGetOrder          |
| 5  | Заказ по ID              | ORDERS                 |
| 6  | Элементы заказа          | ORDERS_ELEMENTS        |
| 7  | План производства        | orders_date_plan       |
| 8  | Производственные журналы | JOURNAL_XXX            |
| 9  | История статусов         | ORDER_STATUSES         |
| 10 | Список отправок          | JOURNAL_OUT            |
| 11 | Детали отправки          | JOURNAL_OUT + GROUP BY |
| 12 | Менеджер по ITM ID       | employers              |
| 13 | Новые упаковки           | JOURNAL_UPACK          |

---
