import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class BoardGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyBoardOwner(boardId: string, userId: string) {
    const board = await this.prisma.board.findFirst({ where: { id: boardId, userId } });
    if (!board) throw new ForbiddenException('Board not found or access denied');
    return board;
  }

  async getGroups(boardId: string, userId: string) {
    await this.verifyBoardOwner(boardId, userId);
    const groups = await this.prisma.boardGroup.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        items: { orderBy: { position: 'asc' } },
      },
    });
    return { data: groups };
  }

  async createGroup(boardId: string, userId: string, dto: CreateGroupDto) {
    await this.verifyBoardOwner(boardId, userId);
    const count = await this.prisma.boardGroup.count({ where: { boardId } });
    const group = await this.prisma.boardGroup.create({
      data: { name: dto.name, color: dto.color ?? '#0085FF', position: count, boardId },
      include: { items: true },
    });
    return { data: group };
  }

  async deleteGroup(boardId: string, groupId: string, userId: string) {
    await this.verifyBoardOwner(boardId, userId);
    const group = await this.prisma.boardGroup.findFirst({ where: { id: groupId, boardId } });
    if (!group) throw new NotFoundException('Group not found');
    await this.prisma.boardGroup.delete({ where: { id: groupId } });
    return { message: 'Group deleted' };
  }

  async createItem(boardId: string, groupId: string, userId: string, dto: CreateItemDto) {
    await this.verifyBoardOwner(boardId, userId);
    const group = await this.prisma.boardGroup.findFirst({ where: { id: groupId, boardId } });
    if (!group) throw new NotFoundException('Group not found');
    const count = await this.prisma.boardItem.count({ where: { groupId } });
    const item = await this.prisma.boardItem.create({
      data: { name: dto.name, status: dto.status, priority: dto.priority, owner: dto.owner, position: count, groupId },
    });
    return { data: item };
  }

  async updateItem(boardId: string, groupId: string, itemId: string, userId: string, dto: UpdateItemDto) {
    await this.verifyBoardOwner(boardId, userId);
    const item = await this.prisma.boardItem.findFirst({ where: { id: itemId, groupId } });
    if (!item) throw new NotFoundException('Item not found');
    const updated = await this.prisma.boardItem.update({
      where: { id: itemId },
      data: { ...dto },
    });
    return { data: updated };
  }

  async deleteItem(boardId: string, groupId: string, itemId: string, userId: string) {
    await this.verifyBoardOwner(boardId, userId);
    const item = await this.prisma.boardItem.findFirst({ where: { id: itemId, groupId } });
    if (!item) throw new NotFoundException('Item not found');
    await this.prisma.boardItem.delete({ where: { id: itemId } });
    return { message: 'Item deleted' };
  }
}
