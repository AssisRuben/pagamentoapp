import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";
import { mpClient } from "@/lib/mercadopago";
import { mapMpStatusToOrderStatus, syncOrderStatus } from "@/lib/orders";
import { clienteExisteNoTrier } from "@/lib/trier";
import type { FulfillmentType } from "@/lib/generated/prisma/client";

type CheckoutRequestBody = {
  cpf?: string;
  fulfillmentType: FulfillmentType;
  address?: {
    cep?: string;
    logradouro: string;
    numero?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  payment: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body: CheckoutRequestBody = await request.json();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  const cpf = user.cpf ?? body.cpf?.trim();
  if (!cpf) {
    return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
  }
  if (!user.cpf) {
    await prisma.user.update({ where: { id: user.id }, data: { cpf } });
  }

  if (body.fulfillmentType === "DELIVERY" && !body.address) {
    return NextResponse.json(
      { error: "Endereço é obrigatório para entrega" },
      { status: 400 }
    );
  }

  const cart = await getOrCreateCart(session.user.id);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
  }

  const totalCents = cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );

  // Primeiro pedido do usuário: decide se a venda deve ser atribuída ao
  // vendedor (comissão), checando se o CPF já existe como cliente no Trier.
  // Fica salvo pra sempre em `vendedorAttributed` — pedidos seguintes não
  // checam de novo, mesmo que o cliente passe a existir no Trier depois
  // desta primeira compra.
  const isFirstOrder = (await prisma.order.count({
    where: { userId: user.id },
  })) === 0;
  let vendedorAttributed = user.vendedorAttributed;
  if (isFirstOrder && !user.vendedorAttributed) {
    try {
      const jaExiste = await clienteExisteNoTrier(cpf);
      vendedorAttributed = !jaExiste;
      await prisma.user.update({
        where: { id: user.id },
        data: { vendedorAttributed },
      });
    } catch (error) {
      // Não bloqueia a compra por causa disso — só não atribui comissão
      // dessa vez se a consulta ao Trier falhar.
      console.error("Erro ao consultar cliente no Trier:", error);
    }
  }

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      totalCents,
      status: "PENDING",
      fulfillmentType: body.fulfillmentType,
      addressCep: body.address?.cep,
      addressLogradouro: body.address?.logradouro,
      addressNumero: body.address?.numero,
      addressBairro: body.address?.bairro,
      addressCidade: body.address?.cidade,
      addressEstado: body.address?.estado,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.product.priceCents,
        })),
      },
    },
  });

  try {
    const payment = await new Payment(mpClient).create({
      body: {
        ...body.payment,
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
