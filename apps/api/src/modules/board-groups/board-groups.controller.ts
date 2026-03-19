import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BoardGroupsService } from './board-groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateUpdateDto } from './dto/create-update.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('board-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('boards/:boardId/groups')
export class BoardGroupsController {
  constructor(private readonly service: BoardGroupsService) {}

  @Get()
  getGroups(@Param('boardId') boardId: string, @CurrentUser() user: { id: string }) {
    return this.service.getGroups(boardId, user.id);
  }

  @Post()
  createGroup(@Param('boardId') boardId: string, @CurrentUser() user: { id: string }, @Body() dto: CreateGroupDto) {
    return this.service.createGroup(boardId, user.id, dto);
  }

  @Delete(':groupId')
  deleteGroup(@Param('boardId') boardId: string, @Param('groupId') groupId: string, @CurrentUser() user: { id: string }) {
    return this.service.deleteGroup(boardId, groupId, user.id);
  }

  @Post(':groupId/items')
  createItem(@Param('boardId') boardId: string, @Param('groupId') groupId: string, @CurrentUser() user: { id: string }, @Body() dto: CreateItemDto) {
    return this.service.createItem(boardId, groupId, user.id, dto);
  }

  @Patch(':groupId/items/:itemId')
  updateItem(@Param('boardId') boardId: string, @Param('groupId') groupId: string, @Param('itemId') itemId: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(boardId, groupId, itemId, user.id, dto);
  }

  @Delete(':groupId/items/:itemId')
  deleteItem(@Param('boardId') boardId: string, @Param('groupId') groupId: string, @Param('itemId') itemId: string, @CurrentUser() user: { id: string }) {
    return this.service.deleteItem(boardId, groupId, itemId, user.id);
  }

  // ── Item Updates (comments) ─────────────────────────────────────────────────
  @Get(':groupId/items/:itemId/updates')
  getUpdates(@Param('boardId') boardId: string, @Param('itemId') itemId: string, @CurrentUser() user: { id: string }) {
    return this.service.getUpdates(boardId, itemId, user.id);
  }

  @Post(':groupId/items/:itemId/updates')
  createUpdate(@Param('boardId') boardId: string, @Param('itemId') itemId: string, @CurrentUser() user: { id: string }, @Body() dto: CreateUpdateDto) {
    return this.service.createUpdate(boardId, itemId, user.id, dto);
  }

  @Delete(':groupId/items/:itemId/updates/:updateId')
  deleteUpdate(@Param('boardId') boardId: string, @Param('itemId') itemId: string, @Param('updateId') updateId: string, @CurrentUser() user: { id: string }) {
    return this.service.deleteUpdate(boardId, itemId, updateId, user.id);
  }
}
