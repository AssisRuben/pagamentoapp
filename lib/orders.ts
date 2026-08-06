import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/generated/prisma/client";

export function mapMpStatusToOrderStatus(
  mpStatus: string | undefined
): OrderStatus {
  if (mpStatus === "approved") return "APPROVED";
  if (mpStatus === "rejected" || mpStatus === "cancelled") return "REJECTED";
  return "PENDING";
}

/**
 * Aplica uma mudança de status ao pedido de forma idempotente: pedidos em
 * estado final (APPROVED/REJECTED) não são reprocessados, o que evita
 * decrementar estoque duas vezes quando o Mercado Pago reenvia o mesmo
 * webhook. O estoque só é debitado e o carrinho só é esvaziado quando o
 * pedido é de fato aprovado.
 */
export async function syncOrderStatus(
  orderId: string,
  status: OrderStatus,
  mpPaymentId?: string
) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;
    if (order.status === "APPROVED" || order.status === "REJECTED") return;

    await tx.order.update({
      where: { id: orderId },
      data: { status, mpPaymentId },
    });

    if (status === "APPROVED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      const cart = await tx.cart.findUnique({
        where: { userId: order.userId },
      });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    }
  });
}
