const express = require("express");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const app = express();
const prisma = new PrismaClient();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const STAGES = ["CREATE", "READ", "UPDATE", "DELETE"];
const stageNames = { CREATE: "Kitap Ekleme", READ: "Kitapları Listeleme", UPDATE: "Kitap Güncelleme", DELETE: "Kitap Silme" };

const OPTIONS = {
  CREATE: [
    { key: "c1", label: "KOD 1", description: "Kürk Mantolu Madonna kitabını ekle", code: 'await prisma.book.create({ data: { title: "Kürk Mantolu Madonna", author: "Sabahattin Ali" } });', data: { title: "Kürk Mantolu Madonna", author: "Sabahattin Ali" } },
    { key: "c2", label: "KOD 2", description: "Küçük Prens kitabını ekle", code: 'await prisma.book.create({ data: { title: "Küçük Prens", author: "Antoine de Saint-Exupéry" } });', data: { title: "Küçük Prens", author: "Antoine de Saint-Exupéry" } },
    { key: "c3", label: "KOD 3", description: "Simyacı kitabını ekle", code: 'await prisma.book.create({ data: { title: "Simyacı", author: "Paulo Coelho" } });', data: { title: "Simyacı", author: "Paulo Coelho" } },
    { key: "c4", label: "KOD 4", description: "Saatleri Ayarlama Enstitüsü kitabını ekle", code: 'await prisma.book.create({ data: { title: "Saatleri Ayarlama Enstitüsü", author: "Ahmet Hamdi Tanpınar" } });', data: { title: "Saatleri Ayarlama Enstitüsü", author: "Ahmet Hamdi Tanpınar" } }
  ],
  READ: [
    { key: "r1", label: "KOD 1", description: "Kitapları ada göre A-Z listele", code: 'const kitaplar = await prisma.book.findMany({ orderBy: { title: "asc" } });', action: "asc" },
    { key: "r2", label: "KOD 2", description: "Kitapları ada göre Z-A listele", code: 'const kitaplar = await prisma.book.findMany({ orderBy: { title: "desc" } });', action: "desc" },
    { key: "r3", label: "KOD 3", description: "İlk 3 kitabı listele", code: 'const kitaplar = await prisma.book.findMany({ take: 3, orderBy: { id: "asc" } });', action: "first3" },
    { key: "r4", label: "KOD 4", description: "Son eklenen kitapları önce listele", code: 'const kitaplar = await prisma.book.findMany({ orderBy: { createdAt: "desc" } });', action: "newest" }
  ],
  UPDATE: [
    { key: "u1", label: "KOD 1", description: "1984 kitabının yazar bilgisini güncelle", code: 'await prisma.book.update({ where: { title: "1984" }, data: { author: "George Orwell (güncellendi)" } });', where: "1984", data: { author: "George Orwell (güncellendi)" } },
    { key: "u2", label: "KOD 2", description: "Dönüşüm kitabının yazar bilgisini güncelle", code: 'await prisma.book.update({ where: { title: "Dönüşüm" }, data: { author: "Franz Kafka (güncellendi)" } });', where: "Dönüşüm", data: { author: "Franz Kafka (güncellendi)" } },
    { key: "u3", label: "KOD 3", description: "İnce Memed kitabının yazar bilgisini güncelle", code: 'await prisma.book.update({ where: { title: "İnce Memed" }, data: { author: "Yaşar Kemal (güncellendi)" } });', where: "İnce Memed", data: { author: "Yaşar Kemal (güncellendi)" } },
    { key: "u4", label: "KOD 4", description: "Beyaz Diş kitabının yazar bilgisini güncelle", code: 'await prisma.book.update({ where: { title: "Beyaz Diş" }, data: { author: "Jack London (güncellendi)" } });', where: "Beyaz Diş", data: { author: "Jack London (güncellendi)" } }
  ],
  DELETE: [
    { key: "d1", label: "KOD 1", description: "1984 kitabını sil", code: 'await prisma.book.delete({ where: { title: "1984" } });', where: "1984" },
    { key: "d2", label: "KOD 2", description: "Dönüşüm kitabını sil", code: 'await prisma.book.delete({ where: { title: "Dönüşüm" } });', where: "Dönüşüm" },
    { key: "d3", label: "KOD 3", description: "İnce Memed kitabını sil", code: 'await prisma.book.delete({ where: { title: "İnce Memed" } });', where: "İnce Memed" },
    { key: "d4", label: "KOD 4", description: "Beyaz Diş kitabını sil", code: 'await prisma.book.delete({ where: { title: "Beyaz Diş" } });', where: "Beyaz Diş" }
  ]
};

async function state() {
  return prisma.gameState.upsert({ where: { id: 1 }, update: {}, create: { id: 1, currentStage: "CREATE" } });
}
function publicOptions(stage) {
  return (OPTIONS[stage] || []).map(({ key, label, description, code }) => ({ key, label, description, code }));
}
app.get("/", (_, res) => res.redirect("/vote.html"));
app.get("/api/game", async (_, res) => {
  const s = await state();
  const counts = await prisma.vote.groupBy({ by: ["optionKey"], where: { stage: s.currentStage }, _count: { _all: true } });
  const total = counts.reduce((n, x) => n + x._count._all, 0);
  res.json({ stage: s.currentStage, stageName: stageNames[s.currentStage], options: publicOptions(s.currentStage), counts: Object.fromEntries(counts.map(x => [x.optionKey, x._count._all])), total });
});
app.post("/api/vote", async (req, res) => {
  const { optionKey, voterKey } = req.body || {};
  const s = await state();
  if (!OPTIONS[s.currentStage]?.some(x => x.key === optionKey)) return res.status(400).json({ error: "Geçersiz seçenek." });
  if (typeof voterKey !== "string" || voterKey.length < 8) return res.status(400).json({ error: "Oy bilgisi geçersiz." });
  try {
    await prisma.vote.create({ data: { stage: s.currentStage, optionKey, voterKey } });
    res.json({ ok: true, message: "Oyun kaydedildi." });
  } catch {
    res.status(409).json({ error: "Bu aşamada zaten oy kullandın." });
  }
});
app.get("/api/books", async (_, res) => res.json(await prisma.book.findMany({ orderBy: { id: "asc" } })));
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (key !== (process.env.ADMIN_KEY || "sinif2026")) return res.status(401).json({ error: "Öğretmen anahtarı hatalı." });
  next();
}
app.get("/api/admin", requireAdmin, async (_, res) => {
  const s = await state();
  const counts = await prisma.vote.groupBy({ by: ["optionKey"], where: { stage: s.currentStage }, _count: { _all: true } });
  res.json({ stage: s.currentStage, stageName: stageNames[s.currentStage], options: publicOptions(s.currentStage), counts: Object.fromEntries(counts.map(x => [x.optionKey, x._count._all])), total: counts.reduce((n,x)=>n+x._count._all,0), books: await prisma.book.findMany({ orderBy: { id: "asc" } }) });
});
app.post("/api/admin/execute", requireAdmin, async (req, res) => {
  const s = await state();
  const opts = OPTIONS[s.currentStage];
  const counts = await prisma.vote.groupBy({ by: ["optionKey"], where: { stage: s.currentStage }, _count: { _all: true } });
  if (!counts.length) return res.status(400).json({ error: "Henüz oy kullanılmadı." });
  counts.sort((a,b) => b._count._all - a._count._all);
  const winner = opts.find(o => o.key === counts[0].optionKey);
  try {
    let result;
    if (s.currentStage === "CREATE") result = await prisma.book.create({ data: winner.data });
    if (s.currentStage === "READ") {
      const order = winner.action === "asc" ? { title: "asc" } : winner.action === "desc" ? { title: "desc" } : winner.action === "first3" ? { id: "asc" } : { createdAt: "desc" };
      result = await prisma.book.findMany({ ...(winner.action === "first3" ? { take: 3 } : {}), orderBy: order });
    }
    if (s.currentStage === "UPDATE") result = await prisma.book.update({ where: { title: winner.where }, data: winner.data });
    if (s.currentStage === "DELETE") result = await prisma.book.delete({ where: { title: winner.where } });
    const completedStage = s.currentStage;
    const next = STAGES[STAGES.indexOf(completedStage) + 1] || "DONE";
    await prisma.gameState.update({ where: { id: 1 }, data: { currentStage: next } });
    res.json({ ok: true, completedStage, nextStage: next, winner: { key: winner.key, description: winner.description, code: winner.code }, result, books: await prisma.book.findMany({ orderBy: { id: "asc" } }) });
  } catch (e) {
    res.status(400).json({ error: `İşlem gerçekleştirilemedi: ${e.message}. Seçilen kitabın mevcut olduğundan emin olun.` });
  }
});
app.post("/api/admin/reset", requireAdmin, async (_, res) => {
  await prisma.vote.deleteMany();
  await prisma.gameState.upsert({ where: { id: 1 }, update: { currentStage: "CREATE" }, create: { id: 1, currentStage: "CREATE" } });
  res.json({ ok: true, message: "Oyun başa alındı. Kitaplar korunmuştur." });
});
app.post("/api/admin/books", requireAdmin, async (req, res) => {
  const { title, author } = req.body || {};
  if (!title?.trim() || !author?.trim()) return res.status(400).json({ error: "Kitap adı ve yazar zorunludur." });
  try { res.json(await prisma.book.create({ data: { title: title.trim(), author: author.trim() } })); }
  catch { res.status(409).json({ error: "Bu kitap zaten kayıtlı olabilir." }); }
});
app.put("/api/admin/books/:id", requireAdmin, async (req, res) => {
  const { title, author } = req.body || {};
  try { res.json(await prisma.book.update({ where: { id: Number(req.params.id) }, data: { title, author } })); }
  catch { res.status(400).json({ error: "Kitap güncellenemedi." }); }
});
app.delete("/api/admin/books/:id", requireAdmin, async (req, res) => {
  try { res.json(await prisma.book.delete({ where: { id: Number(req.params.id) } })); }
  catch { res.status(400).json({ error: "Kitap silinemedi." }); }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`Sınıfın Seçimi çalışıyor: http://localhost:${port}`));
