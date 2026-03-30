import { Controller, Get, Query, Req, Res, HttpStatus, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { RecommendationService } from '../application/recommendation.service';
import { Request, Response } from 'express';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * GET /api/recommendations/therapists?q=anxiety&limit=5
   * Returns therapists ranked by semantic relevance + availability + rating + past interaction.
   */
  @Get('therapists')
  @ApiOperation({ summary: 'Get AI-ranked therapist recommendations based on patient query' })
  @ApiQuery({ name: 'q', description: 'Patient condition or concern' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 5)' })
  async getTherapists(
    @Req() req: Request,
    @Res() res: Response,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const userId: string = (req as any).user?.id ?? '';
      const maxResults = limit ? parseInt(limit, 10) : 5;
      const results = await this.recommendationService.getRecommendations(userId, query ?? '', maxResults);
      return res.status(HttpStatus.OK).json(results);
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message });
    }
  }

  /**
   * POST /api/recommendations/therapists/:id/index
   * Triggers re-indexing for a therapist (call after profile create/update).
   */
  @Post('therapists/:id/index')
  @ApiOperation({ summary: 'Re-index a therapist profile for recommendations (internal/admin)' })
  async indexTherapist(@Param('id') therapistId: string, @Res() res: Response) {
    try {
      await this.recommendationService.indexTherapist(therapistId);
      return res.status(HttpStatus.OK).json({ message: 'Therapist indexed successfully' });
    } catch (e: any) {
      return res.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({ error: e.message });
    }
  }
}
