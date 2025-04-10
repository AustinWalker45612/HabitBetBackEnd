import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Delete existing data (optional but useful for dev reset)
  await prisma.habitProgress.deleteMany();
  await prisma.habitNode.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Habits
  const habits = [
    { category: 'Fitness', title: 'Walk 10 min', tier: 1, order: 1, xpValue: 5 },
    { category: 'Fitness', title: '15 Pushups', tier: 1, order: 2, xpValue: 10 },
    { category: 'Fitness', title: 'Walk + Pushups Combo', tier: 2, order: 1, xpValue: 15 },
    { category: 'Fitness', title: '3-Day Streak', tier: 2, order: 2, xpValue: 20 },
    { category: 'Fitness', title: '5 Workouts in 7 Days', tier: 3, order: 1, xpValue: 30 },
  ];

  const createdHabits = [];

  for (const habit of habits) {
    const created = await prisma.habitNode.create({ data: habit });
    createdHabits.push(created);
  }

  // 3. Create Test User
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testUser = await prisma.user.create({
    data: {
      username: 'TestUser',
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  // 4. Seed HabitProgress for the user
  for (const habit of createdHabits) {
    await prisma.habitProgress.create({
      data: {
        userId: testUser.id,
        habitId: habit.id,
        status: 'unlocked',
        completions: 0,
      },
    });
  }

  console.log('✅ Seeded habits, test user, and habit progress.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
