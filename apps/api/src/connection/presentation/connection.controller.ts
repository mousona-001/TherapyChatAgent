import {
  Controller, Post, Patch, Get, Body, Param, Query, Req, Res, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ConnectionService } from '../application/connection.service';
import { RequestConnectionDto, RespondConnectionDto } from '../dto/connection.dto';
import { Request, Response } from 'express';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateStatusDto {
  @ApiProperty({ enum: ['available', 'unavailable', 'busy'] })
  @IsString()
  status!: 'available' | 'unavailable' | 'busy';
}

@ApiTags('Connections')
@ApiBearerAuth()
@Controller('connections')
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  /** Patient → request a therapist */
  @Post('request')
  @ApiOperation({ summary: 'Patient requests a connection with a therapist' })
  async requestConnection(@Req() req: Request, @Res() res: Response, @Body() dto: RequestConnectionDto) {
    try {
      const userId: string = (req as any).user?.id ?? '';

      const connection = await this.connectionService.requestConnection(userId, dto);
      return res.status(HttpStatus.CREATED).json(connection);
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.BAD_REQUEST).json({ error: e.message });
    }
  }

  /** Therapist → accept/reject a pending connection */
  @Patch(':id/respond')
  @ApiOperation({ summary: 'Therapist accepts or rejects a connection request' })
  async respondConnection(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Body() dto: RespondConnectionDto,
  ) {
    try {
      const userId: string = (req as any).user?.id ?? '';

      const updated = await this.connectionService.respondToConnection(userId, id, dto);
      return res.status(HttpStatus.OK).json(updated);
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.BAD_REQUEST).json({ error: e.message });
    }
  }

  /** List connections — patient or therapist (pass role=patient|therapist) */
  @Get()
  @ApiOperation({ summary: 'List all connections for the authenticated user' })
  async listConnections(
    @Req() req: Request,
    @Res() res: Response,
    @Query('role') role: 'patient' | 'therapist',
  ) {
    try {
      const userId: string = (req as any).user?.id ?? '';

      const connections = await this.connectionService.listConnections(userId, role ?? 'patient');
      return res.status(HttpStatus.OK).json(connections);
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message });
    }
  }

  /** Therapist → toggle availability status */
  @Patch('therapist/status')
  @ApiOperation({ summary: 'Therapist updates their availability status' })
  async updateStatus(@Req() req: Request, @Res() res: Response, @Body() dto: UpdateStatusDto) {
    try {
      const userId: string = (req as any).user?.id ?? '';
      const result = await this.connectionService.updateStatus(userId, dto.status);
      return res.status(HttpStatus.OK).json(result);
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message });
    }
  }

  /** Patient → submit rating and review */
  @Post(':id/feedback')
  @ApiOperation({ summary: 'Patient submits rating and review for a connection' })
  async submitFeedback(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Body() dto: { rating: number; review: string },
  ) {
    try {
      const userId: string = (req as any).user?.id ?? '';
      const result = await this.connectionService.submitFeedback(userId, id, dto);
      return res.status(HttpStatus.OK).json(result);
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.BAD_REQUEST).json({ error: e.message });
    }
  }

  /** GET /api/connections/therapist/:id/reviews */
  @Get('therapist/:id/reviews')
  @AllowAnonymous() // Allow potential patients to see reviews
  @ApiOperation({ summary: 'Get all reviews for a specific therapist' })
  async getReviews(@Param('id') id: string, @Res() res: Response) {
    try {
      const reviews = await this.connectionService.getTherapistReviews(id);
      return res.status(HttpStatus.OK).json(reviews);
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message });
    }
  }
}
