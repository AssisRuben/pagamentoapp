import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";
import { mpClient } from "@/lib/mercadopago";
import { mapMpStatusToOrderStatus, syncOrderStatus } from "@/lib/orders";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const cart = await getOrCreateCart(session.user.id);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
  }

  const totalCents = cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      totalCents,
      status: "PENDING",
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.product.priceCents,
        })),
      },
    },
  });

  const formData = await request.json();

  try {
    const payment = await new Payment(mpClient).create({
      body: {
        ...formData,
        transaction_amount: totalCents / 100,
        description: `Pedido ${order.id}`,
        external_reference: order.id,
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
      },
    });

    // O status retornado aqui é apenas o resultado imediato (ex: cartão
    // aprovado/recusado na hora). Para Pix/boleto ele normalmente volta
    // "pending" e a confirmação definitiva chega depois pelo webhook, que
    // é a única fonte confiável de status (sempre revalidado via API do MP).
    await syncOrderStatus(
      order.id,
      mapMpStatusToOrderStatus(payment.status),
      payment.id ? String(payment.id) : undefined
    );

    const transactionData = payment.point_of_interaction?.transaction_data;

    return NextResponse.json({
      orderId: order.id,
      status: payment.status,
      pix: transactionData?.qr_code
        ? {
            qrCode: transactionData.qr_code,
            qrCodeBase64: transactionData.qr_code_base64,
          }
        : undefined,
      ticketUrl: transactionData?.ticket_url,
    });
  } catch (error) {
    console.error("Erro ao criar pagamento no Mercado Pago:", error);
    // Pedido fica REJECTED e o carrinho permanece intacto: o cliente pode
    // tentar pagar de novo (ex: outro cartão) sem remontar o carrinho.
    await syncOrderStatus(order.id, "REJECTED");

    return NextResponse.json(
      { error: "Falha ao processar pagamento" },
      { status: 502 }
    );
  }
}
