import {
	Controller,
	Get,
	HttpStatus,
	Param,
	Post,
	Query,
	Res,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiTags,
} from "@nestjs/swagger";
import { Session, UserSession } from "@thallesp/nestjs-better-auth";
import { Response } from "express";
import { RecommendationService } from "../application/recommendation.service";

@ApiTags("Recommendations")
@ApiBearerAuth()
@Controller("recommendations")
export class RecommendationController {
	constructor(private readonly recommendationService: RecommendationService) {}

	/**
	 * GET /api/recommendations/therapists?q=anxiety&limit=5
	 * Returns therapists ranked by semantic relevance + availability + rating + past interaction.
	 */
	@Get("therapists")
	@ApiOperation({
		summary: "Get AI-ranked therapist recommendations based on patient query",
	})
	@ApiQuery({ name: "q", description: "Patient condition or concern" })
	@ApiQuery({
		name: "limit",
		required: false,
		description: "Max results (default 5)",
	})
	@ApiQuery({
		name: "expand",
		required: false,
		description: "Use LLM to semantically expand the query (deep analysis)",
	})
	async getTherapists(
		@Session() session: UserSession,
		@Res() res: Response,
		@Query("q") query: string,
		@Query("limit") limit?: string,
		@Query("expand") expand?: string,
	) {
		try {
			const userId: string = session.user.id;
			const maxResults = limit ? parseInt(limit, 10) : 5;
			const expandQuery = expand === "true";
			const results = await this.recommendationService.getRecommendations(
				userId,
				query ?? "",
				maxResults,
				expandQuery,
			);
			return res.status(HttpStatus.OK).json(results);
		} catch (e: any) {
			return res
				.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ error: e.message });
		}
	}

	/**
	 * GET /api/recommendations/therapists/search?q=anxiety&limit=8&offset=0
	 * Direct text search by name, specialization, bio, or methods.
	 * Does not need patient profile — used by the search input.
	 */
	@Get("therapists/search")
	@ApiOperation({
		summary: "Search therapists by name, specialty, or concern",
	})
	@ApiQuery({ name: "q", description: "Search term" })
	@ApiQuery({ name: "limit", required: false, description: "Page size (default 8)" })
	@ApiQuery({ name: "offset", required: false, description: "Number of results to skip (default 0)" })
	async searchTherapists(
		@Session() session: UserSession,
		@Res() res: Response,
		@Query("q") query: string,
		@Query("limit") limit?: string,
		@Query("offset") offsetStr?: string,
	) {
		try {
			const pageSize = limit ? parseInt(limit, 10) : 8;
			const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
			const results = await this.recommendationService.searchTherapists(
				query ?? "",
				pageSize,
				offset,
			);
			return res.status(HttpStatus.OK).json(results);
		} catch (e: any) {
			return res
				.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ error: e.message });
		}
	}

	/**
	 * POST /api/recommendations/therapists/:id/index
	 * Triggers re-indexing for a therapist (call after profile create/update).
	 */
	@Post("therapists/:id/index")
	@ApiOperation({
		summary:
			"Re-index a therapist profile for recommendations (internal/admin)",
	})
	async indexTherapist(@Param("id") therapistId: string, @Res() res: Response) {
		try {
			await this.recommendationService.indexTherapist(therapistId);
			return res
				.status(HttpStatus.OK)
				.json({ message: "Therapist indexed successfully" });
		} catch (e: any) {
			return res
				.status(e.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
				.json({ error: e.message });
		}
	}
}
