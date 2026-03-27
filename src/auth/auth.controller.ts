import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MfaRequiredResponseDto } from './dto/mfa-required-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TwoFactorDto } from './dto/two-factor.dto';
import { TwoFactorLoginDto } from './dto/two-factor-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account and returns an authentication token',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed',
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticates a user and returns an access token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful or MFA required',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/AuthResponseDto' },
        { $ref: '#/components/schemas/MfaRequiredResponseDto' },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or account is suspended',
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed',
  })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponseDto | MfaRequiredResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('2fa/generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  async generateTwoFactor(@CurrentUser() user: User) {
    return this.authService.generateTwoFactorSecret(user);
  }

  @Post('2fa/enable')
  @ApiOperation({ summary: 'Enable 2FA for the current user' })
  async enableTwoFactor(
    @CurrentUser() user: User,
    @Body() twoFactorDto: TwoFactorDto,
  ) {
    const isValid = await this.authService.verifyTwoFactorCode(
      user,
      twoFactorDto.code,
      twoFactorDto.secret,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }
    await this.authService.turnOnTwoFactorAuthentication(
      user.id,
      twoFactorDto.secret,
    );
    return { message: '2FA enabled successfully' };
  }

  @Public()
  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with 2FA code' })
  async loginWithTwoFactor(@Body() loginDto: TwoFactorLoginDto) {
    return this.authService.loginWithTwoFactor(loginDto.email, loginDto.code);
  }
}
