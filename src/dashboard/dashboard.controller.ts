import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService, DashboardAnalytics } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('analytics')
  @ApiOperation({
    summary: 'Get dashboard analytics',
    description: 'Returns counts, posts over time, engagement stats, and posts by status for the admin dashboard.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days for posts-over-time chart (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard analytics' })
  async getAnalytics(
    @Query('days') days?: string,
  ): Promise<DashboardAnalytics> {
    const daysNum = days ? Math.min(90, Math.max(7, parseInt(days, 10) || 30)) : 30;
    return this.dashboardService.getAnalytics(daysNum);
  }
}
