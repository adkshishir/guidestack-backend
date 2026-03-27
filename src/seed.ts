import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TaxonomySeederService } from './taxonomy/taxonomy-seeder.service';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const seeder = app.get(TaxonomySeederService);

    console.log('\n--- Seeding users ---');
    await seeder.seedUsers();

    console.log('\n--- Seeding categories & tags ---');
    await seeder.seed();

    console.log('\nSeeding complete.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runSeed();
