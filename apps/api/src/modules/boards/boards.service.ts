import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const boards = await this.prisma.board.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, description: true, type: true, createdAt: true },
    });
    return { data: boards };
  }

  async create(userId: string, dto: CreateBoardDto) {
    const board = await this.prisma.board.create({
      data: { name: dto.name, description: dto.description, type: dto.type ?? 'NORMAL', userId },
      select: { id: true, name: true, description: true, type: true, createdAt: true },
    });
    return { data: board };
  }

  async findOne(id: string, userId: string) {
    const board = await this.prisma.board.findFirst({
      where: { id, userId },
      select: { id: true, name: true, description: true, type: true, createdAt: true },
    });
    if (!board) throw new NotFoundException('Board not found');
    return { data: board };
  }

  async remove(id: string, userId: string) {
    const board = await this.prisma.board.findFirst({ where: { id, userId } });
    if (!board) throw new NotFoundException('Board not found');
    await this.prisma.board.delete({ where: { id } });
    return { message: 'Board deleted' };
  }
}
