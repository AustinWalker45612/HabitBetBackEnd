import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const habits = [
    { category: 'Fitness', title: 'Walk 10 min', tier: 1, order: 1, xpValue: 5 },
    { category: 'Fitness', title: '15 Pushups', tier: 1, order: 2, xpValue: 10 },
    { category: 'Fitness', title: 'Walk + Pushups Combo', tier: 2, order: 1, xpValue: 15 },
    { category: 'Fitness', title: '3-Day Streak', tier: 2, order: 2, xpValue: 20 },
    { category: 'Fitness', title: '5 Workouts in 7 Days', tier: 3, order: 1, xpValue: 30 },
  ];

  for (const habit of habits) {
    await prisma.habitNode.upsert({
      where: { title: habit.title },
      update: {},
      create: habit,
    });
  }

  console.log('✅ Seeded habit tree.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
