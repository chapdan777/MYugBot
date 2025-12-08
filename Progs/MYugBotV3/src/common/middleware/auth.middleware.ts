import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { UsersService, User } from '../../users/users.service';

/**
 * Authentication middleware for Telegram bot
 * Authenticates user by Telegram ID and attaches user to context
 */
@Injectable()
export class AuthMiddleware {
  constructor(private readonly usersService: UsersService) {}

  async authenticate(ctx: Context, next: () => Promise<void>) {
    if (!ctx.from) {
      return next();
    }

    try {
      // Find or create user by Telegram ID
      const user = await this.usersService.findOrCreateUser({
        telegram_id: ctx.from.id,
        chat_id: ctx.chat?.id || ctx.from.id,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        username: ctx.from.username,
      });

      // Check if user is blocked
      if (user && user.is_blocked) {
        await ctx.reply('Ваш аккаунт заблокирован. Обратитесь к администратору.');
        return;
      }

      // Attach user to context for use in handlers
      (ctx as any).user = user;
    } catch (error) {
      console.error('Authentication error:', error);
    }

    return next();
  }
}
