import { Controller, Post, Get, Patch, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AllowAnonymous, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ProfileService } from '../application/profile.service';
import { CreateTherapistProfileDto, CreatePatientProfileDto } from '@repo/types';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // POST /api/profile/therapist
  @Post('therapist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a therapist profile' })
  @ApiResponse({ status: 201, description: 'Therapist profile created successfully.' })
  createTherapistProfile(
    @Session() session: UserSession,
    @Body() dto: CreateTherapistProfileDto,
  ) {
    return this.profileService.createTherapistProfile(session.user.id, dto);
  }

  // POST /api/profile/patient
  @Post('patient')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a patient profile' })
  @ApiResponse({ status: 201, description: 'Patient profile created successfully.' })
  createPatientProfile(
    @Session() session: UserSession,
    @Body() dto: CreatePatientProfileDto,
  ) {
    return this.profileService.createPatientProfile(session.user.id, dto);
  }

  // GET /api/profile/me?role=therapist|patient
  @Get('me')
  @ApiOperation({ summary: 'Get the current user\'s profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  getMyProfile(
    @Session() session: UserSession,
    @Query('role') role: 'therapist' | 'patient',
  ) {
    return this.profileService.getMyProfile(session.user.id, role);
  }

  // PATCH /api/profile/therapist
  @Patch('therapist')
  @ApiOperation({ summary: 'Update a therapist profile' })
  @ApiResponse({ status: 200, description: 'Therapist profile updated successfully.' })
  updateTherapistProfile(
    @Session() session: UserSession,
    @Body() dto: Partial<CreateTherapistProfileDto>,
  ) {
    return this.profileService.updateTherapistProfile(session.user.id, dto);
  }

  // PATCH /api/profile/patient
  @Patch('patient')
  @ApiOperation({ summary: 'Update a patient profile' })
  @ApiResponse({ status: 200, description: 'Patient profile updated successfully.' })
  updatePatientProfile(
    @Session() session: UserSession,
    @Body() dto: Partial<CreatePatientProfileDto>,
  ) {
    return this.profileService.updatePatientProfile(session.user.id, dto);
  }
}
