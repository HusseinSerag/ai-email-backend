import { prisma } from "../lib/prismaClient";

export async function clerkWebhookService(data: any) {
  try {
    const { first_name, last_name, image_url, email_addresses, id } = data;
    await prisma.user.create({
      data: {
        firstName: first_name ?? email_addresses[0].email_address,
        email: email_addresses[0].email_address,
        lastName: last_name ?? email_addresses[0].email_address,
        imageUrl: image_url,
        id: id,
      },
    });
  } catch (e) {
    throw e;
  }
}
