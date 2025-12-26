import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { User } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: GetUsersDto): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const page = query.page ? Math.max(1, query.page) : 1;
    const limit = query.limit ? Math.max(1, Math.min(100, query.limit)) : 10; // ограничиваем лимит от 1 до 100
    return await this.usersService.getAllUsersWithPagination(page, limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    return user;
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    // For now, we'll use the findOrCreateUser method which already exists
    // In the future, we might want to have a dedicated create method
    const newUser = {
      telegram_id: createUserDto.telegram_id,
      chat_id: createUserDto.chat_id,
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      username: createUserDto.username,
      phone_number: createUserDto.phone_number,
      card: createUserDto.card,
      card_owner: createUserDto.card_owner,
    };
    
    const user = await this.usersService.findOrCreateUser(newUser);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

 @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersService.updateUserById(id, updateUserDto);
    if (!user) {
      throw new Error(`User with ID ${id} not found or could not be updated`);
    }
    return user;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    // Note: We don't have a delete method in the service yet, so we'll throw an error
    throw new Error('Delete operation not implemented yet');
  }
}