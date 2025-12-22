/**
 * SQL Queries for User Operations
 * Extracted from Node-RED flows.json
 */

export const UsersQueries = {
  // Find user by Telegram ID
  findByTelegramId: (telegramId: number) => `
    SELECT u.id, u.chat_id as telegram_id, u.chat_id, u.group_id, 
           u.first_name, u.last_name, u.username,
           u.is_registered, u.is_blocked,
           CASE u.group_id
             WHEN 1 THEN 'Guest'
             WHEN 2 THEN 'Client'
             WHEN 3 THEN 'Agent'
             WHEN 4 THEN 'Contractor'
             WHEN 5 THEN 'Payer'
             WHEN 6 THEN 'Manager'
             WHEN 7 THEN 'Administrator'
             ELSE 'Guest'
           END as role_name
    FROM tg_users u
    WHERE u.chat_id = ${telegramId}
  `,

  // Create new user
  createUser: (telegramId: number, chatId: number, firstName: string, lastName?: string, username?: string) => `
    INSERT INTO tg_users (telegram_id, chat_id, first_name, last_name, username, group_id, is_registered, is_blocked)
    VALUES (${telegramId}, ${chatId}, '${firstName}', ${lastName ? `'${lastName}'` : 'NULL'}, ${username ? `'${username}'` : 'NULL'}, 1, 0, 0)
  `,

  // Get user with employee mapping (from ITM database)
  getUserWithEmployeeMapping: (userId: number) => `
    SELECT first 1 e.itm_id 
    FROM TG_USERS U 
    LEFT JOIN employees e ON (e.tg_id = U.id) 
    WHERE U.ID = ${userId} AND e.itm_id IS NOT NULL
  `,

  // Get all registered users
  getRegisteredUsers: () => `
    SELECT u.id, u.telegram_id, u.chat_id, u.group_id,
           u.first_name, u.last_name, u.username,
           u.is_registered, u.is_blocked,
           g.name as role_name
    FROM tg_users u
    LEFT JOIN tg_user_groups g ON g.id = u.group_id
    WHERE u.is_registered = -1
    ORDER BY u.id
  `,

  // Get users awaiting registration
  getAwaitingRegistration: () => `
    SELECT u.id, u.telegram_id, u.chat_id, u.group_id,
           u.first_name, u.last_name, u.username,
           u.is_registered, u.is_blocked,
           g.name as role_name
    FROM tg_users u
    LEFT JOIN tg_user_groups g ON g.id = u.group_id
    WHERE u.is_registered = 0
    ORDER BY u.id
  `,

  // Get contractors (agents and counterparties)
  getContractors: () => `
    SELECT u.id, u.telegram_id, u.first_name, u.last_name,
           u.group_id, u.is_blocked,
           g.name as role_name
    FROM tg_users u
    LEFT JOIN tg_user_groups g ON g.id = u.group_id
    WHERE u.group_id IN (3, 4)
    ORDER BY u.first_name
  `,

  // Update user profile
  updateUserProfile: (userId: number, firstName?: string, lastName?: string, phone?: string, card?: string, cardOwner?: string) => {
    const updates: string[] = [];
    if (firstName) updates.push(`first_name = '${firstName}'`);
    if (lastName) updates.push(`last_name = '${lastName}'`);
    if (phone) updates.push(`phone_number = '${phone}'`);
    if (card) updates.push(`card = '${card}'`);
    if (cardOwner) updates.push(`card_owner = '${cardOwner}'`);
    
    return `
      UPDATE tg_users u
      SET ${updates.join(', ')}
      WHERE u.id = ${userId}
    `;
  },

  // Update user group (role)
  updateUserGroup: (userId: number, groupId: number) => `
    UPDATE tg_users u
    SET u.group_id = ${groupId}
    WHERE u.id = ${userId}
  `,

  // Block user
  blockUser: (userId: number) => `
    UPDATE tg_users u
    SET u.is_blocked = -1
    WHERE u.id = ${userId}
  `,

  // Unblock user
  unblockUser: (userId: number) => `
    UPDATE tg_users u
    SET u.is_blocked = 0
    WHERE u.id = ${userId}
  `,

  // Register user
  registerUser: (userId: number) => `
    UPDATE tg_users u
    SET u.is_registered = -1
    WHERE u.id = ${userId}
  `,

  // Get user groups
  getUserGroups: () => `
    SELECT id, name, description
    FROM tg_user_groups
    ORDER BY id
  `,

  // Send message to all users in a specific group
  getUsersByGroupId: (groupId: number) => `
    SELECT u.id, u.telegram_id, u.chat_id, u.first_name
    FROM tg_users u
    WHERE u.group_id = ${groupId} AND u.is_blocked = 0
  `,
};
