import { getIntegrations, maskKey } from '@/lib/settings';
import { IntegrationsForm } from './IntegrationsForm';

export default async function IntegracionesPage() {
  const integ = await getIntegrations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground">
          Conecta el cerebro del bot (Anthropic Claude) y el canal de WhatsApp (Evolution API).
          Las API keys se guardan cifradas en la base de datos.
        </p>
      </div>
      <IntegrationsForm
        initial={{
          anthropicApiKeyMasked: maskKey(integ.anthropicApiKey),
          anthropicConfigured: Boolean(integ.anthropicApiKey),
          sourceAnthropic: integ.sourceAnthropic,
          claudeModel: integ.claudeModel,
          evolutionApiUrl: integ.evolutionApiUrl,
          evolutionApiKeyMasked: maskKey(integ.evolutionApiKey),
          evolutionConfigured: Boolean(integ.evolutionApiUrl && integ.evolutionApiKey),
          sourceEvolution: integ.sourceEvolution,
          evolutionInstance: integ.evolutionInstance,
          publicBaseUrl: integ.publicBaseUrl,
          webhookUrl: `${integ.publicBaseUrl}/api/webhook/evolution`,
        }}
      />
    </div>
  );
}
