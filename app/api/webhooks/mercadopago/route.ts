import { NextRequest, NextResponse } from "next/server";
import {
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { mpClient } from "@/lib/mercadopago";
import { mapMpStatusToOrderStatus, syncOrderStatus } from "@/lib/orders";

export async function POST(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const dataId = request.nextUrl.searchParams.get("data.id");

  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  // O corpo da notificação não é confiável por si só: qualquer um pode
  // enviar um POST com um payment id arbitrário. Validamos a assinatura
  // (HMAC assinado pelo Mercado Pago com o webhook secret) antes de
  // processar, e o status do pagamento é sempre revalidado consultando a
  // API do MP com nosso access token — nunca confiamos em um "status" que
  // viesse no corpo da requisição.
  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: process.env.MP_WEBHOOK_SECRET!,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.error("Webhook do Mercado Pago com assinatura inválida:", error.reason);
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
    throw error;
  }

  try {
    const payment = await new Payment(mpClient).get({ id: dataId });
    const orderId = payment.external_reference;

    if (orderId) {
      await syncOrderStatus(
        orderId,
        mapMpStatusToOrderStatus(payment.status),
        payment.id ? String(payment.id) : undefined
      );
    }
  } catch (error) {
    console.error("Erro ao processar webhook do Mercado Pago:", error);
  }

  return NextResponse.json({ received: true });
}
