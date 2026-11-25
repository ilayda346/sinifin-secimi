const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const books = [
    { title: "1984", author: "George Orwell" },
    { title: "Dönüşüm", author: "Franz Kafka" },
    { title: "İnce Memed", author: "Yaşar Kemal" },
    { title: "Beyaz Diş", author: "Jack London" }
  ];
  for (const book of books) {
    await prisma.book.upsert({
      where: { title: book.title },
      update: { author: book.author },
      create: book
    });
  }
  await prisma.gameState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, currentStage: "CREATE" }
  });
  console.log("Örnek kitaplar ve oyun durumu hazır.");
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
