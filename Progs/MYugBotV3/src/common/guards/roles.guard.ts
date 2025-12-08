import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Context } from 'telegraf';

/**
 * Role-based access control guard
 * Checks if user has required role to access a handler
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<number[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No role requirement
    }

    const ctx = context.getArgByIndex(0) as Context;
    const user = (ctx as any).user;

    if (!user) {
      return false;
    }

    // Check if user has any of the required roles
    return requiredRoles.includes(user.group_id);
  }
}
