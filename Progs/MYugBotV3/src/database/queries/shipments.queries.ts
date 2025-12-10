/**
 * SQL Queries for Shipment Operations (ITM Database)
 * Extracted from Node-RED flows.json
 */

export const ShipmentsQueries = {
  // Get shipments list for profile or facades
  getShipmentsList: (isProfile: boolean) => {
    const profilerCondition = isProfile ? '= 1' : '!= 1';
    return `
      SELECT J.FACT_DATE_OUT, 
             J.DRIVER_NAME, 
             SUM(J.BOX_COUNT) AS BOX, 
             SUM(O.ORDER_TOTAL_COST) AS AMOUNT
      FROM ORDERS O
      INNER JOIN JOURNAL_OUT J ON (J.ORDER_ID = O.ID)
      LEFT JOIN CLIENTS C ON (O.CLIENT = C.CLIENTNAME)
      WHERE C.PROFILER ${profilerCondition}
      GROUP BY J.FACT_DATE_OUT, J.DRIVER_NAME
      ORDER BY J.FACT_DATE_OUT DESC
    `;
  },

  // Get shipment details by date and driver
  getShipmentDetails: (driverName: string, shipmentDate: string, isProfile: boolean) => {
    const profilerCondition = isProfile ? '= 1' : '!= 1';
    // Ensure date is in proper format for database comparison
    let formattedDate = shipmentDate;
    if (shipmentDate.includes('T')) {
      // Convert ISO date to YYYY-MM-DD format
      formattedDate = shipmentDate.split('T')[0];
    }
    return `
      SELECT o.ID,
             c.CLIENTNAME,
             j.BOX_COUNT AS BOX_COUNT,
             o.ORDER_TOTAL_COST AS AMOUNT
      FROM ORDERS o
      INNER JOIN JOURNAL_OUT j ON (j.ORDER_ID = o.ID)
      LEFT JOIN CLIENTS c ON (o.CLIENT = c.CLIENTNAME)
      WHERE c.PROFILER ${profilerCondition} AND
            UPPER(j.DRIVER_NAME) = '${driverName.toUpperCase()}' AND
            j.FACT_DATE_OUT = '${formattedDate}'
      GROUP BY o.ID, c.CLIENTNAME, j.BOX_COUNT, o.ORDER_TOTAL_COST
    `;
  },

  // Get packed orders notification data
  getPackedOrdersForNotification: (lastPackedId: number) => `
    SELECT DISTINCT P.ID, O.ID AS ID_ORDER, O.ITM_ORDERNUM, 
           P.PACK_TYPE, P.BOX_COUNT,
           E.ID AS ID_MANAGER, O.MANAGER, O.CLIENT, C.PHONE,
           COALESCE(O.ORDER_TOTAL_COST, 0) AS ORDER_TOTAL_COST,
           COALESCE(O.ORDER_PAY, 0) AS ORDER_PAY, C.PROFILER 
    FROM JOURNAL_UPACK P
    LEFT JOIN ORDERS O ON (P.ORDER_ID = O.ID)
    LEFT JOIN CLIENTS C ON (O.CLIENT = C.CLIENTNAME)
    LEFT JOIN EMPLOYERS E ON (O.MANAGER = E.NAME)
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