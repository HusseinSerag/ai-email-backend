"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountAssociatedWithUser = void 0;
const customError_1 = require("../lib/customError");
const prismaClient_1 = require("../lib/prismaClient");
async function getAccountAssociatedWithUser({ accountId, userId, }) {
    try {
        const account = await prismaClient_1.prisma.account.findFirst({
            where: {
                id: accountId,
                AND: {
                    users: {
                        some: {
                            id: userId,
                        },
                    },
                },
            },
        });
        if (!account)
            throw new customError_1.CustomError("User does not exist", customError_1.HttpStatusCode.NOT_FOUND);
        return account;
    }
    catch (e) {
        throw e;
    }
}
exports.getAccountAssociatedWithUser = getAccountAssociatedWithUser;
