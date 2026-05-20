import { PrismaClient } from '@prisma/client';
import { DEFAULT_HOURS } from '../src/lib/hours';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // 1. Empresa
  const company = await prisma.company.upsert({
    where: { slug: 'promestetic' },
    update: {},
    create: {
      name: 'Promestetic',
      slug: 'promestetic',
      phone: '+57 300 000 0000',
      email: 'contacto@promestetic.com',
      address: 'Calle 123 #45-67, Bogotá',
      website: 'https://promestetic.com',
      description:
        'Centro de estética especializado en tratamientos faciales, corporales y depilación láser. Más de 5 años cuidando tu belleza.',
      hours: JSON.stringify(DEFAULT_HOURS),
      timezone: 'America/Bogota',
    },
  });
  console.log('✓ Empresa creada');

  // 2. Chatbot config
  await prisma.chatbotConfig.upsert({
    where: { id: 'singleton-chatbot' },
    update: {},
    create: {
      id: 'singleton-chatbot',
      companyId: company.id,
      systemPrompt: `Eres "Estetia", la asistente virtual de Promestetic, un centro de estética en Bogotá.

Tu rol:
- Atender clientes por WhatsApp con tono cálido, cercano y profesional.
- Resolver dudas sobre tratamientos, precios, ubicación y horarios.
- Ayudar a agendar citas (toma datos: nombre, tratamiento, fecha y hora preferida).
- Informar sobre promociones vigentes cuando sea relevante.

Estilo:
- Usa emojis con moderación (💆‍♀️ ✨ 💖).
- Respuestas cortas, claras, en español colombiano.
- Si te preguntan algo fuera de tu rol (chistes, política, etc.) redirige amablemente al servicio.

Importante:
- NO inventes precios ni horarios que no estén en el contexto.
- Si el cliente pide algo que no puedes resolver, dile que un asesor humano lo contactará.`,
      userPromptTpl: '{message}',
      model: 'claude-sonnet-4-6',
      temperature: 0.6,
      maxTokens: 800,
      rules: JSON.stringify([
        'Nunca dar descuentos no autorizados.',
        'No prometer resultados médicos específicos.',
        'Si el cliente pide cancelar una cita, transferir a un humano.',
        'Confirmar siempre nombre y teléfono al agendar.',
      ]),
      welcomeMessage:
        '¡Hola! 👋 Bienvenido(a) a Promestetic ✨ Soy Estetia, tu asistente. ¿En qué puedo ayudarte hoy?',
      offHoursMessage:
        'Hola 💖 En este momento estamos fuera de horario de atención. Apenas abramos, te responderemos personalmente. ¡Gracias por escribirnos!',
      respectHours: true,
      enabled: true,
    },
  });
  console.log('✓ Chatbot configurado');

  // 3. Catálogo demo
  const catalog = [
    {
      type: 'servicio',
      name: 'Limpieza facial profunda',
      description:
        'Limpieza con extracción de impurezas, exfoliación y máscara hidratante. Duración 60 min.',
      price: 120000,
      tags: JSON.stringify(['facial', 'limpieza']),
    },
    {
      type: 'servicio',
      name: 'Depilación láser axilas',
      description: 'Sesión de depilación láser de diodo en zona axilas. Duración 15 min.',
      price: 80000,
      tags: JSON.stringify(['depilacion', 'laser']),
    },
    {
      type: 'servicio',
      name: 'Masaje reductivo',
      description:
        'Masaje moldeador con técnicas de drenaje linfático y manipulación profunda. Duración 60 min.',
      price: 95000,
      tags: JSON.stringify(['corporal', 'reductivo']),
    },
    {
      type: 'info',
      name: 'Formas de pago',
      description:
        'Aceptamos efectivo, tarjetas débito y crédito, Nequi y Daviplata. Posibilidad de paquetes con descuento.',
    },
    {
      type: 'info',
      name: 'Cómo llegar',
      description:
        'Estamos en la Calle 123 #45-67, Bogotá. Parqueadero gratuito. Cerca a la estación de TransMilenio.',
    },
  ];

  for (const item of catalog) {
    await prisma.catalogItem.create({ data: item });
  }
  console.log(`✓ ${catalog.length} items de catálogo creados`);

  // 4. Promoción demo
  await prisma.promotion.create({
    data: {
      title: 'Promo Día de la Madre 💖',
      message: `🌷 ¡Celebra a mamá con Promestetic! 🌷

Este mes tenemos *30% de descuento* en:
✨ Limpieza facial profunda
✨ Masajes relajantes
✨ Tratamiento anti-edad

📅 Válido hasta el 31 de mayo
📞 Reserva ya: +57 300 000 0000
📍 Calle 123 #45-67, Bogotá

¡Sorprende a quien más amas! 💝`,
      active: true,
      autoSendOnCreate: false,
      targetTags: '[]',
    },
  });
  console.log('✓ Promoción demo creada');

  // 5. Cliente demo
  await prisma.client.upsert({
    where: { phone: '573001234567' },
    update: {},
    create: {
      phone: '573001234567',
      name: 'María García',
      email: 'maria@example.com',
      tags: JSON.stringify(['vip', 'recurrente']),
      notes: 'Cliente fiel, prefiere citas en la mañana.',
    },
  });
  console.log('✓ Cliente demo creado');

  console.log('✅ Seed completado');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
