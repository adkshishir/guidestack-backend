import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MfaRequiredResponseDto } from './dto/mfa-required-response.dto';
import { User, UserRole } from '../users/entities/user.entity';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      role: UserRole.AUTHOR,
    });

    return this.generateAuthResponse(user);
  }

  async login(
    loginDto: LoginDto,
  ): Promise<AuthResponseDto | MfaRequiredResponseDto> {
    const user = await this.usersService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended');
    }

    // Check for 2FA
    if (user.isTwoFactorEnabled && user.role === UserRole.ADMIN) {
      return { mfaRequired: true, email: user.email };
    }

    return this.generateAuthResponse(user);
  }

  async generateTwoFactorSecret(user: User) {
    const secret = speakeasy.generateSecret({
      name: user.email,
      issuer: 'GuideStack',
    });

    if (!secret.otpauth_url) {
      throw new BadRequestException('Could not generate 2FA secret');
    }

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCodeDataUrl,
    };
  }

  async turnOnTwoFactorAuthentication(userId: number, secret: string) {
    return this.usersService.update(userId, {
      twoFactorSecret: secret,
      isTwoFactorEnabled: true,
    });
  }

  async verifyTwoFactorCode(
    user: User,
    code: string,
    secret?: string,
  ): Promise<boolean> {
    let secretToVerify = secret;

    if (!secretToVerify) {
      const userWithSecret = await this.usersService.findOneWithSecret(user.id);
      secretToVerify = userWithSecret.twoFactorSecret || undefined;
    }

    if (!secretToVerify) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: 'base32',
      token: code,
    });
  }

  async loginWithTwoFactor(
    email: string,
    code: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isTwoFactorEnabled) {
      throw new UnauthorizedException('2FA not enabled for this user');
    }

    const isValid = await this.verifyTwoFactorCode(user, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: User): AuthResponseDto {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
    };
  }
}
