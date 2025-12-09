/**
 * SQL Queries for Payment and Expense Operations (ITM Database)
 * Extracted from Node-RED flows.json
 */

export const PaymentsQueries = {
  // Get cashbox balance
  getCashboxBalance: () => `
    SELECT AMOUNT 
    FROM GET_BALANSE_CASSA
  `,

  // Get cash flow journal for specific date
  getCashFlowByDate: (date: string) => ({
    query: `
      SELECT * 
      FROM JOURNAL_CASHFLOW J 
      WHERE J.category != '#СВЕРКА#' 
        AND CAST(J.fact_date AS DATE) = CAST(? AS DATE)
      ORDER BY J.ID DESC
    `,
    params: [date]
  }),

  // Get cash flow journal for last 7 days
  getCashFlowLastSevenDays: (startDate: string, endDate: string) => ({
    query: `
      SELECT * 
      FROM JOURNAL_CASHFLOW J 
      WHERE J.category != '#СВЕРКА#' 
        AND CAST(J.fact_date AS DATE) >= CAST(? AS DATE)
        AND CAST(J.fact_date AS DATE) <= CAST(? AS DATE)
      ORDER BY J.ID DESC
    `,
    params: [startDate, endDate]
  }),

  // Create cash flow entry
  createCashFlowEntry: (
    factDate: string,
    category: string,
    purpose: string,
    moneySum: number,
    comment: string
  ) => `
    INSERT INTO JOURNAL_CASHFLOW (FACT_DATE, CATEGORY, PURPOSE, MONEYSUM, COMMENT, TS)
    VALUES ('${factDate}', '${category}', '${purpose}', ${moneySum}, '${comment}', CURRENT_TIMESTAMP)
  `,

  // Update cash flow entry
  updateCashFlowEntry: (
    id: number,
    factDate?: string,
    category?: string,
    purpose?: string,
    moneySum?: number,
    comment?: string
  ) => {
    const updates: string[] = [];
    if (factDate) updates.push(`FACT_DATE = '${factDate}'`);
    if (category) updates.push(`CATEGORY = '${category}'`);
    if (purpose) updates.push(`PURPOSE = '${purpose}'`);
    if (moneySum !== undefined) updates.push(`MONEYSUM = ${moneySum}`);
    if (comment) updates.push(`COMMENT = '${comment}'`);
    
    return `
      UPDATE JOURNAL_CASHFLOW 
      SET ${updates.join(', ')}, TS = CURRENT_TIMESTAMP
      WHERE ID = ${id}
    `;
  },

  // Delete cash flow entry (soft delete)
  deleteCashFlowEntry: (id: number) => `
    UPDATE JOURNAL_CASHFLOW 
    SET DELETED = -1 
    WHERE ID = ${id}
  `,

  // Get cash flow categories
  getCashFlowCategories: () => `
    SELECT DISTINCT CATEGORY 
    FROM JOURNAL_CASHFLOW 
    WHERE CATEGORY IS NOT NULL AND CATEGORY != '#СВЕРКА#'
    ORDER BY CATEGORY
  `,

  // Get order payment details
  getOrderPayments: (orderId: number) => `
    SELECT O.ORDER_TOTAL_COST, O.ORDER_PAY,
           (O.ORDER_TOTAL_COST - COALESCE(O.ORDER_PAY, 0)) * -1 AS ORDER_DEBT
    FROM ORDERS O
    WHERE O.ID = ${orderId}
  `,

  // Calculate advance balance for user/billing account
  getAdvanceBalance: (billingAccountId?: number) => {
    const billingCondition = billingAccountId 
      ? `AND tr.id_billing_account = ${billingAccountId}` 
      : '';
    
    return `
      SELECT TR.ID_BILLING_ACCOUNT, 
             SUM(E.RESULT_SUM * TR.MODIFER) AS BALANCE
      FROM TG_STAGE_ELEMENTS E
      LEFT JOIN TG_TYPE_ELEMENT T ON (E.TYPE_ELEMENT_ID = T.ID)
      LEFT JOIN TG_STAGES S ON (E.ID_STAGE = S.ID)
      LEFT JOIN tg_transactions tr ON (tr.id_stage_element = E.id)
      WHERE (s.isdeleted IS NULL OR (s.isdeleted = 0))
        AND T.ELEMENT_GROUP = 1
        AND TR.ID_BILLING_ACCOUNT IS NOT NULL
        ${billingCondition}
      GROUP BY TR.ID_BILLING_ACCOUNT
    `;
  },
};
