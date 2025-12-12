import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Context } from 'telegraf';

/**
 * Decorator to get current authenticated user from context
 * Usage: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const context = ctx.getArgByIndex(0) as Context;
    return (context as any).user;
  },
);
