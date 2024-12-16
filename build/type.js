"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailAddressSchema = void 0;
const zod_1 = require("zod");
exports.emailAddressSchema = zod_1.z.object({
    name: zod_1.z.string(),
    address: zod_1.z.string(),
});
