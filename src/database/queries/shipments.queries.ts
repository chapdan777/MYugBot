/**
 * SQL Queries for Shipment Operations (ITM Database)
 * Extracted from Node-RED flows.json
 */

export const ShipmentsQueries = {
  // Get shipments list for profile or facades
  getShipmentsList: (isProfile: boolean) => `
    SELECT J.FACT_DATE_OUT, J.DRIVER_NAME, 
           SUM(J.BOX_COUNT) AS BOX, 
           SUM(O.ORDER_TOTAL_COST) AS AMOUNT,
           SUM(O.ORDER_TOTAL_COST - O.ORDER_PAY) AS DEBT
    FROM ORDERS O
    INNER JOIN JOURNAL_OUT J ON (J.ORDER_ID = O.ID)
    INNER JOIN CLIENTS C ON (O.CLIENT = C.CLIENTNAME)
    WHERE ${isProfile ? 'C.PROFILER = 1' : '(C.PROFILER != 1 OR C.PROFILER IS NULL)'}
    GROUP BY J.FACT_DATE_OUT, J.DRIVER_NAME
    ORDER BY J.FACT_DATE_OUT DESC
  `,

  // Get shipment details by date and driver
  getShipmentDetails: (isProfile: boolean) => `
    SELECT O.ID, C.CLIENTNAME, J.BOX_COUNT, 
           O.ORDER_TOTAL_COST as AMOUNT,
           (O.ORDER_TOTAL_COST - O.ORDER_PAY) as DEBT
    FROM ORDERS O
    INNER JOIN JOURNAL_OUT J on (J.ORDER_ID = O.ID)
    INNER JOIN CLIENTS C on (O.CLIENT = C.CLIENTNAME)
    WHERE ${isProfile ? 'C.PROFILER = 1' : '(C.PROFILER != 1 OR C.PROFILER IS NULL)'}
    AND J.DRIVER_NAME = ?
    AND CAST(J.FACT_DATE_OUT AS DATE) = ?
  `,

  // Get packed orders notification data
  getPackedOrdersForNotification: (lastPackedId: number) => `
    SELECT DISTINCT P.ID, O.ID AS ID_ORDER, O.ITM_ORDERNUM, 
           P.PACK_TYPE, P.BOX_COUNT,
           E.ID AS ID_MANAGER, O.MANAGER, O.CLIENT, C.PHONE,
           COALESCE(O.ORDER_TOTAL_COST, 0) AS ORDER_TOTAL_COST,
           COALESCE(O.ORDER_PAY, 0) AS ORDER_PAY, C.PROFILER 
    FROM JOURNAL_UPACK P
    INNER JOIN ORDERS O ON (P.ORDER_ID = O.ID)
    INNER JOIN CLIENTS C ON (O.CLIENT = C.CLIENTNAME)
    INNER JOIN EMPLOYERS E ON (O.MANAGER = E.NAME)
    WHERE P.ID > ${lastPackedId}
    ORDER BY P.ID DESC
  `,

  // Get max packed order ID
  getMaxPackedOrderId: () => `
    SELECT MAX(p.id) AS ID 
    FROM journal_upack p
  `,

  // Get or set telegram data (for tracking last notifications)
  getTelegramData: (key: string) => `
    SELECT d.value_data 
    FROM telegram_data d 
    WHERE UPPER(d.name_data) = UPPER('${key}')
  `,

  // Set telegram data
  setTelegramData: (key: string, value: string) => `
    SELECT ID 
    FROM SET_TELEGRAM_DATA ('${key}', '${value}')
  `,
};