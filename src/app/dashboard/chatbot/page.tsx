import { prisma } from '@/lib/prisma';
import { ChatbotForm } from './ChatbotForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ChatbotPage() {
  const cfg = await prisma.chatbotConfig.findFirst();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chatbot</h1>
        <p className="text-muted-foreground">
          System prompt, plantilla de usuario, modelo, reglas y mensajes automáticos.
        </p>
      </div>
      <ChatbotForm initial={cfg ? {
        ...cfg,
        welcomeMessage: cfg.welcomeMessage ?? '',
        offHoursMessage: cfg.offHoursMessage ?? '',
      } : null} />
    </div>
  );
}
