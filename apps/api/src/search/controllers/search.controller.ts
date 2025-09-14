// Search Controller
// Handles all search-related API endpoints

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { JobSearchService } from '../services/job-search.service';
import { SavedSearchService } from '../services/saved-search.service';
import {
  SearchJobsDto,
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  GetSuggestionsDto,
} from '../dto/search-jobs.dto';

@Controller('search')
export class SearchController {
  constructor(
    private readonly jobSearchService: JobSearchService,
    private readonly savedSearchService: SavedSearchService
  ) {}

  /**
   * Search jobs with filters
   * GET /search/jobs
   * Public endpoint - auth optional for personalization
   */
  @Get('jobs')
  @UseGuards(OptionalAuthGuard)
  async searchJobs(
    @Query() searchDto: SearchJobsDto,
    @Request() req: any
  ) {
    const userId = req.user?.id;
    return this.jobSearchService.searchJobs(searchDto, userId);
  }

  /**
   * Get search suggestions/autocomplete
   * GET /search/suggestions
   */
  @Get('suggestions')
  async getSuggestions(@Query() dto: GetSuggestionsDto) {
    return this.jobSearchService.getSuggestions(dto.query, dto.type);
  }

  /**
   * Get user's saved searches
   * GET /search/saved
   * Requires authentication
   */
  @Get('saved')
  @UseGuards(JwtAuthGuard)
  async getSavedSearches(@Request() req: any) {
    return this.savedSearchService.getSavedSearches(req.user.id);
  }

  /**
   * Create a new saved search
   * POST /search/saved
   * Requires authentication
   */
  @Post('saved')
  @UseGuards(JwtAuthGuard)
  async createSavedSearch(
    @Body() dto: CreateSavedSearchDto,
    @Request() req: any
  ) {
    return this.savedSearchService.createSavedSearch(req.user.id, dto);
  }

  /**
   * Get a specific saved search
   * GET /search/saved/:id
   * Requires authentication
   */
  @Get('saved/:id')
  @UseGuards(JwtAuthGuard)
  async getSavedSearch(
    @Param('id') searchId: string,
    @Request() req: any
  ) {
    return this.savedSearchService.getSavedSearch(req.user.id, searchId);
  }

  /**
   * Run a saved search
   * GET /search/saved/:id/run
   * Requires authentication
   */
  @Get('saved/:id/run')
  @UseGuards(JwtAuthGuard)
  async runSavedSearch(
    @Param('id') searchId: string,
    @Request() req: any
  ) {
    return this.savedSearchService.runSavedSearch(req.user.id, searchId);
  }

  /**
   * Update a saved search
   * PUT /search/saved/:id
   * Requires authentication
   */
  @Put('saved/:id')
  @UseGuards(JwtAuthGuard)
  async updateSavedSearch(
    @Param('id') searchId: string,
    @Body() dto: UpdateSavedSearchDto,
    @Request() req: any
  ) {
    return this.savedSearchService.updateSavedSearch(
      req.user.id,
      searchId,
      dto
    );
  }

  /**
   * Delete a saved search
   * DELETE /search/saved/:id
   * Requires authentication
   */
  @Delete('saved/:id')
  @UseGuards(JwtAuthGuard)
  async deleteSavedSearch(
    @Param('id') searchId: string,
    @Request() req: any
  ) {
    await this.savedSearchService.deleteSavedSearch(req.user.id, searchId);
    return { message: 'Saved search deleted successfully' };
  }

  /**
   * Get search history
   * GET /search/history
   * Requires authentication
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getSearchHistory(
    @Query('limit') limit: number = 20,
    @Request() req: any
  ) {
    return this.savedSearchService.getSearchHistory(req.user.id, limit);
  }

  /**
   * Get search analytics (admin only)
   * GET /search/analytics
   * Requires admin authentication
   */
  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getSearchAnalytics(@Request() req: any) {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized - Admin access required');
    }
    return this.savedSearchService.getSearchAnalytics();
  }
}