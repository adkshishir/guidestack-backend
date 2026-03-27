import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  // Enable CORS
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'https://wealthalgor.com',
        'http://wealthalgor.com',
        'https://www.wealthalgor.com',
        'wealthalgor.com',
        'https://api.wealthalgor.com',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development or if it's a localhost origin, allow it
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Authorization'],
  });

  // Enable global JWT authentication guard
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription(
      'API documentation for Blog management and AI chat endpoints',
    )
    .setVersion('1.0')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('AI', 'AI chat endpoints')
    .addTag('Blog', 'Blog endpoints')
    .addTag('Taxonomy', 'Categories and tags management endpoints')
    .addTag('Users', 'User and author profile management endpoints')
    .addTag('Comments', 'Comment management endpoints')
    .addTag('Image Generation', 'AI-powered image generation endpoints')
    .addTag('Chatbot', 'Website chatbot endpoints (public)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Apply basic auth for Swagger
  app.use(
    ['/api', '/api-json'],
    basicAuth({
      challenge: true,
      users: {
        [process.env.SWAGGER_USER || 'admin']:
          process.env.SWAGGER_PASSWORD || 'admin',
      },
    }),
  );

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 4007);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
    `Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}
bootstrap();
