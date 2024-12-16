"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountDetail = exports.exchangeCodeForAccessToken = exports.getAurinkoAuthURL = void 0;
const axios_1 = __importDefault(require("axios"));
const url_1 = require("url");
function getAurinkoAuthURL(service, state) {
    const params = new url_1.URLSearchParams({
        clientId: process.env.AURINKO_CLIENT_ID,
        serviceType: service,
        scopes: "Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All",
        responseType: "code",
        returnUrl: `${process.env.SERVER_URL}/api/email/callback`,
        state: JSON.stringify(state),
    });
    return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
}
exports.getAurinkoAuthURL = getAurinkoAuthURL;
async function exchangeCodeForAccessToken(code) {
    try {
        const res = await axios_1.default.post(`https://api.aurinko.io/v1/auth/token/${code}`, {}, {
            auth: {
                username: process.env.AURINKO_CLIENT_ID,
                password: process.env.AURINKO_CLIENT_SECRET,
            },
            headers: {
                "Content-Type": "application/json",
            },
        });
        return res.data;
    }
    catch (e) {
        throw e;
    }
}
exports.exchangeCodeForAccessToken = exchangeCodeForAccessToken;
async function getAccountDetail(accessToken) {
    try {
        const res = await axios_1.default.get("https://api.aurinko.io/v1/account", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return res.data;
    }
    catch (e) {
        throw e;
    }
}
exports.getAccountDetail = getAccountDetail;
